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

  listAssistants: () => apiFetch<any[]>("/api/assistants"),
  getAssistant: (id: number) => apiFetch<any>(`/api/assistants/${id}`),
  createAssistant: (data: any) =>
    apiFetch<any>("/api/assistants", { method: "POST", body: JSON.stringify(data) }),
  updateAssistant: (id: number, data: any) =>
    apiFetch<any>(`/api/assistants/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  listConversations: (assistantId: number) =>
    apiFetch<any[]>(`/api/conversations?assistantId=${assistantId}`),
  createConversation: (data: any) =>
    apiFetch<any>("/api/conversations", { method: "POST", body: JSON.stringify(data) }),

  listLeads: (assistantId: number) =>
    apiFetch<any[]>(`/api/leads?assistantId=${assistantId}`),
  createLead: (data: any) =>
    apiFetch<any>("/api/leads", { method: "POST", body: JSON.stringify(data) }),

  listAppointments: (assistantId: number) =>
    apiFetch<any[]>(`/api/appointments?assistantId=${assistantId}`),

  getSubscription: () => apiFetch<any>("/api/subscriptions"),

  listKnowledge: () => apiFetch<any[]>("/api/knowledge"),
  createKnowledge: (data: any) =>
    apiFetch<any>("/api/knowledge", { method: "POST", body: JSON.stringify(data) }),

  getHealth: () => apiFetch<{ status: string }>("/api/healthz"),
};
