import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { assistantsTable } from "./assistants";

export const knowledgeTable = pgTable("knowledge", {
  id: serial("id").primaryKey(),
  assistantId: integer("assistant_id").notNull().references(() => assistantsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("text"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  sourceUrl: text("source_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertKnowledgeSchema = createInsertSchema(knowledgeTable).omit({ id: true, createdAt: true });
export type InsertKnowledge = z.infer<typeof insertKnowledgeSchema>;
export type Knowledge = typeof knowledgeTable.$inferSelect;
