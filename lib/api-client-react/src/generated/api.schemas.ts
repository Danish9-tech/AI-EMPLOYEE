export interface Assistant {
  id: number;
  userId: string;
  name: string;
  businessName: string;
  description: string;
  tone: string;
  widgetColor: string;
  isActive: boolean;
  totalMessages: number;
  totalLeads: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssistantBody {
  name: string;
  businessName: string;
  description: string;
  tone?: string;
  widgetColor?: string;
}

export interface UpdateAssistantBody {
  name?: string;
  businessName?: string;
  description?: string;
  tone?: string;
  widgetColor?: string;
  isActive?: boolean;
}

export interface KnowledgeItem {
  id: number;
  assistantId: number;
  type: string;
  title: string;
  content: string;
  sourceUrl?: string | null;
  createdAt: string;
}

export interface Conversation {
  id: number;
  assistantId: number;
  sessionId: string | null;
  visitorName?: string | null;
  visitorEmail?: string | null;
  messageCount: number;
  channel: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  createdAt: string;
}

export interface Lead {
  id: number;
  assistantId: number;
  conversationId?: number | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  status: string;
  notes?: string | null;
  createdAt: string;
}

export interface Appointment {
  id: number;
  assistantId: number;
  conversationId?: number | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  scheduledAt: string;
  service?: string | null;
  notes?: string | null;
  status: string;
  createdAt: string;
}

export interface DashboardStats {
  totalAssistants: number;
  totalConversations: number;
  totalMessages: number;
  totalLeads: number;
  totalAppointments: number;
  messagesThisWeek: number;
  leadsThisWeek: number;
  appointmentsThisWeek: number;
  conversionRate: number;
}

export interface Subscription {
  id: number;
  userId: string;
  plan: string;
  messagesUsed: number;
  messagesLimit: number;
  assistantsLimit: number;
  leadsLimit: number;
  features: string[];
  renewsAt?: string | null;
  createdAt: string;
}

export interface UpdateSubscriptionBody {
  plan: string;
}
