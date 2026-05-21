import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, subscriptionsTable, assistantsTable, conversationsTable, messagesTable } from "@workspace/db";
import { requireAuth } from "../lib/requireAuth";
import { generateAIReply } from "../lib/aiChat";

const router: IRouter = Router();

// GET user's WhatsApp configuration
router.get("/whatsapp/config", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;

  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId));

  res.json({
    enabled: sub?.whatsappEnabled || false,
    phoneNumber: sub?.whatsappPhoneNumber || null,
    phoneNumberId: sub?.whatsappPhoneNumberId || null,
    webhookUrl: `${req.protocol}://${req.get("host")}/api/webhooks/whatsapp/${userId}`,
  });
});

// UPDATE user's WhatsApp configuration
router.patch("/whatsapp/config", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const { phoneNumberId, businessAccountId, accessToken, phoneNumber, webhookVerifyToken } = req.body;

  if (!phoneNumberId || !businessAccountId || !accessToken) {
    res.status(400).json({ error: "Missing required fields: phoneNumberId, businessAccountId, accessToken" });
    return;
  }

  const [sub] = await db
    .update(subscriptionsTable)
    .set({
      whatsappEnabled: true,
      whatsappPhoneNumberId: phoneNumberId,
      whatsappBusinessAccountId: businessAccountId,
      whatsappAccessToken: accessToken,
      whatsappPhoneNumber: phoneNumber || null,
      whatsappWebhookVerifyToken: webhookVerifyToken || crypto.randomUUID(),
    })
    .where(eq(subscriptionsTable.userId, userId))
    .returning();

  res.json({
    enabled: sub.whatsappEnabled,
    webhookUrl: `${req.protocol}://${req.get("host")}/api/webhooks/whatsapp/${userId}`,
  });
});

// DISABLE user's WhatsApp
router.delete("/whatsapp/config", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;

  await db
    .update(subscriptionsTable)
    .set({
      whatsappEnabled: false,
      whatsappPhoneNumberId: null,
      whatsappBusinessAccountId: null,
      whatsappAccessToken: null,
      whatsappWebhookVerifyToken: null,
      whatsappPhoneNumber: null,
    })
    .where(eq(subscriptionsTable.userId, userId));

  res.json({ enabled: false });
});

// WhatsApp Webhook Verification - per user
router.get("/webhooks/whatsapp/:userId", async (req, res) => {
  const { userId } = req.params;
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId));

  const verifyToken = sub?.whatsappWebhookVerifyToken || "default_verify_token";

  if (mode === "subscribe" && token === verifyToken) {
    console.log(`WhatsApp webhook verified for user ${userId}`);
    res.status(200).send(challenge);
  } else {
    console.log(`WhatsApp webhook verification failed for user ${userId}`);
    res.status(403).json({ error: "Verification failed" });
  }
});

// WhatsApp Incoming Messages Webhook - per user
router.post("/webhooks/whatsapp/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const [sub] = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.userId, userId));

    if (!sub || !sub.whatsappEnabled || !sub.whatsappPhoneNumberId || !sub.whatsappAccessToken) {
      res.status(404).json({ error: "WhatsApp not configured for this user" });
      return;
    }

    const { entry } = req.body;
    if (!entry || !entry[0]?.changes) {
      res.status(200).send("OK");
      return;
    }

    // Find user's assistant (first one)
    const [assistant] = await db
      .select()
      .from(assistantsTable)
      .where(eq(assistantsTable.userId, userId))
      .limit(1);

    if (!assistant) {
      console.log("No assistant found for user, skipping message");
      res.status(200).send("OK");
      return;
    }

    const changes = entry[0].changes;

    for (const change of changes) {
      if (!change.value?.messages) continue;

      for (const message of change.value.messages) {
        const from = message.from;
        const messageText = message.text?.body;
        const messageId = message.id;

        if (!messageText) continue;

        console.log(`WhatsApp message from ${from}: ${messageText}`);

        // Find or create conversation
        let [conversation] = await db
          .select()
          .from(conversationsTable)
          .where(
            and(
              eq(conversationsTable.phoneNumber, from),
              eq(conversationsTable.assistantId, assistant.id)
            )
          )
          .limit(1);

        if (!conversation) {
          [conversation] = await db
            .insert(conversationsTable)
            .values({
              assistantId: assistant.id,
              phoneNumber: from,
              platform: "whatsapp",
              status: "active",
            })
            .returning();
        }

        // Save user message
        await db.insert(messagesTable).values({
          conversationId: conversation.id,
          role: "user",
          content: messageText,
          messageId,
        });

        // Generate AI response
        const aiResponse = await generateAIReply({
          assistantId: assistant.id,
          conversationId: conversation.id,
          businessName: assistant.businessName,
          description: assistant.description,
          tone: assistant.tone,
          userMessage: messageText,
        });

        // Save assistant message
        await db.insert(messagesTable).values({
          conversationId: conversation.id,
          role: "assistant",
          content: aiResponse,
        });

        // Send response via WhatsApp API
        try {
          await fetch(`https://graph.facebook.com/v21.0/${sub.whatsappPhoneNumberId}/messages`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${sub.whatsappAccessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: from,
              text: { body: aiResponse },
            }),
          });
        } catch (waError) {
          console.error("Failed to send WhatsApp response:", waError);
        }
      }
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
