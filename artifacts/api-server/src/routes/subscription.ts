import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db, subscriptionsTable } from "@workspace/db";
import { requireAuth } from "../lib/requireAuth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-01-27.acacia",
});

const PLAN_LIMITS: Record<string, { messagesLimit: number; assistantsLimit: number; leadsLimit: number; features: string[]; priceId: string }> = {
  free: {
    messagesLimit: 100,
    assistantsLimit: 1,
    leadsLimit: 50,
    features: ["1 AI Assistant", "100 messages/month", "50 leads", "Chat widget"],
    priceId: "",
  },
  pro: {
    messagesLimit: -1,
    assistantsLimit: 5,
    leadsLimit: -1,
    features: ["5 AI Assistants", "Unlimited messages", "Unlimited leads", "WhatsApp integration", "Priority support", "Analytics"],
    priceId: "price_pro_monthly",
  },
  enterprise: {
    messagesLimit: -1,
    assistantsLimit: -1,
    leadsLimit: -1,
    features: ["Unlimited assistants", "Unlimited messages", "Unlimited leads", "WhatsApp + custom channels", "Custom domain", "API access", "Dedicated support"],
    priceId: "price_enterprise_monthly",
  },
};

async function getOrCreateSubscription(userId: string) {
  let [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
  if (!sub) {
    const freeLimits = PLAN_LIMITS.free;
    [sub] = await db
      .insert(subscriptionsTable)
      .values({
        userId,
        plan: "free",
        messagesUsed: 0,
        messagesLimit: freeLimits.messagesLimit,
        assistantsLimit: freeLimits.assistantsLimit,
        leadsLimit: freeLimits.leadsLimit,
        features: freeLimits.features,
      })
      .returning();
  }
  return sub;
}

const router: IRouter = Router();

// GET current subscription (creates free tier if none exists)
router.get("/subscription", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const sub = await getOrCreateSubscription(userId);
  res.json(sub);
});

// GET available plans (public)
router.get("/subscription/plans", async (req, res): Promise<void> => {
  res.json({
    plans: [
      { id: "free", name: "Free", price: 0, interval: "month", ...PLAN_LIMITS.free },
      { id: "pro", name: "Pro", price: 29, interval: "month", ...PLAN_LIMITS.pro },
      { id: "enterprise", name: "Enterprise", price: 99, interval: "month", ...PLAN_LIMITS.enterprise },
    ],
  });
});

// POST create Stripe checkout session
router.post("/subscription/checkout", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const { plan } = req.body;

  if (!PLAN_LIMITS[plan] || !PLAN_LIMITS[plan].priceId) {
    res.status(400).json({ error: "Invalid plan or plan not available for purchase" });
    return;
  }

  try {
    await getOrCreateSubscription(userId);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: PLAN_LIMITS[plan].priceId, quantity: 1 }],
      success_url: `${process.env.APP_URL || "http://localhost:5173"}/subscription?success=true`,
      cancel_url: `${process.env.APP_URL || "http://localhost:5173"}/subscription?canceled=true`,
      metadata: { userId, plan },
    });
    res.json({ url: session.url, sessionId: session.id });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    res.status(500).json({ error: error.message || "Failed to create checkout session" });
  }
});

// POST open Stripe billing portal
router.post("/subscription/portal", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;

  try {
    const sub = await getOrCreateSubscription(userId);
    if (!sub.stripeCustomerId) {
      res.status(400).json({ error: "No active Stripe subscription. Please subscribe via checkout first." });
      return;
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${process.env.APP_URL || "http://localhost:5173"}/subscription`,
    });
    res.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe portal error:", error);
    res.status(500).json({ error: error.message || "Failed to create portal session" });
  }
});

// POST Stripe webhook - handles payment events
// NOTE: requires express.raw() body for this path - configured in app.ts
router.post("/webhooks/stripe", async (req, res): Promise<void> => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event: Stripe.Event;

  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      console.warn("STRIPE_WEBHOOK_SECRET not set - skipping signature verification");
      event = req.body as Stripe.Event;
    }
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    res.status(400).json({ error: "Webhook signature verification failed" });
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const { userId, plan } = session.metadata || {};
        if (userId && plan && PLAN_LIMITS[plan]) {
          const planLimits = PLAN_LIMITS[plan];
          const customerId = session.customer as string;
          const subscriptionId = session.subscription as string;

          // Get actual period end from Stripe subscription
          let renewsAt: Date;
          try {
            const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
            renewsAt = new Date(stripeSub.current_period_end * 1000);
          } catch {
            renewsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          }

          await db
            .update(subscriptionsTable)
            .set({
              plan,
              status: "active",
              stripeSubscriptionId: subscriptionId,
              stripeCustomerId: customerId,
              messagesLimit: planLimits.messagesLimit,
              assistantsLimit: planLimits.assistantsLimit,
              leadsLimit: planLimits.leadsLimit,
              features: planLimits.features,
              renewsAt,
            })
            .where(eq(subscriptionsTable.userId, userId));
          console.log(`Subscription activated for user ${userId}, plan: ${plan}`);
        }
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        await db
          .update(subscriptionsTable)
          .set({
            status: subscription.status,
            renewsAt: new Date(subscription.current_period_end * 1000),
          })
          .where(eq(subscriptionsTable.stripeCustomerId, customerId));
        console.log(`Subscription updated for customer ${customerId}`);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const freeLimits = PLAN_LIMITS.free;
        await db
          .update(subscriptionsTable)
          .set({
            plan: "free",
            status: "canceled",
            stripeSubscriptionId: null,
            messagesLimit: freeLimits.messagesLimit,
            assistantsLimit: freeLimits.assistantsLimit,
            leadsLimit: freeLimits.leadsLimit,
            features: freeLimits.features,
          })
          .where(eq(subscriptionsTable.stripeCustomerId, customerId));
        console.log(`Subscription canceled for customer ${customerId}`);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    res.json({ received: true });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;
