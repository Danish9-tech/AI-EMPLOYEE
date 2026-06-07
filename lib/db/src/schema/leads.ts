import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { assistantsTable } from "./assistants";

export const leadsTable = pgTable("leads", {
  id: serial("id").primaryKey(),
  assistantId: integer("assistant_id").notNull().references(() => assistantsTable.id, { onDelete: "cascade" }),
  conversationId: integer("conversation_id"),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  status: text("status").notNull().default("new"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLeadSchema = createInsertSchema(leadsTable).omit({ id: true, createdAt: true });
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leadsTable.$inferSelect;
