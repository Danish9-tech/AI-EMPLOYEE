import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, assistantsTable, conversationsTable, leadsTable, appointmentsTable } from "@workspace/db";
import {
  CreateAssistantBody,
  UpdateAssistantBody,
  GetAssistantParams,
  UpdateAssistantParams,
  DeleteAssistantParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/requireAuth";

const router: IRouter = Router();

router.get("/assistants", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const assistants = await db
    .select()
    .from(assistantsTable)
    .where(eq(assistantsTable.userId, userId))
    .orderBy(assistantsTable.createdAt);
  res.json(assistants);
});

router.post("/assistants", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const parsed = CreateAssistantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [assistant] = await db
    .insert(assistantsTable)
    .values({
      userId,
      name: parsed.data.name,
      businessName: parsed.data.businessName,
      description: parsed.data.description,
      tone: parsed.data.tone ?? "professional",
      widgetColor: parsed.data.widgetColor ?? "#00d4ff",
    })
    .returning();
  res.status(201).json(assistant);
});

router.get("/assistants/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetAssistantParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [assistant] = await db
    .select()
    .from(assistantsTable)
    .where(and(eq(assistantsTable.id, params.data.id), eq(assistantsTable.userId, userId)));
  if (!assistant) {
    res.status(404).json({ error: "Assistant not found" });
    return;
  }
  res.json(assistant);
});

router.patch("/assistants/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateAssistantParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateAssistantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.businessName !== undefined) updateData.businessName = parsed.data.businessName;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.tone !== undefined) updateData.tone = parsed.data.tone;
  if (parsed.data.widgetColor !== undefined) updateData.widgetColor = parsed.data.widgetColor;
  if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;

  const [assistant] = await db
    .update(assistantsTable)
    .set(updateData)
    .where(and(eq(assistantsTable.id, params.data.id), eq(assistantsTable.userId, userId)))
    .returning();
  if (!assistant) {
    res.status(404).json({ error: "Assistant not found" });
    return;
  }
  res.json(assistant);
});

router.delete("/assistants/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteAssistantParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(assistantsTable)
    .where(and(eq(assistantsTable.id, params.data.id), eq(assistantsTable.userId, userId)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Assistant not found" });
    return;
  }
  res.sendStatus(204);
});

// Assistant stats
router.get("/assistants/:assistantId/stats", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const rawId = Array.isArray(req.params.assistantId) ? req.params.assistantId[0] : req.params.assistantId;
  const assistantId = parseInt(rawId, 10);

  const [assistant] = await db
    .select()
    .from(assistantsTable)
    .where(and(eq(assistantsTable.id, assistantId), eq(assistantsTable.userId, userId)));
  if (!assistant) {
    res.status(404).json({ error: "Assistant not found" });
    return;
  }

  const [conversations, leads, appointments] = await Promise.all([
    db.select().from(conversationsTable).where(eq(conversationsTable.assistantId, assistantId)),
    db.select().from(leadsTable).where(eq(leadsTable.assistantId, assistantId)),
    db.select().from(appointmentsTable).where(eq(appointmentsTable.assistantId, assistantId)),
  ]);

  const leadsByStatus: Record<string, number> = {};
  for (const lead of leads) {
    leadsByStatus[lead.status] = (leadsByStatus[lead.status] ?? 0) + 1;
  }

  res.json({
    assistantId,
    totalConversations: conversations.length,
    totalMessages: assistant.totalMessages,
    totalLeads: leads.length,
    totalAppointments: appointments.length,
    avgResponseTime: 1.2,
    topQuestions: [
      "What are your business hours?",
      "What services do you offer?",
      "How much does it cost?",
      "How do I book an appointment?",
    ],
    leadsByStatus,
  });
});

export default router;
