import { useQuery, useMutation } from "@tanstack/react-query";
import type { UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
import { customFetch } from "../custom-fetch";
import type {
  Assistant,
  CreateAssistantBody,
  UpdateAssistantBody,
  DashboardStats,
  Lead,
  Conversation,
  Appointment,
  Subscription,
} from "./api.schemas";

// ─── Query Keys ──────────────────────────────────────────────────────────────

export function getListAssistantsQueryKey() {
  return ["/api/assistants"] as const;
}

export function getGetAssistantQueryKey(id: number) {
  return ["/api/assistants", id] as const;
}

export function getGetDashboardStatsQueryKey() {
  return ["/api/dashboard/stats"] as const;
}

export function getListLeadsQueryKey(assistantId: number) {
  return ["/api/assistants", assistantId, "leads"] as const;
}

export function getListConversationsQueryKey(assistantId: number) {
  return ["/api/assistants", assistantId, "conversations"] as const;
}

export function getListAppointmentsQueryKey(assistantId: number) {
  return ["/api/assistants", assistantId, "appointments"] as const;
}

export function getGetSubscriptionQueryKey() {
  return ["/api/subscription"] as const;
}

// ─── Query Hooks ─────────────────────────────────────────────────────────────

export function useListAssistants(options?: {
  query?: Partial<UseQueryOptions<Assistant[]>>;
}) {
  return useQuery<Assistant[]>({
    queryKey: getListAssistantsQueryKey(),
    queryFn: () => customFetch<Assistant[]>("/api/assistants"),
    ...options?.query,
  });
}

export function useGetAssistant(id: number, options?: {
  query?: Partial<UseQueryOptions<Assistant>>;
}) {
  return useQuery<Assistant>({
    queryKey: getGetAssistantQueryKey(id),
    queryFn: () => customFetch<Assistant>(`/api/assistants/${id}`),
    ...options?.query,
  });
}

export function useGetDashboardStats(options?: {
  query?: Partial<UseQueryOptions<DashboardStats>>;
}) {
  return useQuery<DashboardStats>({
    queryKey: getGetDashboardStatsQueryKey(),
    queryFn: () => customFetch<DashboardStats>("/api/dashboard/stats"),
    ...options?.query,
  });
}

export function useListLeads(assistantId: number, options?: {
  query?: Partial<UseQueryOptions<Lead[]>>;
}) {
  return useQuery<Lead[]>({
    queryKey: getListLeadsQueryKey(assistantId),
    queryFn: () => customFetch<Lead[]>(`/api/assistants/${assistantId}/leads`),
    ...options?.query,
  });
}

export function useListConversations(assistantId: number, options?: {
  query?: Partial<UseQueryOptions<Conversation[]>>;
}) {
  return useQuery<Conversation[]>({
    queryKey: getListConversationsQueryKey(assistantId),
    queryFn: () => customFetch<Conversation[]>(`/api/assistants/${assistantId}/conversations`),
    ...options?.query,
  });
}

export function useListAppointments(assistantId: number, options?: {
  query?: Partial<UseQueryOptions<Appointment[]>>;
}) {
  return useQuery<Appointment[]>({
    queryKey: getListAppointmentsQueryKey(assistantId),
    queryFn: () => customFetch<Appointment[]>(`/api/assistants/${assistantId}/appointments`),
    ...options?.query,
  });
}

export function useGetSubscription(options?: {
  query?: Partial<UseQueryOptions<Subscription>>;
}) {
  return useQuery<Subscription>({
    queryKey: getGetSubscriptionQueryKey(),
    queryFn: () => customFetch<Subscription>("/api/subscription"),
    ...options?.query,
  });
}

// ─── Mutation Hooks ──────────────────────────────────────────────────────────

export function useCreateAssistant(options?: {
  mutation?: UseMutationOptions<Assistant, unknown, { data: CreateAssistantBody }>;
}) {
  return useMutation<Assistant, unknown, { data: CreateAssistantBody }>({
    mutationFn: ({ data }) =>
      customFetch<Assistant>("/api/assistants", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }),
    ...options?.mutation,
  });
}

export function useUpdateAssistant(options?: {
  mutation?: UseMutationOptions<Assistant, unknown, { id: number; data: UpdateAssistantBody }>;
}) {
  return useMutation<Assistant, unknown, { id: number; data: UpdateAssistantBody }>({
    mutationFn: ({ id, data }) =>
      customFetch<Assistant>(`/api/assistants/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }),
    ...options?.mutation,
  });
}
