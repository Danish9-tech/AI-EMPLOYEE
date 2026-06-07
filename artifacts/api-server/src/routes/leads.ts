import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, leadsTable, assistantsTable } from "@workspace/db";
import { CreateLeadBody, UpdateLeadBody, UpdateLeadParams } from "@workspace/api-zod";
import { requireAuth } from "../lib/requireAuth";

const router: IRouter = Router();

// GET all leads for an assistant
router.get("/assistants/:assistantId/leads", requireAuth, async (req, res): Promise<void> => {
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

  const leads = await db
    .select()
    .from(leadsTable)
    .where(eq(leadsTable.assistantId, assistantId))
    .orderBy(leadsTable.createdAt);

  res.json(leads);
});

// CREATE lead (public - called by chat widget on behalf of customers)
router.post("/assistants/:assistantId/leads", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.assistantId) ? req.params.assistantId[0] : req.params.assistantId;
  const assistantId = parseInt(rawId, 10);

  // Verify the assistant exists before creating a lead
  const [assistant] = await db
    .select()
    .from(assistantsTable)
    .where(eq(assistantsTable.id, assistantId));

  if (!assistant) {
    res.status(404).json({ error: "Assistant not found" });
    return;
  }

  const parsed = CreateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [lead] = await db
    .insert(leadsTable)
    .values({
      assistantId,
      conversationId: parsed.data.conversationId ?? null,
      name: parsed.data.name || "Unknown",
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      status: "new",
    })
    .returning();

  // Increment totalLeads counter without a second query
  await db
    .update(assistantsTable)
    .set({ totalLeads: sql`${assistantsTable.totalLeads} + 1` })
    .where(eq(assistantsTable.id, assistantId));

  res.status(201).json(lead);
});

// UPDATE lead (owner only)
router.patch("/leads/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateLeadParams.safeParse({ id: parseInt(rawId, 10) });

  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Verify ownership: lead must belong to one of user's assistants
  const [existing] = await db
    .select({ id: leadsTable.id, assistantId: leadsTable.assistantId })
    .from(leadsTable)
    .where(eq(leadsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  const [ownerAssistant] = await db
    .select()
    .from(assistantsTable)
    .where(and(eq(assistantsTable.id, existing.assistantId), eq(assistantsTable.userId, userId)));

  if (!ownerAssistant) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.email !== undefined) updateData.email = parsed.data.email;
  if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;

  const [lead] = await db
    .update(leadsTable)
    .set(updateData)
    .where(eq(leadsTable.id, params.data.id))
    .returning();

  res.json(lead);
});

export default router;
