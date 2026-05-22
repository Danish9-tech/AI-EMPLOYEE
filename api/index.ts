import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  return createClient(url, key);
}

function getUserId(req: VercelRequest): string | null {
  return req.headers['clerk-user-user-id'] as string || null;
}

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, clerk-user-user-id');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.url || '';
  const path = url.split('?')[0];
  const supabase = getSupabase();

  try {
    // ---- HEALTH ----
    if (path === '/api/healthz' && req.method === 'GET') {
      return res.json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // ---- ASSISTANTS ----
    if (path === '/api/assistants' && req.method === 'GET') {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { data, error } = await supabase.from('assistants').select('*').eq('user_id', userId);
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    if (path === '/api/assistants' && req.method === 'POST') {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { data, error } = await supabase.from('assistants').insert({ ...req.body, user_id: userId }).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    const assistantMatch = path.match(/^\/api\/assistants\/([^/]+)$/);
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
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { data, error } = await supabase.from('conversations').select('*').eq('user_id', userId);
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    if (path === '/api/conversations' && req.method === 'POST') {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { data, error } = await supabase.from('conversations').insert({ ...req.body, user_id: userId }).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    // ---- LEADS ----
    if (path === '/api/leads' && req.method === 'GET') {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { data, error } = await supabase.from('leads').select('*').eq('user_id', userId);
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    if (path === '/api/leads' && req.method === 'POST') {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { data, error } = await supabase.from('leads').insert({ ...req.body, user_id: userId }).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    // ---- APPOINTMENTS ----
    if (path === '/api/appointments' && req.method === 'GET') {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { data, error } = await supabase.from('appointments').select('*').eq('user_id', userId);
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    // ---- SUBSCRIPTIONS ----
    if (path === '/api/subscriptions' && req.method === 'GET') {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { data, error } = await supabase.from('subscriptions').select('*').eq('user_id', userId).single();
      if (error) return res.status(404).json({ error: error.message });
      return res.json(data);
    }

    // ---- KNOWLEDGE ----
    if (path === '/api/knowledge' && req.method === 'GET') {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { data, error } = await supabase.from('knowledge').select('*').eq('user_id', userId);
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    if (path === '/api/knowledge' && req.method === 'POST') {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { data, error } = await supabase.from('knowledge').insert({ ...req.body, user_id: userId }).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}
