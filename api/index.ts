import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import * as cheerio from 'cheerio';

const envFile = resolve(process.cwd(), '.env');
if (existsSync(envFile)) {
  const content = readFileSync(envFile, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

const RATE_LIMIT_WINDOW_MS = 60_000;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 30_000);

function checkRateLimit(key: string, maxRequests: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  return createClient(url, key);
}

async function getUserId(req: VercelRequest): Promise<string | null> {
  const auth = req.headers['authorization'] as string || '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser(token);
  return user?.id || null;
}

function toSnake(val: string): string {
  return val.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
}

function toCamel(val: string): string {
  return val.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function mapKeys(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj || {})) {
    result[toSnake(key)] = obj[key];
  }
  return result;
}

function mapKeysCamel(obj: any): any {
  if (Array.isArray(obj)) return obj.map(mapKeysCamel);
  if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
    const result: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      result[toCamel(key)] = mapKeysCamel(obj[key]);
    }
    return result;
  }
  return obj;
}

function getAllowedOrigins(): string[] {
  const raw = process.env.CORS_ORIGIN || process.env.SUPABASE_URL || '';
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

function setCors(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers['origin'] as string || '';
  const allowed = getAllowedOrigins();
  if (allowed.length > 0 && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else if (allowed.length === 1 && allowed[0] === '*') {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    res.setHeader('Access-Control-Allow-Origin', allowed[0] || '');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
}

function getClientIp(req: VercelRequest): string {
  return (req.headers['x-forwarded-for'] as string || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
}

async function requireUserId(req: VercelRequest, res: VercelResponse): Promise<string | null> {
  const userId = await getUserId(req);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return userId;
}

function getQueryParam(req: VercelRequest, name: string): string | undefined {
  const val = req.query?.[name];
  if (Array.isArray(val)) return val[0];
  return val;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const origJson = res.json.bind(res);
  res.json = (data: any) => origJson(mapKeysCamel(data));

  const url = req.url || '';
  const path = url.split('?')[0];
  const supabase = getSupabase();

  try {
    if (path === '/api/healthz' && req.method === 'GET') {
      return res.json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // ---- RATE LIMITING ----
    const ip = getClientIp(req);
    const ipKey = `${ip}:${path}`;

    if (path === '/api/chat') {
      if (!checkRateLimit(ipKey, 30)) return res.status(429).json({ error: 'Too many requests. Try again later.' });
    } else if (path === '/api/widget') {
      if (!checkRateLimit(ipKey, 60)) return res.status(429).json({ error: 'Too many requests. Try again later.' });
    } else if (path === '/api/referral_clicks' && req.method === 'POST') {
      if (!checkRateLimit(ipKey, 20)) return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }

    // ---- DASHBOARD STATS ----
    if (path === '/api/dashboard/stats' && req.method === 'GET') {
      const userId = await requireUserId(req, res);
      if (!userId) return;

      const [assistantsRes, conversationsRes, leadsRes, appointmentsRes, profileRes] = await Promise.all([
        supabase.from('assistants').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('profiles').select('avg_sale_value').eq('user_id', userId).maybeSingle(),
      ]);

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekStr = weekAgo.toISOString();
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const twoWeekStr = twoWeeksAgo.toISOString();

      const [convWeekRes, convPrevRes, leadsWeekRes, appointmentsWeekRes] = await Promise.all([
        supabase.from('conversations').select('id').eq('user_id', userId).gte('created_at', weekStr),
        supabase.from('conversations').select('id').eq('user_id', userId).gte('created_at', twoWeekStr).lt('created_at', weekStr),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', weekStr),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', weekStr),
      ]);

      const weekConvIds = (convWeekRes.data || []).map((c: any) => c.id);
      const prevConvIds = (convPrevRes.data || []).map((c: any) => c.id);
      let messagesThisWeek = 0;
      if (weekConvIds.length > 0) {
        const { count } = await supabase.from('messages').select('id', { count: 'exact', head: true }).in('conversation_id', weekConvIds);
        messagesThisWeek = count || 0;
      }

      const prevWeekConversations = convPrevRes.count || 0;
      const totalConversations = conversationsRes.count || 0;
      const totalLeads = leadsRes.count || 0;
      const leadsThisWeek = leadsWeekRes.count || 0;
      const appointmentsThisWeek = appointmentsWeekRes.count || 0;
      const conversionRate = totalConversations > 0 ? (totalLeads / totalConversations) * 100 : 0;

      const unconverted = totalConversations - totalLeads;
      const avgSaleValue = (profileRes.data as any)?.avg_sale_value || 100;
      const missedRevenue = unconverted * avgSaleValue;

      return res.json({
        totalAssistants: assistantsRes.count || 0,
        totalConversations,
        totalLeads,
        totalAppointments: appointmentsRes.count || 0,
        messagesThisWeek,
        leadsThisWeek,
        appointmentsThisWeek,
        conversionRate: Math.round(conversionRate * 10) / 10,
        prevWeekConversations,
        unconvertedConversations: unconverted,
        missedRevenue,
        avgSaleValue,
      });
    }

    // ---- PROFILE ----
    if (path === '/api/profile' && req.method === 'GET') {
      const userId = await requireUserId(req, res);
      if (!userId) return;
      let { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      if (!data) {
        const { data: inserted, error: insertError } = await supabase.from('profiles').insert({ user_id: userId }).select().single();
        if (insertError) return res.status(500).json({ error: insertError.message });
        data = inserted;
      }
      return res.json(data);
    }

    if (path === '/api/profile' && req.method === 'PATCH') {
      const userId = await requireUserId(req, res);
      if (!userId) return;
      const { data, error } = await supabase.from('profiles').update({ ...req.body, updated_at: new Date().toISOString() }).eq('user_id', userId).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    // ---- ASSISTANTS ----
    if (path === '/api/assistants' && req.method === 'GET') {
      const userId = await requireUserId(req, res);
      if (!userId) return;
      const { data, error } = await supabase.from('assistants').select('*').eq('user_id', userId);
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    if (path === '/api/assistants' && req.method === 'POST') {
      const userId = await requireUserId(req, res);
      if (!userId) return;
      const { data, error } = await supabase.from('assistants').insert({ ...mapKeys(req.body || {}), user_id: userId }).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    const assistantMatch = path.match(/^\/api\/assistants\/(\d+)$/);
    if (assistantMatch) {
      const id = assistantMatch[1];
      if (req.method === 'GET') {
        const userId = await requireUserId(req, res);
        if (!userId) return;
        const { data, error } = await supabase.from('assistants').select('*').eq('id', id).eq('user_id', userId).single();
        if (error) return res.status(404).json({ error: 'Assistant not found' });
        return res.json(data);
      }
      if (req.method === 'PATCH' || req.method === 'PUT') {
        const userId = await requireUserId(req, res);
        if (!userId) return;
        const { data: existing } = await supabase.from('assistants').select('id').eq('id', id).eq('user_id', userId).single();
        if (!existing) return res.status(404).json({ error: 'Assistant not found' });
        const { data, error } = await supabase.from('assistants').update(mapKeys(req.body || {})).eq('id', id).eq('user_id', userId).select().single();
        if (error) return res.status(500).json({ error: error.message });
        return res.json(data);
      }
      if (req.method === 'DELETE') {
        const userId = await requireUserId(req, res);
        if (!userId) return;
        const { data: existing } = await supabase.from('assistants').select('id').eq('id', id).eq('user_id', userId).single();
        if (!existing) return res.status(404).json({ error: 'Assistant not found' });
        const { error } = await supabase.from('assistants').delete().eq('id', id).eq('user_id', userId);
        if (error) return res.status(500).json({ error: error.message });
        return res.status(204).end();
      }
    }

    // ---- ASSISTANT KNOWLEDGE ----
    const assistantKnowledgeMatch = path.match(/^\/api\/assistants\/(\d+)\/knowledge$/);
    if (assistantKnowledgeMatch) {
      const assistantId = assistantKnowledgeMatch[1];
      if (req.method === 'GET') {
        const userId = await requireUserId(req, res);
        if (!userId) return;
        const { data: assistant } = await supabase.from('assistants').select('id').eq('id', assistantId).eq('user_id', userId).single();
        if (!assistant) return res.status(404).json({ error: 'Assistant not found' });
        const { data, error } = await supabase.from('knowledge').select('*').eq('assistant_id', assistantId);
        if (error) return res.status(500).json({ error: error.message });
        return res.json(data);
      }
      if (req.method === 'POST') {
        const userId = await requireUserId(req, res);
        if (!userId) return;
        const { data: assistant } = await supabase.from('assistants').select('id').eq('id', assistantId).eq('user_id', userId).single();
        if (!assistant) return res.status(404).json({ error: 'Assistant not found' });
        const { data, error } = await supabase.from('knowledge').insert({ ...req.body, user_id: userId, assistant_id: parseInt(assistantId) }).select().single();
        if (error) return res.status(500).json({ error: error.message });
        return res.json(data);
      }
    }

    const knowledgeItemMatch = path.match(/^\/api\/knowledge\/(\d+)$/);
    if (knowledgeItemMatch && req.method === 'DELETE') {
      const userId = await requireUserId(req, res);
      if (!userId) return;
      const { data: existing } = await supabase.from('knowledge').select('id').eq('id', knowledgeItemMatch[1]).eq('user_id', userId).single();
      if (!existing) return res.status(404).json({ error: 'Knowledge item not found' });
      const { error } = await supabase.from('knowledge').delete().eq('id', knowledgeItemMatch[1]).eq('user_id', userId);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(204).end();
    }

    // ---- KNOWLEDGE UPLOAD ----
    if (path === '/api/knowledge/upload' && req.method === 'POST') {
      const userId = await requireUserId(req, res);
      if (!userId) return;
      const { assistantId, fileName, fileData, fileType } = req.body || {};
      if (!fileData || !fileName) return res.status(400).json({ error: 'fileData and fileName required' });

      const buffer = Buffer.from(fileData, 'base64');
      let text = '';

      try {
        if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
          const data = await pdfParse(buffer);
          text = data.text;
        } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
          const result = await mammoth.extractRawText({ buffer });
          text = result.value;
        } else {
          text = buffer.toString('utf-8');
        }
      } catch {
        return res.status(422).json({ error: 'Failed to parse file' });
      }

      const title = fileName.replace(/\.(txt|pdf|docx)$/i, '');
      const { data, error } = await supabase.from('knowledge').insert({
        user_id: userId,
        assistant_id: assistantId ? parseInt(assistantId) : null,
        title,
        content: text || '(empty file)',
        type: 'file',
      }).select().single();

      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    // ---- KNOWLEDGE CRAWL ----
    if (path === '/api/knowledge/crawl' && req.method === 'POST') {
      const userId = await requireUserId(req, res);
      if (!userId) return;
      const { assistantId, url } = req.body || {};
      if (!url) return res.status(400).json({ error: 'url required' });

      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AI-Employee/1.0)' },
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const html = await response.text();
        const $ = cheerio.load(html);
        const pageTitle = $('title').text().trim() || url;

        const paragraphs: string[] = [];
        $('p, h1, h2, h3, h4, h5, h6').each((_, el) => {
          const text = $(el).text().trim();
          if (text) paragraphs.push(text);
        });

        const content = paragraphs.join('\n');

        const { data, error } = await supabase.from('knowledge').insert({
          user_id: userId,
          assistant_id: assistantId ? parseInt(assistantId) : null,
          title: pageTitle,
          content: content || '(empty page)',
          type: 'crawl',
          source_url: url,
        }).select().single();

        if (error) return res.status(500).json({ error: error.message });
        return res.json({ ...data, charCount: content.length });
      } catch (e: any) {
        if (e.message?.includes('fetch') || e.name === 'AbortError' || e.message?.includes('HTTP')) {
          return res.status(422).json({ error: 'This site blocked crawling. Try copying the text manually.' });
        }
        return res.status(500).json({ error: e.message || 'Crawl failed' });
      }
    }

    // ---- CONVERSATIONS ----
    if (path === '/api/conversations' && req.method === 'GET') {
      const userId = await requireUserId(req, res);
      if (!userId) return;
      let query = supabase.from('conversations').select('*').eq('user_id', userId);
      const assistantId = getQueryParam(req, 'assistantId');
      if (assistantId) query = query.eq('assistant_id', assistantId);
      const { data, error } = await query;
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    if (path === '/api/conversations' && req.method === 'POST') {
      const userId = await requireUserId(req, res);
      if (!userId) return;
      const { data, error } = await supabase.from('conversations').insert({ ...req.body, user_id: userId }).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    const conversationMatch = path.match(/^\/api\/conversations\/(\d+)$/);
    if (conversationMatch) {
      if (req.method === 'GET') {
        const userId = await requireUserId(req, res);
        if (!userId) return;
        const { data, error } = await supabase.from('conversations').select('*').eq('id', conversationMatch[1]).eq('user_id', userId).single();
        if (error) return res.status(404).json({ error: 'Conversation not found' });
        return res.json(data);
      }
    }

    const messagesMatch = path.match(/^\/api\/conversations\/(\d+)\/messages$/);
    if (messagesMatch && req.method === 'GET') {
      const userId = await requireUserId(req, res);
      if (!userId) return;
      const { data: conversation } = await supabase.from('conversations').select('id').eq('id', messagesMatch[1]).eq('user_id', userId).single();
      if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
      const { data, error } = await supabase.from('messages').select('*').eq('conversation_id', messagesMatch[1]).order('created_at', { ascending: true });
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    // ---- LEADS ----
    if (path === '/api/leads' && req.method === 'GET') {
      const userId = await requireUserId(req, res);
      if (!userId) return;
      const { data, error } = await supabase.from('leads').select('*').eq('user_id', userId);
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    if (path === '/api/leads' && req.method === 'POST') {
      const userId = await requireUserId(req, res);
      if (!userId) return;
      const { data, error } = await supabase.from('leads').insert({ ...req.body, user_id: userId }).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    // ---- APPOINTMENTS ----
    if (path === '/api/appointments' && req.method === 'GET') {
      const userId = await requireUserId(req, res);
      if (!userId) return;
      const { data, error } = await supabase.from('appointments').select('*').eq('user_id', userId);
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    // ---- SUBSCRIPTIONS ----
    if (path === '/api/subscriptions' && req.method === 'GET') {
      const userId = await requireUserId(req, res);
      if (!userId) return;
      let { data, error } = await supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      if (!data) {
        const { data: inserted, error: insertError } = await supabase.from('subscriptions').insert({ user_id: userId, plan: 'free', status: 'active' }).select().single();
        if (insertError) return res.status(500).json({ error: insertError.message });
        data = inserted;
      }
      return res.json(data);
    }

    // ---- KNOWLEDGE ----
    if (path === '/api/knowledge' && req.method === 'GET') {
      const userId = await requireUserId(req, res);
      if (!userId) return;
      const { data, error } = await supabase.from('knowledge').select('*').eq('user_id', userId);
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    if (path === '/api/knowledge' && req.method === 'POST') {
      const userId = await requireUserId(req, res);
      if (!userId) return;
      const { data, error } = await supabase.from('knowledge').insert({ ...req.body, user_id: userId }).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    // ---- MARKETPLACE ----
    if (path === '/api/marketplace' && req.method === 'GET') {
      const userId = await requireUserId(req, res);
      if (!userId) return;
      const { data: allTemplates } = await supabase.from('marketplace_templates').select('*').order('name');
      const { data: installed } = await supabase.from('assistants').select('template_id').eq('user_id', userId).not('template_id', 'is', null);
      const installedIds = new Set((installed || []).map((a: any) => a.template_id));
      const result = (allTemplates || []).map((t: any) => ({ ...t, installed: installedIds.has(t.id), isOwner: t.user_id === userId }));
      return res.json(result);
    }

    if (path === '/api/marketplace/install' && req.method === 'POST') {
      const userId = await requireUserId(req, res);
      if (!userId) return;
      const { templateId } = req.body || {};
      if (!templateId) return res.status(400).json({ error: 'templateId required' });
      const { data: template } = await supabase.from('marketplace_templates').select('*').eq('id', templateId).single();
      if (!template) return res.status(404).json({ error: 'Template not found' });

      const { data: profile } = await supabase.from('profiles').select('business_name').eq('user_id', userId).maybeSingle();

      const { data: newAssistant, error: insertError } = await supabase.from('assistants').insert({
        user_id: userId,
        name: template.name,
        description: template.description,
        template_id: template.id,
        config: template.default_config || {},
        is_active: true,
        business_name: profile?.business_name || '',
      }).select().single();
      if (insertError) return res.status(500).json({ error: insertError.message });

      let knowledgeCopied = false;
      if (template.assistant_id) {
        const { data: templateKnowledge } = await supabase.from('knowledge').select('*').eq('assistant_id', template.assistant_id);
        if (templateKnowledge && templateKnowledge.length > 0) {
          const knowledgeInserts = templateKnowledge.map((k: any) => ({
            user_id: userId,
            assistant_id: newAssistant.id,
            title: k.title,
            content: k.content,
            type: k.type || 'manual',
          }));
          const { error: knowledgeError } = await supabase.from('knowledge').insert(knowledgeInserts);
          if (!knowledgeError) knowledgeCopied = true;
        }
      }

      await supabase.from('marketplace_templates').update({ installs: (template.installs || 0) + 1 }).eq('id', templateId);
      return res.json({ ...newAssistant, _knowledgeCopied: knowledgeCopied });
    }

    if (path === '/api/marketplace/publish' && req.method === 'POST') {
      const userId = await requireUserId(req, res);
      if (!userId) return;
      const { assistantId, title, description, category, industry } = req.body || {};
      if (!assistantId || !title) return res.status(400).json({ error: 'assistantId and title required' });
      const { data: assistant } = await supabase.from('assistants').select('*').eq('id', assistantId).eq('user_id', userId).single();
      if (!assistant) return res.status(404).json({ error: 'Assistant not found' });

      const { data, error } = await supabase.from('marketplace_templates').insert({
        user_id: userId,
        assistant_id: assistantId,
        name: title,
        title,
        description: description || assistant.description,
        category: category || 'General',
        industry,
        is_published: true,
        installs: 0,
      }).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    if (path === '/api/marketplace/create' && req.method === 'POST') {
      const userId = await requireUserId(req, res);
      if (!userId) return;
      const { name, description, category, industry, defaultConfig } = req.body || {};
      if (!name) return res.status(400).json({ error: 'name required' });
      const { data, error } = await supabase.from('marketplace_templates').insert({
        user_id: userId,
        name,
        description: description || '',
        category: category || 'General',
        industry: industry || '',
        default_config: defaultConfig || {},
        is_published: true,
        installs: 0,
      }).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    const marketplaceItemMatch = path.match(/^\/api\/marketplace\/(\d+)$/);
    if (marketplaceItemMatch && req.method === 'DELETE') {
      const userId = await requireUserId(req, res);
      if (!userId) return;
      const id = marketplaceItemMatch[1];
      const { data: existing } = await supabase.from('marketplace_templates').select('id').eq('id', id).eq('user_id', userId).single();
      if (!existing) return res.status(404).json({ error: 'Template not found' });
      const { error } = await supabase.from('marketplace_templates').delete().eq('id', id).eq('user_id', userId);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(204).end();
    }

    // ---- REFERRAL CLICKS ----
    if (path === '/api/referral_clicks' && req.method === 'GET') {
      const userId = await requireUserId(req, res);
      if (!userId) return;
      const { data: assistants } = await supabase.from('assistants').select('id').eq('user_id', userId);
      const ids = (assistants || []).map((a: any) => a.id);
      if (ids.length === 0) return res.json([]);
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const { data, error } = await supabase.from('referral_clicks').select('*').in('assistant_id', ids).gte('created_at', thisMonth.toISOString()).order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    if (path === '/api/referral_clicks' && req.method === 'POST') {
      const { assistantId, referrer, pageUrl } = req.body || {};
      if (!assistantId) return res.status(400).json({ error: 'assistantId required' });
      const { data, error } = await supabase.from('referral_clicks').insert({
        assistant_id: assistantId,
        referrer: referrer || 'widget',
        page_url: pageUrl || '',
        ip_address: ip,
        user_agent: req.headers['user-agent'] || '',
      }).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    // ---- REPORTS / WEEKLY ----
    if (path === '/api/reports/weekly' && req.method === 'GET') {
      const userId = await requireUserId(req, res);
      if (!userId) return;

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 86400000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);
      const weekStr = weekAgo.toISOString();
      const twoWeekStr = twoWeeksAgo.toISOString();

      const [currConv, prevConv, currLeads, prevLeads, currAppt, prevAppt, convWeek, convPrev, profileRes] = await Promise.all([
        supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', weekStr),
        supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', twoWeekStr).lt('created_at', weekStr),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', weekStr),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', twoWeekStr).lt('created_at', weekStr),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', weekStr),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', twoWeekStr).lt('created_at', weekStr),
        supabase.from('conversations').select('id, created_at').eq('user_id', userId).gte('created_at', weekStr),
        supabase.from('conversations').select('id').eq('user_id', userId).gte('created_at', twoWeekStr).lt('created_at', weekStr),
        supabase.from('profiles').select('avg_sale_value').eq('user_id', userId).maybeSingle(),
      ]);
      const weekConvIds2 = (convWeek.data || []).map((c: any) => c.id);
      const { data: messagesData } = weekConvIds2.length > 0
        ? await supabase.from('messages').select('content, role, conversation_id').in('conversation_id', weekConvIds2)
        : { data: [] };

      const currConversations = currConv.count || 0;
      const prevConversations = prevConv.count || 0;
      const currLeadsCount = currLeads.count || 0;
      const prevLeadsCount = prevLeads.count || 0;
      const currAppts = currAppt.count || 0;
      const prevAppts = prevAppt.count || 0;
      const convRate = currConversations > 0 ? (currLeadsCount / currConversations) * 100 : 0;
      const prevConvRate = prevConversations > 0 ? (prevLeadsCount / prevConversations) * 100 : 0;
      const avgSale = (profileRes.data as any)?.avg_sale_value || 100;
      const currMissed = (currConversations - currLeadsCount) * avgSale;
      const prevMissed = (prevConversations - prevLeadsCount) * avgSale;

      const dailyMap: Record<string, number> = {};
      for (const c of (convWeek.data || [])) {
        const day = new Date(c.created_at).toISOString().slice(0, 10);
        dailyMap[day] = (dailyMap[day] || 0) + 1;
      }
      const dailyChart = Object.entries(dailyMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));

      const unsurePhrases = ["i don't know", "i'm not sure", "i don't have", "please contact", "i cannot", "i am not sure", "i don't understand"];
      const unanswered = ((messagesData || []) as any[])
        .filter((m: any) => m.role === 'assistant' && unsurePhrases.some((p) => (m.content || '').toLowerCase().includes(p)))
        .slice(0, 10)
        .map((m: any) => ({ content: m.content, conversation_id: m.conversation_id }));

      const bestDay = Object.entries(dailyMap).sort(([, a], [, b]) => b - a)[0]?.[0] || null;

      const recommendations: string[] = [];
      if (currConversations > 5 && convRate < 20) {
        recommendations.push(`Your conversion rate is ${convRate.toFixed(0)}%. Consider adding pricing information and FAQs to your knowledge base.`);
      }
      if (currLeadsCount < prevLeadsCount && prevLeadsCount > 0) {
        const drop = Math.round(((prevLeadsCount - currLeadsCount) / prevLeadsCount) * 100);
        recommendations.push(`Leads dropped ${drop}% this week. Review your assistant's greeting message and lead capture questions.`);
      }
      if (unanswered.length > 3) {
        recommendations.push(`Your assistant couldn't answer ${unanswered.length} questions. Add these topics to your knowledge base.`);
      }
      if (dailyChart.length > 0 && bestDay) {
        const dayName = new Date(bestDay).toLocaleDateString('en-US', { weekday: 'long' });
        recommendations.push(`${dayName} is your busiest day. Make sure your assistant is updated with fresh content before ${dayName}.`);
      }
      if (recommendations.length === 0) {
        recommendations.push('Great week! Your assistant is performing well. Keep adding knowledge to improve further.');
      }

      return res.json({
        current: { conversations: currConversations, leads: currLeadsCount, appointments: currAppts, conversionRate: Math.round(convRate * 10) / 10, missedRevenue: currMissed },
        previous: { conversations: prevConversations, leads: prevLeadsCount, appointments: prevAppts, conversionRate: Math.round(prevConvRate * 10) / 10, missedRevenue: prevMissed },
        dailyChart,
        unanswered,
        bestDay,
        recommendations,
      });
    }

    // ---- WHATSAPP CONFIG ----
    // ---- CHANNEL WAITLIST ----
    if (path === '/api/channel-waitlist' && req.method === 'POST') {
      const { channel, email } = req.body || {};
      if (!channel || !email) return res.status(400).json({ error: 'channel and email required' });
      const { error } = await supabase.from('channel_waitlist').insert({
        channel,
        email,
        ip_address: ip,
      }).maybeSingle();
      if (error && !error.message?.includes('relation') && !error.message?.includes('does not exist')) {
        return res.status(500).json({ error: error.message });
      }
      return res.json({ success: true });
    }

    if (path === '/api/whatsapp/config' && req.method === 'GET') {
      const userId = await requireUserId(req, res);
      if (!userId) return;
      const { data, error } = await supabase.from('subscriptions').select('whatsapp_enabled, whatsapp_phone_number, whatsapp_phone_number_id, whatsapp_business_account_id, whatsapp_webhook_verify_token').eq('user_id', userId).single();
      if (error) return res.status(404).json({ enabled: false, phoneNumber: null, phoneNumberId: null, webhookUrl: '' });
      return res.json({
        enabled: data.whatsapp_enabled || false,
        phoneNumber: data.whatsapp_phone_number || null,
        phoneNumberId: data.whatsapp_phone_number_id || null,
        webhookUrl: data.whatsapp_webhook_verify_token || '',
      });
    }

    if (path === '/api/whatsapp/config' && req.method === 'PATCH') {
      const userId = await requireUserId(req, res);
      if (!userId) return;
      const { phoneNumberId, businessAccountId, accessToken, phoneNumber } = req.body || {};
      const { data, error } = await supabase.from('subscriptions').update({
        whatsapp_enabled: true,
        whatsapp_phone_number_id: phoneNumberId,
        whatsapp_business_account_id: businessAccountId,
        whatsapp_access_token: accessToken,
        whatsapp_phone_number: phoneNumber,
        whatsapp_webhook_verify_token: `${process.env.VITE_SUPABASE_URL || ''}/functions/v1/whatsapp-webhook`,
      }).eq('user_id', userId).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ enabled: true, phoneNumber: data.whatsapp_phone_number, phoneNumberId: data.whatsapp_phone_number_id, webhookUrl: data.whatsapp_webhook_verify_token });
    }

    if (path === '/api/whatsapp/config' && req.method === 'DELETE') {
      const userId = await requireUserId(req, res);
      if (!userId) return;
      const { error } = await supabase.from('subscriptions').update({
        whatsapp_enabled: false,
        whatsapp_phone_number_id: null,
        whatsapp_business_account_id: null,
        whatsapp_access_token: null,
        whatsapp_phone_number: null,
      }).eq('user_id', userId);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ enabled: false });
    }

    // ---- PUBLIC CHAT ----
    if (path === '/api/chat' && req.method === 'POST') {
      const { assistantId, message } = req.body || {};
      if (!assistantId || !message) return res.status(400).json({ error: 'assistantId and message required' });
      const { data: assistant } = await supabase.from('assistants').select('*').eq('id', assistantId).single();
      if (!assistant) return res.status(404).json({ error: 'Assistant not found' });

      let reply = "";
      try {
        const groqKey = process.env.GROQ_API_KEY || '';
        if (groqKey) {
          const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              messages: [
                { role: 'system', content: `You are ${assistant.name}, a helpful AI assistant for ${assistant.business_name || 'a business'}. ${assistant.description || ''}. Respond conversationally and helpfully.` },
                { role: 'user', content: message },
              ],
              max_tokens: 500,
            }),
          });
          const groqData: any = await groqRes.json();
          reply = groqData.choices?.[0]?.message?.content || "I'm not sure how to respond to that.";
        } else {
          reply = `This is a simulated response from ${assistant.name}. Connect a Groq API key to enable AI responses.`;
        }

        let conversationId: number | null = null;
        const { data: existingConv } = await supabase.from('conversations').select('id').eq('assistant_id', assistantId).eq('status', 'active').maybeSingle();
        if (existingConv) {
          conversationId = existingConv.id;
          await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
        } else {
          const { data: newConv } = await supabase.from('conversations').insert({ assistant_id: assistantId, user_id: assistant.user_id, status: 'active' }).select().single();
          conversationId = newConv?.id || null;
        }

        if (conversationId) {
          await supabase.from('messages').insert([
            { conversation_id: conversationId, role: 'user', content: message },
            { conversation_id: conversationId, role: 'assistant', content: reply },
          ]);
        }
      } catch {
        reply = "I'm having trouble connecting right now. Please try again.";
      }

      return res.json({ reply });
    }

    // ---- PUBLIC WIDGET ----
    if (path === '/api/widget' && req.method === 'GET') {
      const assistantId = getQueryParam(req, 'assistantId');
      if (!assistantId) return res.status(400).json({ error: 'assistantId required' });
      const { data: assistant } = await supabase.from('assistants').select('*').eq('id', assistantId).single();
      if (!assistant) return res.status(404).json({ error: 'Assistant not found' });
      const { data: sub } = await supabase.from('subscriptions').select('plan').eq('user_id', assistant.user_id).maybeSingle();
      const plan = sub?.plan || 'free';
      return res.json({
        id: assistant.id,
        name: assistant.name,
        config: assistant.config || {},
        isActive: assistant.is_active,
        plan,
      });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}

const PORT = parseInt(process.env.API_PORT || '8080', 10);
if (process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js')) {
  createServer((req, res) => {
    let body = '';
    req.on('data', (c: Buffer) => { body += c.toString(); });
    req.on('end', () => {
      try { (req as any).body = body ? JSON.parse(body) : {}; } catch { (req as any).body = {}; }
      (req as any).query = Object.fromEntries(new URL(req.url || '/', 'http://localhost').searchParams);

      const mockRes = {
        statusCode: 200,
        status: function (this: any, code: number) { this.statusCode = code; return this; },
        json: function (this: any, data: any) {
          res.statusCode = this.statusCode || 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        },
        setHeader: (k: string, v: string) => res.setHeader(k, v),
        end: (d?: string) => res.end(d || ''),
      };

      handler(req as any, mockRes as any).catch((e: any) => {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e?.message || 'Internal server error' }));
      });
    });
  }).listen(PORT, () => console.log(`API server running on http://localhost:${PORT}`));
}
