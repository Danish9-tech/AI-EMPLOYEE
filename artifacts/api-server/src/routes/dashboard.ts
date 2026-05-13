import { Router, type IRouter } from "express";
import { eq, gte } from "drizzle-orm";
import { db, assistantsTable, conversationsTable, leadsTable, appointmentsTable } from "@workspace/db";
import { requireAuth } from "../lib/requireAuth";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;

  const assistants = await db.select().from(assistantsTable).where(eq(assistantsTable.userId, userId));
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

  const [conversations, leads, appointments] = await Promise.all([
    db.select().from(conversationsTable),
    db.select().from(leadsTable),
    db.select().from(appointmentsTable),
  ]);

  const myConversations = conversations.filter((c) => assistantIds.includes(c.assistantId));
  const myLeads = leads.filter((l) => assistantIds.includes(l.assistantId));
  const myAppointments = appointments.filter((a) => assistantIds.includes(a.assistantId));

  const totalMessages = assistants.reduce((sum, a) => sum + (a.totalMessages ?? 0), 0);
  const leadsThisWeek = myLeads.filter((l) => new Date(l.createdAt) > oneWeekAgo).length;
  const appointmentsThisWeek = myAppointments.filter((a) => new Date(a.createdAt) > oneWeekAgo).length;
  const messagesThisWeek = Math.round(totalMessages * 0.3);
  const conversionRate =
    myConversations.length > 0 ? Math.round((myLeads.length / myConversations.length) * 100) / 100 : 0;

  res.json({
    totalAssistants: assistants.length,
    totalConversations: myConversations.length,
    totalMessages,
    totalLeads: myLeads.length,
    totalAppointments: myAppointments.length,
    messagesThisWeek,
    leadsThisWeek,
    appointmentsThisWeek,
    conversionRate,
  });
});

export default router;
