import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

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

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.url || '';
  const path = url.split('?')[0];
  const supabase = getSupabase();

  try {
    if (path === '/api/healthz' && req.method === 'GET') {
      return res.json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // ---- DASHBOARD STATS ----
    if (path === '/api/dashboard/stats' && req.method === 'GET') {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const [assistantsRes, conversationsRes, leadsRes] = await Promise.all([
        supabase.from('assistants').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      ]);

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekStr = weekAgo.toISOString();

      const [convWeekRes, leadsWeekRes] = await Promise.all([
        supabase.from('conversations').select('id').eq('user_id', userId).gte('created_at', weekStr),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', weekStr),
      ]);

      const weekConvIds = (convWeekRes.data || []).map((c: any) => c.id);
      let messagesThisWeek = 0;
      if (weekConvIds.length > 0) {
        const { count } = await supabase.from('messages').select('id', { count: 'exact', head: true }).in('conversation_id', weekConvIds);
        messagesThisWeek = count || 0;
      }

      const totalConversations = conversationsRes.count || 0;
      const totalLeads = leadsRes.count || 0;
      const leadsThisWeek = leadsWeekRes.count || 0;
      const conversionRate = totalConversations > 0 ? (totalLeads / totalConversations) * 100 : 0;

      return res.json({
        totalAssistants: assistantsRes.count || 0,
        totalConversations,
        totalLeads,
        messagesThisWeek,
        leadsThisWeek,
        conversionRate: Math.round(conversionRate * 10) / 10,
      });
    }

    // ---- ASSISTANTS ----
    if (path === '/api/assistants' && req.method === 'GET') {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { data, error } = await supabase.from('assistants').select('*').eq('user_id', userId);
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    if (path === '/api/assistants' && req.method === 'POST') {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { data, error } = await supabase.from('assistants').insert({ ...req.body, user_id: userId }).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    const assistantMatch = path.match(/^\/api\/assistants\/(\d+)$/);
    if (assistantMatch) {
      const id = assistantMatch[1];
      if (req.method === 'GET') {
        const { data, error } = await supabase.from('assistants').select('*').eq('id', id).single();
        if (error) return res.status(404).json({ error: error.message });
        return res.json(data);
      }
      if (req.method === 'PATCH' || req.method === 'PUT') {
        const { data, error } = await supabase.from('assistants').update(req.body).eq('id', id).select().single();
        if (error) return res.status(500).json({ error: error.message });
        return res.json(data);
      }
      if (req.method === 'DELETE') {
        const { error } = await supabase.from('assistants').delete().eq('id', id);
        if (error) return res.status(500).json({ error: error.message });
        return res.status(204).end();
      }
    }

    // ---- CONVERSATIONS ----
    if (path === '/api/conversations' && req.method === 'GET') {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      let query = supabase.from('conversations').select('*').eq('user_id', userId);
      const assistantId = req.query?.assistantId;
      if (assistantId) query = query.eq('assistant_id', assistantId);
      const { data, error } = await query;
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    if (path === '/api/conversations' && req.method === 'POST') {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { data, error } = await supabase.from('conversations').insert({ ...req.body, user_id: userId }).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    const conversationMatch = path.match(/^\/api\/conversations\/(\d+)$/);
    if (conversationMatch) {
      if (req.method === 'GET') {
        const { data, error } = await supabase.from('conversations').select('*').eq('id', conversationMatch[1]).single();
        if (error) return res.status(404).json({ error: error.message });
        return res.json(data);
      }
    }

    const messagesMatch = path.match(/^\/api\/conversations\/(\d+)\/messages$/);
    if (messagesMatch && req.method === 'GET') {
      const { data, error } = await supabase.from('messages').select('*').eq('conversation_id', messagesMatch[1]).order('created_at', { ascending: true });
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    // ---- LEADS ----
    if (path === '/api/leads' && req.method === 'GET') {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { data, error } = await supabase.from('leads').select('*').eq('user_id', userId);
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    if (path === '/api/leads' && req.method === 'POST') {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { data, error } = await supabase.from('leads').insert({ ...req.body, user_id: userId }).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    // ---- APPOINTMENTS ----
    if (path === '/api/appointments' && req.method === 'GET') {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { data, error } = await supabase.from('appointments').select('*').eq('user_id', userId);
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    // ---- SUBSCRIPTIONS ----
    if (path === '/api/subscriptions' && req.method === 'GET') {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { data, error } = await supabase.from('subscriptions').select('*').eq('user_id', userId).single();
      if (error) return res.status(404).json({ error: error.message });
      return res.json(data);
    }

    // ---- KNOWLEDGE ----
    if (path === '/api/knowledge' && req.method === 'GET') {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { data, error } = await supabase.from('knowledge').select('*').eq('user_id', userId);
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    if (path === '/api/knowledge' && req.method === 'POST') {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { data, error } = await supabase.from('knowledge').insert({ ...req.body, user_id: userId }).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    // ---- MARKETPLACE ----
    if (path === '/api/marketplace' && req.method === 'GET') {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { data: allTemplates } = await supabase.from('marketplace_templates').select('*').order('name');
      const { data: installed } = await supabase.from('assistants').select('template_id').eq('user_id', userId).not('template_id', 'is', null);
      const installedIds = new Set((installed || []).map((a: any) => a.template_id));
      const result = (allTemplates || []).map((t: any) => ({ ...t, installed: installedIds.has(t.id) }));
      return res.json(result);
    }

    if (path === '/api/marketplace/install' && req.method === 'POST') {
      const userId = await getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { templateId } = req.body || {};
      if (!templateId) return res.status(400).json({ error: 'templateId required' });
      const { data: template } = await supabase.from('marketplace_templates').select('*').eq('id', templateId).single();
      if (!template) return res.status(404).json({ error: 'Template not found' });
      const { data, error } = await supabase.from('assistants').insert({
        user_id: userId,
        name: template.name,
        description: template.description,
        template_id: template.id,
        config: template.default_config || {},
        is_active: true,
      }).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}
