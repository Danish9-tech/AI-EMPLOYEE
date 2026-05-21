import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, assistantsTable, conversationsTable, messagesTable } from "@workspace/db";
import { SendChatMessageBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/requireAuth";
import { generateAIReply } from "../lib/aiChat";
import { randomUUID } from "crypto";

const router: IRouter = Router();

// GET all conversations for an assistant (owner only)
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

// GET messages for a conversation (owner only)
router.get("/conversations/:conversationId/messages", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const rawId = Array.isArray(req.params.conversationId) ? req.params.conversationId[0] : req.params.conversationId;
  const conversationId = parseInt(rawId, 10);

  // Verify ownership: conversation -> assistant -> userId
  const [conversation] = await db
    .select({ id: conversationsTable.id, assistantId: conversationsTable.assistantId })
    .from(conversationsTable)
    .where(eq(conversationsTable.id, conversationId));

  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const [assistant] = await db
    .select()
    .from(assistantsTable)
    .where(and(eq(assistantsTable.id, conversation.assistantId), eq(assistantsTable.userId, userId)));

  if (!assistant) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conversationId))
    .orderBy(messagesTable.createdAt);

  res.json(messages);
});

// POST new chat message (public - from widget/embed)
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
    .set({ totalMessages: sql`${assistantsTable.totalMessages} + 2` })
    .where(eq(assistantsTable.id, assistantId));

  res.json({ reply, conversationId: conversation.id, sessionId });
});

export default router;
