import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const assistantsTable = pgTable("assistants", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  businessName: text("business_name").notNull(),
  description: text("description").notNull(),
  tone: text("tone").notNull().default("professional"),
  widgetColor: text("widget_color").notNull().default("#00d4ff"),
  isActive: boolean("is_active").notNull().default(true),
  totalMessages: integer("total_messages").notNull().default(0),
  totalLeads: integer("total_leads").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAssistantSchema = createInsertSchema(assistantsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAssistant = z.infer<typeof insertAssistantSchema>;
export type Assistant = typeof assistantsTable.$inferSelect;
