import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, assistantsTable, conversationsTable, leadsTable, appointmentsTable, subscriptionsTable, knowledgeTable } from '@workspace/db';
import { eq } from 'drizzle-orm';

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
  // Strip query string for matching
  const path = url.split('?')[0];

  try {
    // ---- HEALTH ----
    if (path === '/api/healthz' && req.method === 'GET') {
      return res.json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // ---- ASSISTANTS ----
    if (path === '/api/assistants' && req.method === 'GET') {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const assistants = await db.select().from(assistantsTable).where(eq(assistantsTable.userId, userId));
      return res.json(assistants);
    }
    if (path === '/api/assistants' && req.method === 'POST') {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { name, businessName, description, tone, widgetColor } = req.body;
      const [assistant] = await db.insert(assistantsTable).values({
        userId, name, businessName, description,
        tone: tone || 'professional',
        widgetColor: widgetColor || '#00d4ff',
      }).returning();
      return res.status(201).json(assistant);
    }
    const assistantMatch = path.match(/^\/api\/assistants\/([^/]+)$/);
    if (assistantMatch) {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const id = parseInt(assistantMatch[1]);
      if (req.method === 'GET') {
        const [a] = await db.select().from(assistantsTable).where(eq(assistantsTable.id, id));
        return a ? res.json(a) : res.status(404).json({ error: 'Not found' });
      }
      if (req.method === 'PATCH' || req.method === 'PUT') {
        const [a] = await db.update(assistantsTable).set(req.body).where(eq(assistantsTable.id, id)).returning();
        return res.json(a);
      }
      if (req.method === 'DELETE') {
        await db.delete(assistantsTable).where(eq(assistantsTable.id, id));
        return res.status(204).end();
      }
    }

    // ---- CONVERSATIONS ----
    if (path === '/api/conversations' && req.method === 'GET') {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const assistants = await db.select().from(assistantsTable).where(eq(assistantsTable.userId, userId));
      if (assistants.length === 0) return res.json([]);
      const conversations = await db.select().from(conversationsTable).where(eq(conversationsTable.assistantId, assistants[0].id));
      return res.json(conversations);
    }

    // ---- LEADS ----
    if (path === '/api/leads' && req.method === 'GET') {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const assistants = await db.select().from(assistantsTable).where(eq(assistantsTable.userId, userId));
      if (assistants.length === 0) return res.json([]);
      const leads = await db.select().from(leadsTable).where(eq(leadsTable.assistantId, assistants[0].id));
      return res.json(leads);
    }

    // ---- APPOINTMENTS ----
    if (path === '/api/appointments' && req.method === 'GET') {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const assistants = await db.select().from(assistantsTable).where(eq(assistantsTable.userId, userId));
      if (assistants.length === 0) return res.json([]);
      const appointments = await db.select().from(appointmentsTable).where(eq(appointmentsTable.assistantId, assistants[0].id));
      return res.json(appointments);
    }

    // ---- SUBSCRIPTION ----
    if (path === '/api/subscription' && req.method === 'GET') {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      let [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
      if (!sub) {
        [sub] = await db.insert(subscriptionsTable).values({
          userId, plan: 'free', messagesUsed: 0, messagesLimit: 100,
          assistantsLimit: 1, leadsLimit: 50,
          features: ['1 AI Assistant', '100 messages/month', '50 leads', 'Chat widget'],
        }).returning();
      }
      return res.json(sub);
    }
    if (path === '/api/subscription' && (req.method === 'PATCH' || req.method === 'PUT')) {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { plan } = req.body;
      const limits: Record<string, any> = {
        free: { messagesLimit: 100, assistantsLimit: 1, leadsLimit: 50, features: ['1 AI Assistant', '100 messages/month', '50 leads', 'Chat widget'] },
        pro: { messagesLimit: -1, assistantsLimit: 5, leadsLimit: -1, features: ['5 AI Assistants', 'Unlimited messages', 'Unlimited leads', 'WhatsApp integration', 'Priority support'] },
        enterprise: { messagesLimit: -1, assistantsLimit: -1, leadsLimit: -1, features: ['Unlimited assistants', 'All features'] },
      };
      const [sub] = await db.update(subscriptionsTable).set({
        plan, ...limits[plan],
        renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }).where(eq(subscriptionsTable.userId, userId)).returning();
      return res.json(sub);
    }

    // ---- KNOWLEDGE ----
    if (path === '/api/knowledge' && req.method === 'GET') {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const knowledge = await db.select().from(knowledgeTable);
      return res.json(knowledge);
    }
    if (path === '/api/knowledge' && req.method === 'POST') {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { title, content, source } = req.body;
      const [item] = await db.insert(knowledgeTable).values({ title, content, source }).returning();
      return res.status(201).json(item);
    }

    // ---- WHATSAPP ----
    if (path === '/api/whatsapp/config' && req.method === 'GET') {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
      return res.json({
        enabled: sub?.whatsappEnabled || false,
        phoneNumber: sub?.whatsappPhoneNumber || null,
        phoneNumberId: sub?.whatsappPhoneNumberId || null,
        webhookUrl: `https://${req.headers.host}/api/webhooks/whatsapp/${userId}`,
      });
    }
    if (path === '/api/whatsapp/config' && req.method === 'POST') {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { phoneNumberId, businessAccountId, accessToken, phoneNumber } = req.body;
      if (!phoneNumberId || !businessAccountId || !accessToken) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      const [sub] = await db.update(subscriptionsTable).set({
        whatsappEnabled: true,
        whatsappPhoneNumberId: phoneNumberId,
        whatsappBusinessAccountId: businessAccountId,
        whatsappAccessToken: accessToken,
        whatsappPhoneNumber: phoneNumber || null,
        whatsappWebhookVerifyToken: crypto.randomUUID(),
      }).where(eq(subscriptionsTable.userId, userId)).returning();
      return res.json({ enabled: sub.whatsappEnabled, webhookUrl: `https://${req.headers.host}/api/webhooks/whatsapp/${userId}` });
    }
    if (path === '/api/whatsapp/config' && req.method === 'DELETE') {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      await db.update(subscriptionsTable).set({
        whatsappEnabled: false, whatsappPhoneNumberId: null,
        whatsappBusinessAccountId: null, whatsappAccessToken: null,
      }).where(eq(subscriptionsTable.userId, userId));
      return res.json({ enabled: false });
    }

    return res.status(404).json({ error: 'Not found', path });
  } catch (err: any) {
    console.error('API error:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
}
