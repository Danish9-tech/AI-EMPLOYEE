import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const subscriptionsTable = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  plan: text("plan").notNull().default("free"),
  messagesUsed: integer("messages_used").notNull().default(0),
  messagesLimit: integer("messages_limit").notNull().default(100),
  assistantsLimit: integer("assistants_limit").notNull().default(1),
  leadsLimit: integer("leads_limit").notNull().default(50),
  features: text("features").array().notNull().default([]),
  renewsAt: timestamp("renews_at", { withTimezone: true }),

  // WhatsApp per-user configuration
  whatsappEnabled: boolean("whatsapp_enabled").notNull().default(false),
  whatsappPhoneNumberId: text("whatsapp_phone_number_id"),
  whatsappBusinessAccountId: text("whatsapp_business_account_id"),
  whatsappAccessToken: text("whatsapp_access_token"),
  whatsappWebhookVerifyToken: text("whatsapp_webhook_verify_token"),
  whatsappPhoneNumber: text("whatsapp_phone_number"),

  // Stripe per-user configuration
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  status: text("status").default("active"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptionsTable).omit({ id: true, createdAt: true });
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptionsTable.$inferSelect;
