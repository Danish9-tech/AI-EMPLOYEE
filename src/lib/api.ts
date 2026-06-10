import { supabase } from "./supabase";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(path, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string> || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  getDashboardStats: () => apiFetch<any>("/api/dashboard/stats"),

  // Profile
  getProfile: () => apiFetch<any>("/api/profile"),
  updateProfile: (data: any) => apiFetch<any>("/api/profile", { method: "PATCH", body: JSON.stringify(data) }),

  // Assistants
  listAssistants: () => apiFetch<any[]>("/api/assistants"),
  getAssistant: (id: string | number) => apiFetch<any>(`/api/assistants/${id}`),
  createAssistant: (data: any) =>
    apiFetch<any>("/api/assistants", { method: "POST", body: JSON.stringify(data) }),
  updateAssistant: (id: string | number, data: any) =>
    apiFetch<any>(`/api/assistants/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  // Assistant Knowledge
  listAssistantKnowledge: (assistantId: string | number) =>
    apiFetch<any[]>(`/api/assistants/${assistantId}/knowledge`),
  createAssistantKnowledge: (assistantId: string | number, data: any) =>
    apiFetch<any>(`/api/assistants/${assistantId}/knowledge`, { method: "POST", body: JSON.stringify(data) }),
  deleteKnowledge: (id: number) =>
    apiFetch<void>(`/api/knowledge/${id}`, { method: "DELETE" }),

  // Conversations
  listConversations: (assistantId?: string | number) =>
    apiFetch<any[]>(assistantId ? `/api/conversations?assistantId=${assistantId}` : "/api/conversations"),
  getConversation: (id: string | number) => apiFetch<any>(`/api/conversations/${id}`),
  createConversation: (data: any) =>
    apiFetch<any>("/api/conversations", { method: "POST", body: JSON.stringify(data) }),
  listMessages: (conversationId: string | number) =>
    apiFetch<any[]>(`/api/conversations/${conversationId}/messages`),
  setConversationMode: (id: string | number, mode: 'ai' | 'human') =>
    apiFetch<any>(`/api/conversations/${id}/mode`, { method: "PATCH", body: JSON.stringify({ mode }) }),
  sendOwnerReply: (id: string | number, message: string) =>
    apiFetch<any>(`/api/conversations/${id}/reply`, { method: "POST", body: JSON.stringify({ message }) }),

  // Leads
  listLeads: (assistantId?: string | number) =>
    apiFetch<any[]>(assistantId ? `/api/leads?assistantId=${assistantId}` : "/api/leads"),
  createLead: (data: any) => apiFetch<any>("/api/leads", { method: "POST", body: JSON.stringify(data) }),

  // Appointments
  listAppointments: (assistantId?: string | number) =>
    apiFetch<any[]>(assistantId ? `/api/appointments?assistantId=${assistantId}` : "/api/appointments"),

  // Subscriptions
  getSubscription: () => apiFetch<any>("/api/subscriptions"),

  // Knowledge
  listKnowledge: () => apiFetch<any[]>("/api/knowledge"),
  createKnowledge: (data: any) =>
    apiFetch<any>("/api/knowledge", { method: "POST", body: JSON.stringify(data) }),
  uploadKnowledge: (data: { assistantId: string | number; fileName: string; fileData: string; fileType: string }) =>
    apiFetch<any>("/api/knowledge/upload", { method: "POST", body: JSON.stringify(data) }),
  crawlKnowledge: (data: { assistantId: string | number; url: string }) =>
    apiFetch<any>("/api/knowledge/crawl", { method: "POST", body: JSON.stringify(data) }),

  // Marketplace
  listMarketplaceTemplates: () => apiFetch<any[]>("/api/marketplace"),
  installMarketplaceTemplate: (templateId: number) =>
    apiFetch<any>("/api/marketplace/install", { method: "POST", body: JSON.stringify({ templateId }) }),
  publishMarketplaceTemplate: (data: any) =>
    apiFetch<any>("/api/marketplace/publish", { method: "POST", body: JSON.stringify(data) }),
  createMarketplaceTemplate: (data: any) =>
    apiFetch<any>("/api/marketplace/create", { method: "POST", body: JSON.stringify(data) }),
  deleteMarketplaceTemplate: (templateId: number) =>
    apiFetch<void>(`/api/marketplace/${templateId}`, { method: "DELETE" }),

  // Referral Clicks
  listReferralClicks: () => apiFetch<any[]>("/api/referral_clicks"),
  createReferralClick: (data: any) =>
    apiFetch<any>("/api/referral_clicks", { method: "POST", body: JSON.stringify(data) }),

  // Reports
  getWeeklyReport: () => apiFetch<any>("/api/reports/weekly"),

  getHealth: () => apiFetch<{ status: string }>("/api/healthz"),
};
