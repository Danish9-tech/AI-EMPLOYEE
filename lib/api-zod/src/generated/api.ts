import { z } from "zod";

// Health
export const HealthCheckResponse = z.object({
  status: z.string(),
});
export type HealthCheckResponseType = z.infer<typeof HealthCheckResponse>;

// Assistant
export const CreateAssistantBody = z.object({
  name: z.string(),
  businessName: z.string(),
  description: z.string(),
  tone: z.enum(["professional", "friendly", "formal", "casual"]).optional(),
  widgetColor: z.string().optional(),
});
export type CreateAssistantBodyType = z.infer<typeof CreateAssistantBody>;

export const UpdateAssistantBody = z.object({
  name: z.string().optional(),
  businessName: z.string().optional(),
  description: z.string().optional(),
  tone: z.enum(["professional", "friendly", "formal", "casual"]).optional(),
  widgetColor: z.string().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateAssistantBodyType = z.infer<typeof UpdateAssistantBody>;

export const GetAssistantParams = z.object({
  assistantId: z.string(),
});
export type GetAssistantParamsType = z.infer<typeof GetAssistantParams>;

export const UpdateAssistantParams = z.object({
  assistantId: z.string(),
});
export type UpdateAssistantParamsType = z.infer<typeof UpdateAssistantParams>;

export const DeleteAssistantParams = z.object({
  assistantId: z.string(),
});
export type DeleteAssistantParamsType = z.infer<typeof DeleteAssistantParams>;

// Knowledge
export const CreateKnowledgeBody = z.object({
  type: z.enum(["text", "url", "pdf"]),
  title: z.string(),
  content: z.string(),
  sourceUrl: z.string().optional(),
});
export type CreateKnowledgeBodyType = z.infer<typeof CreateKnowledgeBody>;

export const DeleteKnowledgeParams = z.object({
  assistantId: z.string(),
  knowledgeId: z.string(),
});
export type DeleteKnowledgeParamsType = z.infer<typeof DeleteKnowledgeParams>;

// Chat
export const SendChatMessageBody = z.object({
  assistantId: z.number().int(),
  sessionId: z.string(),
  message: z.string(),
});
export type SendChatMessageBodyType = z.infer<typeof SendChatMessageBody>;

// Lead
export const CreateLeadBody = z.object({
  assistantId: z.number().int(),
  conversationId: z.number().int().optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});
export type CreateLeadBodyType = z.infer<typeof CreateLeadBody>;

export const UpdateLeadBody = z.object({
  status: z.enum(["new", "contacted", "qualified", "converted", "lost"]).optional(),
  notes: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});
export type UpdateLeadBodyType = z.infer<typeof UpdateLeadBody>;

export const UpdateLeadParams = z.object({
  leadId: z.string(),
});
export type UpdateLeadParamsType = z.infer<typeof UpdateLeadParams>;

// Appointment
export const CreateAppointmentBody = z.object({
  assistantId: z.number().int(),
  conversationId: z.number().int().optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  scheduledAt: z.string().datetime(),
  service: z.string().optional(),
  notes: z.string().optional(),
});
export type CreateAppointmentBodyType = z.infer<typeof CreateAppointmentBody>;

export const UpdateAppointmentBody = z.object({
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]).optional(),
  scheduledAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});
export type UpdateAppointmentBodyType = z.infer<typeof UpdateAppointmentBody>;

export const UpdateAppointmentParams = z.object({
  appointmentId: z.string(),
});
export type UpdateAppointmentParamsType = z.infer<typeof UpdateAppointmentParams>;

// Subscription
export const UpdateSubscriptionBody = z.object({
  plan: z.enum(["free", "pro", "enterprise"]),
});
export type UpdateSubscriptionBodyType = z.infer<typeof UpdateSubscriptionBody>;
