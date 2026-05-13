import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, assistantsTable, conversationsTable, leadsTable, appointmentsTable, subscriptionsTable, knowledgeTable } from '@workspace/db';
import { eq, and } from 'drizzle-orm';

// Helper to get user ID from Clerk header
function getUserId(req: VercelRequest): string | null {
  return req.headers['clerk-user-user-id'] as string || null;
}

// ============= ASSISTANTS =============
export async function getAssistants(req: VercelRequest, res: VercelResponse) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const assistants = await db
    .select()
    .from(assistantsTable)
    .where(eq(assistantsTable.userId, userId));

  res.json(assistants);
}

export async function createAssistant(req: VercelRequest, res: VercelResponse) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { name, businessName, description, tone, widgetColor } = req.body;
  const [assistant] = await db
    .insert(assistantsTable)
    .values({
      userId,
      name,
      businessName,
      description,
      tone: tone || 'professional',
      widgetColor: widgetColor || '#00d4ff',
    })
    .returning();

  res.status(201).json(assistant);
}

// ============= CONVERSATIONS =============
export async function getConversations(req: VercelRequest, res: VercelResponse) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const assistants = await db.select().from(assistantsTable).where(eq(assistantsTable.userId, userId));
  const assistantIds = assistants.map(a => a.id);

  if (assistantIds.length === 0) return res.json([]);

  const conversations = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.assistantId, assistantIds[0]));

  res.json(conversations);
}

// ============= LEADS =============
export async function getLeads(req: VercelRequest, res: VercelResponse) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const assistants = await db.select().from(assistantsTable).where(eq(assistantsTable.userId, userId));
  const assistantIds = assistants.map(a => a.id);

  if (assistantIds.length === 0) return res.json([]);

  const leads = await db
    .select()
    .from(leadsTable)
    .where(eq(leadsTable.assistantId, assistantIds[0]));

  res.json(leads);
}

// ============= APPOINTMENTS =============
export async function getAppointments(req: VercelRequest, res: VercelResponse) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const assistants = await db.select().from(assistantsTable).where(eq(assistantsTable.userId, userId));
  const assistantIds = assistants.map(a => a.id);

  if (assistantIds.length === 0) return res.json([]);

  const appointments = await db
    .select()
    .from(appointmentsTable)
    .where(eq(appointmentsTable.assistantId, assistantIds[0]));

  res.json(appointments);
}

// ============= SUBSCRIPTION =============
export async function getSubscription(req: VercelRequest, res: VercelResponse) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  let [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));

  if (!sub) {
    [sub] = await db
      .insert(subscriptionsTable)
      .values({
        userId,
        plan: 'free',
        messagesUsed: 0,
        messagesLimit: 100,
        assistantsLimit: 1,
        leadsLimit: 50,
        features: ['1 AI Assistant', '100 messages/month', '50 leads', 'Chat widget'],
      })
      .returning();
  }

  res.json(sub);
}

export async function updateSubscription(req: VercelRequest, res: VercelResponse) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { plan } = req.body;
  const limits = {
    free: { messagesLimit: 100, assistantsLimit: 1, leadsLimit: 50, features: ['1 AI Assistant', '100 messages/month', '50 leads', 'Chat widget'] },
    pro: { messagesLimit: -1, assistantsLimit: 5, leadsLimit: -1, features: ['5 AI Assistants', 'Unlimited messages', 'Unlimited leads', 'WhatsApp integration', 'Priority support'] },
    enterprise: { messagesLimit: -1, assistantsLimit: -1, leadsLimit: -1, features: ['Unlimited assistants', 'All features'] },
  };

  const [sub] = await db
    .update(subscriptionsTable)
    .set({
      plan,
      ...limits[plan as keyof typeof limits],
      renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })
    .where(eq(subscriptionsTable.userId, userId))
    .returning();

  res.json(sub);
}

// ============= KNOWLEDGE =============
export async function getKnowledge(req: VercelRequest, res: VercelResponse) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const knowledge = await db.select().from(knowledgeTable);
  res.json(knowledge);
}

export async function createKnowledge(req: VercelRequest, res: VercelResponse) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { title, content, source } = req.body;
  const [item] = await db
    .insert(knowledgeTable)
    .values({ title, content, source })
    .returning();

  res.status(201).json(item);
}

// ============= WHATSAPP CONFIG =============
export async function getWhatsAppConfig(req: VercelRequest, res: VercelResponse) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId));

  res.json({
    enabled: sub?.whatsappEnabled || false,
    phoneNumber: sub?.whatsappPhoneNumber || null,
    phoneNumberId: sub?.whatsappPhoneNumberId || null,
    webhookUrl: `https://${req.headers.host}/api/webhooks/whatsapp/${userId}`,
  });
}

export async function updateWhatsAppConfig(req: VercelRequest, res: VercelResponse) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { phoneNumberId, businessAccountId, accessToken, phoneNumber } = req.body;

  if (!phoneNumberId || !businessAccountId || !accessToken) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const [sub] = await db
    .update(subscriptionsTable)
    .set({
      whatsappEnabled: true,
      whatsappPhoneNumberId: phoneNumberId,
      whatsappBusinessAccountId: businessAccountId,
      whatsappAccessToken: accessToken,
      whatsappPhoneNumber: phoneNumber || null,
      whatsappWebhookVerifyToken: crypto.randomUUID(),
    })
    .where(eq(subscriptionsTable.userId, userId))
    .returning();

  res.json({
    enabled: sub.whatsappEnabled,
    webhookUrl: `https://${req.headers.host}/api/webhooks/whatsapp/${userId}`,
  });
}

export async function deleteWhatsAppConfig(req: VercelRequest, res: VercelResponse) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  await db
    .update(subscriptionsTable)
    .set({
      whatsappEnabled: false,
      whatsappPhoneNumberId: null,
      whatsappBusinessAccountId: null,
      whatsappAccessToken: null,
    })
    .where(eq(subscriptionsTable.userId, userId));

  res.json({ enabled: false });
}

// ============= HEALTH CHECK =============
export async function healthCheck(req: VercelRequest, res: VercelResponse) {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
}