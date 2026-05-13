import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, assistantsTable, conversationsTable, messagesTable } from "@workspace/db";
import { SendChatMessageBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/requireAuth";
import { generateAIReply } from "../lib/aiChat";
import { randomUUID } from "crypto";

const router: IRouter = Router();

router.get("/assistants/:assistantId/conversations", requireAuth, async (req, res): Promise<void> => {
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

  const conversations = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.assistantId, assistantId))
    .orderBy(conversationsTable.updatedAt);
  res.json(conversations);
});

router.get("/conversations/:conversationId/messages", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.conversationId) ? req.params.conversationId[0] : req.params.conversationId;
  const conversationId = parseInt(rawId, 10);
  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conversationId))
    .orderBy(messagesTable.createdAt);
  res.json(messages);
});

router.post("/chat", async (req, res): Promise<void> => {
  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { assistantId, sessionId: rawSessionId, message, channel } = parsed.data;
  const sessionId = rawSessionId || randomUUID();

  const [assistant] = await db
    .select()
    .from(assistantsTable)
    .where(eq(assistantsTable.id, assistantId));
  if (!assistant) {
    res.status(404).json({ error: "Assistant not found" });
    return;
  }

  let [conversation] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.sessionId, sessionId));

  if (!conversation) {
    [conversation] = await db
      .insert(conversationsTable)
      .values({ assistantId, sessionId, channel: channel ?? "widget", messageCount: 0 })
      .returning();
  }

  await db.insert(messagesTable).values({
    conversationId: conversation.id,
    role: "user",
    content: message,
  });

  const reply = await generateAIReply({
    assistantId,
    conversationId: conversation.id,
    businessName: assistant.businessName,
    description: assistant.description,
    tone: assistant.tone,
    userMessage: message,
  });

  await db.insert(messagesTable).values({
    conversationId: conversation.id,
    role: "assistant",
    content: reply,
  });

  const newCount = (conversation.messageCount ?? 0) + 2;
  await db
    .update(conversationsTable)
    .set({ messageCount: newCount })
    .where(eq(conversationsTable.id, conversation.id));

  await db
    .update(assistantsTable)
    .set({ totalMessages: (assistant.totalMessages ?? 0) + 2 })
    .where(eq(assistantsTable.id, assistantId));

  res.json({ reply, conversationId: conversation.id, sessionId });
});

export default router;
