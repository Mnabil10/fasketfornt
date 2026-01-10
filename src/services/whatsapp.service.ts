import { api } from "../lib/api";
import { buildQueryParams } from "../lib/query";

export type WhatsappConversationStatus = "OPEN" | "CLOSED" | (string & {});
export type WhatsappMessageDirection = "INBOUND" | "OUTBOUND" | (string & {});
export type WhatsappMessageType = "TEXT" | "TEMPLATE" | "DOCUMENT" | "IMAGE" | "VIDEO" | (string & {});
export type WhatsappLogStatus = "QUEUED" | "SENT" | "DELIVERED" | "READ" | "FAILED" | (string & {});

export type WhatsappConversation = {
  id: string;
  status: WhatsappConversationStatus;
  phone?: string | null;
  maskedPhone?: string | null;
  displayName?: string | null;
  entityType?: string | null;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  assignedToId?: string | null;
  userId?: string | null;
  metadata?: Record<string, any> | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type WhatsappMessage = {
  id: string;
  conversationId: string;
  direction: WhatsappMessageDirection;
  messageType: WhatsappMessageType;
  body?: string | null;
  createdAt: string;
  status?: WhatsappLogStatus | string | null;
  agentId?: string | null;
  metadata?: Record<string, any> | null;
  externalId?: string | null;
};

export type WhatsappRelatedEntity = {
  type: "order" | "user" | "provider" | "support" | "unknown";
  id?: string | null;
  label: string;
};

export type WhatsappLog = {
  id: string;
  createdAt: string;
  direction: WhatsappMessageDirection;
  status: WhatsappLogStatus | string;
  phone?: string | null;
  maskedPhone?: string | null;
  templateName?: string | null;
  messageType?: WhatsappMessageType | string | null;
  body?: string | null;
  errorMessage?: string | null;
  errorCode?: string | null;
  relatedEntity?: WhatsappRelatedEntity | null;
  supportConversationId?: string | null;
  supportMessageId?: string | null;
  canResend?: boolean;
  resendAfterSeconds?: number | null;
  metadata?: Record<string, any> | null;
};

export type WhatsappConversationsResponse = {
  items: WhatsappConversation[];
  total: number;
  page: number;
  pageSize: number;
};

export type WhatsappMessagesResponse = {
  items: WhatsappMessage[];
  total: number;
  page: number;
  pageSize: number;
};

export type WhatsappLogsResponse = {
  items: WhatsappLog[];
  total: number;
  page: number;
  pageSize: number;
};

export type WhatsappConversationQuery = {
  page?: number;
  pageSize?: number;
  status?: WhatsappConversationStatus;
  search?: string;
  assignedToId?: string;
};

export type WhatsappMessagesQuery = {
  page?: number;
  pageSize?: number;
};

export type WhatsappLogsQuery = {
  page?: number;
  pageSize?: number;
  status?: WhatsappLogStatus | string;
  template?: string;
  order?: string;
  phone?: string;
  from?: string;
  to?: string;
  direction?: WhatsappMessageDirection | string;
  supportConversationId?: string;
  supportMessageId?: string;
};

export type WhatsappReplyPayload =
  | { type: "TEXT"; text: string }
  | {
      type: "TEMPLATE";
      templateName: string;
      language?: string;
      variables?: Record<string, string | number | null | undefined>;
    };

const toString = (value: unknown) => (value === null || value === undefined ? undefined : String(value));
const toUpper = (value: unknown) => (typeof value === "string" ? value.toUpperCase() : value);

function resolveConversationName(row: any) {
  const metadata = row?.metadata ?? row?.meta ?? null;
  return (
    row?.displayName ??
    row?.name ??
    row?.fullName ??
    row?.user?.name ??
    row?.customer?.name ??
    row?.provider?.name ??
    metadata?.displayName ??
    metadata?.name ??
    metadata?.userName ??
    metadata?.customerName ??
    metadata?.providerName ??
    null
  );
}

function resolveConversationEntityType(row: any) {
  const metadata = row?.metadata ?? row?.meta ?? null;
  return (
    row?.entityType ??
    row?.entity ??
    metadata?.entityType ??
    metadata?.role ??
    metadata?.entity ??
    null
  );
}

function normalizeConversation(row: any): WhatsappConversation {
  return {
    id: String(row?.id ?? row?._id ?? row?.conversationId ?? row?.phone ?? ""),
    status: (toUpper(row?.status ?? row?.state ?? "OPEN") as WhatsappConversationStatus) ?? "OPEN",
    phone: row?.phone ?? row?.toPhone ?? row?.fromPhone ?? row?.phoneNumber ?? null,
    maskedPhone: row?.maskedPhone ?? row?.masked_phone ?? null,
    displayName: resolveConversationName(row),
    entityType: resolveConversationEntityType(row),
    lastMessageAt: row?.lastMessageAt ?? row?.last_message_at ?? row?.updatedAt ?? null,
    lastMessagePreview: row?.lastMessagePreview ?? row?.last_message_preview ?? row?.lastMessage ?? null,
    assignedToId: row?.assignedToId ?? row?.assigned_to_id ?? null,
    userId: row?.userId ?? row?.user_id ?? null,
    metadata: row?.metadata ?? row?.meta ?? null,
    createdAt: row?.createdAt ?? row?.created_at ?? null,
    updatedAt: row?.updatedAt ?? row?.updated_at ?? null,
  };
}

function resolveMessageStatus(row: any) {
  return (
    row?.status ??
    row?.deliveryStatus ??
    row?.messageStatus ??
    row?.metadata?.status ??
    row?.metadata?.deliveryStatus ??
    row?.metadata?.whatsappStatus ??
    null
  );
}

function normalizeMessage(row: any): WhatsappMessage {
  return {
    id: String(row?.id ?? row?._id ?? row?.messageId ?? row?.externalId ?? ""),
    conversationId: String(row?.conversationId ?? row?.conversation_id ?? row?.supportConversationId ?? ""),
    direction: (toUpper(row?.direction ?? row?.dir ?? "INBOUND") as WhatsappMessageDirection) ?? "INBOUND",
    messageType: (toUpper(row?.messageType ?? row?.type ?? "TEXT") as WhatsappMessageType) ?? "TEXT",
    body: row?.body ?? row?.text ?? row?.message ?? row?.payload?.text ?? null,
    createdAt: row?.createdAt ?? row?.created_at ?? row?.timestamp ?? new Date().toISOString(),
    status: toUpper(resolveMessageStatus(row)) as WhatsappLogStatus | string | null,
    agentId: row?.agentId ?? row?.agent_id ?? null,
    metadata: row?.metadata ?? row?.meta ?? null,
    externalId: row?.externalId ?? row?.external_id ?? null,
  };
}

function resolveRelatedEntity(row: any): WhatsappRelatedEntity | null {
  const explicitType = row?.relatedEntityType ?? row?.related_entity_type;
  if (explicitType) {
    const explicitId = row?.relatedEntityId ?? row?.related_entity_id ?? null;
    const type = String(explicitType).toLowerCase();
    if (type === "order") return { type: "order", id: explicitId, label: `Order ${explicitId ?? ""}`.trim() };
    if (type === "support") return { type: "support", id: explicitId, label: `Support ${explicitId ?? ""}`.trim() };
    if (type === "user") return { type: "user", id: explicitId, label: `User ${explicitId ?? ""}`.trim() };
    if (type === "provider") return { type: "provider", id: explicitId, label: `Provider ${explicitId ?? ""}`.trim() };
    return { type: "unknown", id: explicitId, label: `Related ${explicitId ?? ""}`.trim() };
  }
  const payload = row?.payload ?? {};
  const metadata = row?.metadata ?? payload?.metadata ?? payload ?? {};
  const orderCode =
    row?.orderCode ??
    payload?.orderCode ??
    payload?.order?.code ??
    metadata?.orderCode ??
    metadata?.order?.code ??
    null;
  if (orderCode) {
    return { type: "order", id: String(orderCode), label: `Order #${orderCode}` };
  }
  const orderId = row?.orderId ?? payload?.orderId ?? metadata?.orderId ?? null;
  if (orderId) {
    return { type: "order", id: String(orderId), label: `Order ${orderId}` };
  }
  const userId = row?.userId ?? payload?.userId ?? metadata?.userId ?? null;
  if (userId) {
    return { type: "user", id: String(userId), label: `User ${userId}` };
  }
  const providerId = row?.providerId ?? payload?.providerId ?? metadata?.providerId ?? null;
  if (providerId) {
    return { type: "provider", id: String(providerId), label: `Provider ${providerId}` };
  }
  const supportConversationId =
    row?.supportConversationId ?? payload?.supportConversationId ?? metadata?.supportConversationId ?? null;
  if (supportConversationId) {
    return { type: "support", id: String(supportConversationId), label: `Support ${supportConversationId}` };
  }
  return null;
}

function normalizeLog(row: any): WhatsappLog {
  const direction = toUpper(row?.direction ?? row?.dir ?? row?.messageDirection ?? "OUTBOUND") as WhatsappMessageDirection;
  const templateName =
    row?.templateName ??
    row?.template ??
    row?.template_name ??
    row?.payload?.template?.name ??
    row?.payload?.templateName ??
    null;
  const messageType = toUpper(row?.type ?? row?.messageType ?? row?.payload?.type ?? "TEXT") as WhatsappMessageType;
  const phone = row?.phone ?? (direction === "INBOUND" ? row?.fromPhone : row?.toPhone) ?? row?.toPhone ?? row?.fromPhone ?? null;
  const status = toUpper(row?.status ?? row?.state ?? row?.deliveryStatus ?? "QUEUED") as WhatsappLogStatus | string;
  return {
    id: String(row?.id ?? row?._id ?? row?.logId ?? row?.messageId ?? ""),
    createdAt: row?.createdAt ?? row?.created_at ?? row?.sentAt ?? new Date().toISOString(),
    direction: (direction as WhatsappMessageDirection) ?? "OUTBOUND",
    status: status ?? "QUEUED",
    phone,
    maskedPhone: row?.maskedPhone ?? row?.masked_phone ?? null,
    templateName,
    messageType,
    body: row?.body ?? row?.payload?.text ?? row?.payload?.message ?? null,
    errorMessage: row?.errorMessage ?? row?.error ?? row?.errorReason ?? row?.failureReason ?? null,
    errorCode: row?.errorCode ?? row?.error_code ?? null,
    relatedEntity: resolveRelatedEntity(row),
    supportConversationId: row?.supportConversationId ?? row?.support_conversation_id ?? null,
    supportMessageId: row?.supportMessageId ?? row?.support_message_id ?? null,
    canResend: Boolean(row?.canResend ?? row?.resendable ?? row?.allowResend ?? row?.canReplay),
    resendAfterSeconds: row?.resendAfterSeconds ?? row?.resend_after_seconds ?? null,
    metadata: row?.metadata ?? row?.payload?.metadata ?? null,
  };
}

export async function fetchWhatsappConversations(params?: WhatsappConversationQuery) {
  const query = buildQueryParams(params);
  const { data } = await api.get<WhatsappConversationsResponse & { items: any[] }>(
    "/api/v1/admin/support/whatsapp/conversations",
    { params: query }
  );
  const items = Array.isArray((data as any)?.items) ? (data as any).items.map((row: any) => normalizeConversation(row)) : [];
  return { ...(data as any), items };
}

export async function fetchWhatsappMessages(conversationId: string, params?: WhatsappMessagesQuery) {
  const query = buildQueryParams(params);
  const { data } = await api.get<WhatsappMessagesResponse & { items: any[] }>(
    `/api/v1/admin/support/whatsapp/conversations/${conversationId}/messages`,
    { params: query }
  );
  const items = Array.isArray((data as any)?.items) ? (data as any).items.map((row: any) => normalizeMessage(row)) : [];
  return { ...(data as any), items };
}

export async function sendWhatsappReply(conversationId: string, payload: WhatsappReplyPayload) {
  const { data } = await api.post<{ success?: boolean; messageId?: string }>(
    `/api/v1/admin/support/whatsapp/conversations/${conversationId}/reply`,
    payload
  );
  return data;
}

export async function fetchWhatsappLogs(params?: WhatsappLogsQuery) {
  const query = buildQueryParams(params);
  const { data } = await api.get<WhatsappLogsResponse & { items: any[] }>(
    "/api/v1/admin/whatsapp/logs",
    { params: query }
  );
  const items = Array.isArray((data as any)?.items) ? (data as any).items.map((row: any) => normalizeLog(row)) : [];
  return { ...(data as any), items };
}

export async function resendWhatsappLog(logId: string) {
  const { data } = await api.post<{ success?: boolean; id?: string }>(`/api/v1/admin/whatsapp/logs/${logId}/resend`, {});
  return data;
}

export function formatWhatsappStatus(value?: string | null) {
  const normalized = toUpper(value);
  if (!normalized) return null;
  return normalized.replace(/_/g, " ");
}

export function toWhatsappTemplateName(value?: string | null) {
  const trimmed = toString(value)?.trim();
  return trimmed ? trimmed : null;
}
