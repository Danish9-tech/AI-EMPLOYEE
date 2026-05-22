import { db, knowledgeTable, messagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

// ─── Provider API keys (set in environment) ───────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ─── Active provider selection ────────────────────────────────────────────────
// Priority order: Gemini → Groq → Anthropic → OpenAI → mock
function getActiveProvider(): "gemini" | "groq" | "anthropic" | "openai" | "mock" {
  if (GEMINI_API_KEY) return "gemini";
  if (GROQ_API_KEY) return "groq";
  if (ANTHROPIC_API_KEY) return "anthropic";
  if (OPENAI_API_KEY) return "openai";
  return "mock";
}

// ─── System prompt builder ─────────────────────────────────────────────────────
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

// ─── DB helpers ───────────────────────────────────────────────────────────────
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

// ─── Provider: Google Gemini ──────────────────────────────────────────────────
async function callGemini(
  systemPrompt: string,
  history: { role: string; content: string }[],
  userMessage: string
): Promise<string> {
  // Build contents array: system instruction + history + latest user message
  const contents: { role: string; parts: { text: string }[] }[] = [];

  // Add conversation history (Gemini uses "user" / "model" roles)
  for (const msg of history) {
    contents.push({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    });
  }
  // Add the latest user message
  contents.push({ role: "user", parts: [{ text: userMessage }] });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.7,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini error: ${response.status} ${err}`);
  }

  const data = (await response.json()) as any;
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "I'm sorry, I couldn't process that right now.";
}

// ─── Provider: Groq ───────────────────────────────────────────────────────────
async function callGroq(
  systemPrompt: string,
  history: { role: string; content: string }[],
  userMessage: string
): Promise<string> {
  const messages = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: userMessage },
  ];

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq error: ${response.status} ${err}`);
  }

  const data = (await response.json()) as any;
  return data.choices?.[0]?.message?.content ?? "I'm sorry, I couldn't process that right now.";
}

// ─── Provider: Anthropic Claude ───────────────────────────────────────────────
async function callAnthropic(
  systemPrompt: string,
  history: { role: string; content: string }[],
  userMessage: string
): Promise<string> {
  const messages = [
    ...history,
    { role: "user", content: userMessage },
  ];

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 500,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic error: ${response.status} ${err}`);
  }

  const data = (await response.json()) as any;
  return data.content?.[0]?.text ?? "I'm sorry, I couldn't process that right now.";
}

// ─── Provider: OpenAI ─────────────────────────────────────────────────────────
async function callOpenAI(
  systemPrompt: string,
  history: { role: string; content: string }[],
  userMessage: string
): Promise<string> {
  const messages = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: userMessage },
  ];

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

// ─── Mock fallback ────────────────────────────────────────────────────────────
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

// ─── Main export ──────────────────────────────────────────────────────────────
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

  const provider = getActiveProvider();

  if (provider === "mock") {
    logger.warn("No AI API key configured — using mock replies");
    return mockReply(userMessage, businessName);
  }

  const systemPrompt = buildSystemPrompt(businessName, description, tone, knowledge);

  try {
    logger.info({ provider }, "Calling AI provider");
    switch (provider) {
      case "gemini":
        return await callGemini(systemPrompt, history, userMessage);
      case "groq":
        return await callGroq(systemPrompt, history, userMessage);
      case "anthropic":
        return await callAnthropic(systemPrompt, history, userMessage);
      case "openai":
        return await callOpenAI(systemPrompt, history, userMessage);
    }
  } catch (err) {
    logger.error({ err, provider }, "AI provider call failed, falling back to mock");
    return mockReply(userMessage, businessName);
  }
}
