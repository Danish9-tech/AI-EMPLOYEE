import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { assistantsTable } from "./assistants";

export const appointmentsTable = pgTable("appointments", {
  id: serial("id").primaryKey(),
  assistantId: integer("assistant_id").notNull().references(() => assistantsTable.id, { onDelete: "cascade" }),
  conversationId: integer("conversation_id"),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  service: text("service"),
  notes: text("notes"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAppointmentSchema = createInsertSchema(appointmentsTable).omit({ id: true, createdAt: true });
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointmentsTable.$inferSelect;
