import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, appointmentsTable, assistantsTable } from "@workspace/db";
import { CreateAppointmentBody, UpdateAppointmentBody, UpdateAppointmentParams } from "@workspace/api-zod";
import { requireAuth } from "../lib/requireAuth";

const router: IRouter = Router();

router.get("/assistants/:assistantId/appointments", requireAuth, async (req, res): Promise<void> => {
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

  const appointments = await db
    .select()
    .from(appointmentsTable)
    .where(eq(appointmentsTable.assistantId, assistantId))
    .orderBy(appointmentsTable.scheduledAt);
  res.json(appointments);
});

router.post("/assistants/:assistantId/appointments", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.assistantId) ? req.params.assistantId[0] : req.params.assistantId;
  const assistantId = parseInt(rawId, 10);

  const parsed = CreateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [appointment] = await db
    .insert(appointmentsTable)
    .values({
      assistantId,
      conversationId: parsed.data.conversationId ?? null,
      name: parsed.data.name,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      scheduledAt: parsed.data.scheduledAt,
      service: parsed.data.service ?? null,
      notes: parsed.data.notes ?? null,
      status: "pending",
    })
    .returning();

  res.status(201).json(appointment);
});

router.patch("/appointments/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateAppointmentParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.scheduledAt !== undefined) updateData.scheduledAt = parsed.data.scheduledAt;
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;

  const [appointment] = await db
    .update(appointmentsTable)
    .set(updateData)
    .where(eq(appointmentsTable.id, params.data.id))
    .returning();
  if (!appointment) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  res.json(appointment);
});

export default router;
