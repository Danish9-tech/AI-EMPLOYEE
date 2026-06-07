import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { assistantsTable } from "./assistants";

export const conversationsTable = pgTable("conversations", {
  id: serial("id").primaryKey(),
  assistantId: integer("assistant_id").notNull().references(() => assistantsTable.id, { onDelete: "cascade" }),
  sessionId: text("session_id"),
  visitorName: text("visitor_name"),
  visitorEmail: text("visitor_email"),
  messageCount: integer("message_count").notNull().default(0),
  channel: text("channel").notNull().default("widget"),
  // WhatsApp-specific fields
  phoneNumber: text("phone_number"),
  platform: text("platform").default("widget"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversationsTable.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  messageId: text("message_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, createdAt: true });
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversationsTable.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
