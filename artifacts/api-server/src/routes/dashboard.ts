import { Router, type IRouter } from "express";
import { eq, gte, inArray, and, sql } from "drizzle-orm";
import { db, assistantsTable, conversationsTable, leadsTable, appointmentsTable, messagesTable } from "@workspace/db";
import { requireAuth } from "../lib/requireAuth";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;

  const assistants = await db
    .select()
    .from(assistantsTable)
    .where(eq(assistantsTable.userId, userId));

  const assistantIds = assistants.map((a) => a.id);

  if (assistantIds.length === 0) {
    res.json({
      totalAssistants: 0,
      totalConversations: 0,
      totalMessages: 0,
      totalLeads: 0,
      totalAppointments: 0,
      messagesThisWeek: 0,
      leadsThisWeek: 0,
      appointmentsThisWeek: 0,
      conversionRate: 0,
    });
    return;
  }

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // All queries filtered by user's assistants in the DB - no JS-side filtering needed
  const [conversations, leads, appointments, messagesThisWeekRows] = await Promise.all([
    db
      .select({ id: conversationsTable.id })
      .from(conversationsTable)
      .where(inArray(conversationsTable.assistantId, assistantIds)),
    db
      .select({ id: leadsTable.id, createdAt: leadsTable.createdAt })
      .from(leadsTable)
      .where(inArray(leadsTable.assistantId, assistantIds)),
    db
      .select({ id: appointmentsTable.id, createdAt: appointmentsTable.createdAt })
      .from(appointmentsTable)
      .where(inArray(appointmentsTable.assistantId, assistantIds)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(messagesTable)
      .innerJoin(conversationsTable, eq(messagesTable.conversationId, conversationsTable.id))
      .where(
        and(
          inArray(conversationsTable.assistantId, assistantIds),
          gte(messagesTable.createdAt, oneWeekAgo)
        )
      ),
  ]);

  const totalMessages = assistants.reduce((sum, a) => sum + (a.totalMessages ?? 0), 0);
  const leadsThisWeek = leads.filter((l) => new Date(l.createdAt) > oneWeekAgo).length;
  const appointmentsThisWeek = appointments.filter((a) => new Date(a.createdAt) > oneWeekAgo).length;
  const messagesThisWeek = Number(messagesThisWeekRows[0]?.count ?? 0);
  const conversionRate =
    conversations.length > 0
      ? Math.round((leads.length / conversations.length) * 100) / 100
      : 0;

  res.json({
    totalAssistants: assistants.length,
    totalConversations: conversations.length,
    totalMessages,
    totalLeads: leads.length,
    totalAppointments: appointments.length,
    messagesThisWeek,
    leadsThisWeek,
    appointmentsThisWeek,
    conversionRate,
  });
});

export default router;
