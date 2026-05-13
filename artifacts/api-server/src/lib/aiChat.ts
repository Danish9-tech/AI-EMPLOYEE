import { db, knowledgeTable, messagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

function buildSystemPrompt(businessName: string, description: string, tone: string, knowledge: string): string {
  const toneMap: Record<string, string> = {
    professional: "You are professional, precise, and business-like.",
    friendly: "You are warm, personable, and conversational.",
    formal: "You are formal, authoritative, and structured.",
    casual: "You are relaxed, approachable, and informal.",
  };
  const toneInstruction = toneMap[tone] ?? toneMap["professional"];

  return `You are an AI assistant for ${businessName}. ${description}

${toneInstruction} Your goal is to help customers, answer their questions, recommend products or services, and capture their contact information when appropriate.

When a customer shows buying intent or asks for a quote/demo/appointment, politely ask for their name, email, and phone number to connect them with the team.

Knowledge base:
${knowledge || "No specific knowledge provided. Answer generally based on the business description."}

Keep responses concise and helpful. Do not make up specific prices or details not in your knowledge base.`;
}

async function getKnowledgeContext(assistantId: number): Promise<string> {
  try {
    const items = await db.select().from(knowledgeTable).where(eq(knowledgeTable.assistantId, assistantId));
    return items.map((k) => `[${k.title}]: ${k.content}`).join("\n\n");
  } catch {
    return "";
  }
}

async function getConversationHistory(conversationId: number): Promise<{ role: string; content: string }[]> {
  try {
    const msgs = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, conversationId))
      .orderBy(messagesTable.createdAt);
    return msgs.slice(-10).map((m) => ({ role: m.role, content: m.content }));
  } catch {
    return [];
  }
}

async function callOpenAI(messages: { role: string; content: string }[]): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI error: ${response.status} ${err}`);
  }

  const data = (await response.json()) as any;
  return data.choices?.[0]?.message?.content ?? "I'm sorry, I couldn't process that right now.";
}

function mockReply(userMessage: string, businessName: string): string {
  const msg = userMessage.toLowerCase();
  if (msg.includes("price") || msg.includes("cost") || msg.includes("how much")) {
    return `Great question! ${businessName} offers competitive pricing tailored to your needs. I'd love to connect you with our team to discuss options. Could you share your name, email, and phone number?`;
  }
  if (msg.includes("appointment") || msg.includes("book") || msg.includes("schedule")) {
    return `I'd be happy to help you book an appointment with ${businessName}! Please share your name, preferred date and time, and contact details so our team can confirm.`;
  }
  if (msg.includes("hello") || msg.includes("hi") || msg.includes("hey")) {
    return `Hello! Welcome to ${businessName}. I'm your AI assistant here to help. What can I do for you today?`;
  }
  if (msg.includes("hours") || msg.includes("open") || msg.includes("available")) {
    return `${businessName} is available to serve you. For specific hours, I recommend reaching out directly. Want me to connect you with our team?`;
  }
  return `Thank you for reaching out to ${businessName}! I'm here to help answer your questions and assist you in any way I can. Could you tell me more about what you're looking for?`;
}

export async function generateAIReply(params: {
  assistantId: number;
  conversationId: number;
  businessName: string;
  description: string;
  tone: string;
  userMessage: string;
}): Promise<string> {
  const { assistantId, conversationId, businessName, description, tone, userMessage } = params;

  const [knowledge, history] = await Promise.all([
    getKnowledgeContext(assistantId),
    getConversationHistory(conversationId),
  ]);

  if (!OPENAI_API_KEY) {
    logger.warn("OPENAI_API_KEY not set, using mock replies");
    return mockReply(userMessage, businessName);
  }

  try {
    const systemPrompt = buildSystemPrompt(businessName, description, tone, knowledge);
    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: userMessage },
    ];
    return await callOpenAI(messages);
  } catch (err) {
    logger.error({ err }, "OpenAI call failed, falling back to mock");
    return mockReply(userMessage, businessName);
  }
}
