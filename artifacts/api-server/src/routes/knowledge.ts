import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, knowledgeTable, assistantsTable } from "@workspace/db";
import { CreateKnowledgeBody, DeleteKnowledgeParams } from "@workspace/api-zod";
import { requireAuth } from "../lib/requireAuth";

const router: IRouter = Router();

router.get("/assistants/:assistantId/knowledge", requireAuth, async (req, res): Promise<void> => {
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

  const items = await db
    .select()
    .from(knowledgeTable)
    .where(eq(knowledgeTable.assistantId, assistantId))
    .orderBy(knowledgeTable.createdAt);
  res.json(items);
});

router.post("/assistants/:assistantId/knowledge", requireAuth, async (req, res): Promise<void> => {
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

  const parsed = CreateKnowledgeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [item] = await db
    .insert(knowledgeTable)
    .values({
      assistantId,
      type: parsed.data.type,
      title: parsed.data.title,
      content: parsed.data.content,
      sourceUrl: parsed.data.sourceUrl ?? null,
    })
    .returning();
  res.status(201).json(item);
});

router.delete("/knowledge/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteKnowledgeParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db.select().from(knowledgeTable).where(eq(knowledgeTable.id, params.data.id));
  if (!item) {
    res.status(404).json({ error: "Knowledge item not found" });
    return;
  }

  const [assistant] = await db
    .select()
    .from(assistantsTable)
    .where(and(eq(assistantsTable.id, item.assistantId), eq(assistantsTable.userId, userId)));
  if (!assistant) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(knowledgeTable).where(eq(knowledgeTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
