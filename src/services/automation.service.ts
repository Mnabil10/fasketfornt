import { api } from "../lib/api";
import { buildQueryParams } from "../lib/query";

export type AutomationStatus = "PENDING" | "SENT" | "FAILED" | "DEAD";

export type AutomationEvent = {
  id: string;
  createdAt: string;
  type: string;
  status: AutomationStatus | string;
  attempts: number;
  lastHttpStatus?: number | null;
  lastErrorSnippet?: string | null;
  lastResponseSnippet?: string | null;
  correlationId?: string | null;
  dedupeKey?: string | null;
  orderCode?: string | null;
  phone?: string | null;
};

export type AutomationEventResponse = {
  items: AutomationEvent[];
  total: number;
  page: number;
  pageSize: number;
  counts?: Partial<Record<AutomationStatus | string, number>>;
};

export type AutomationQuery = {
  page?: number;
  pageSize?: number;
  status?: AutomationStatus | string;
  type?: string;
  from?: string;
  to?: string;
  q?: string;
};

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeAutomationEvent(event: any): AutomationEvent {
  const status = typeof event?.status === "string" ? event.status.toUpperCase() : event?.status;
  return {
    id: String(event?.id ?? event?.dedupeKey ?? event?.correlationId ?? ""),
    createdAt: event?.createdAt ?? event?.sentAt ?? new Date().toISOString(),
    type: event?.type ?? event?.eventType ?? "unknown",
    status: (status as AutomationStatus | string) ?? "PENDING",
    attempts: toNumber(event?.attempts ?? event?.retryCount),
    lastHttpStatus: event?.lastHttpStatus ?? event?.responseStatus ?? null,
    lastErrorSnippet: event?.lastErrorSnippet ?? event?.lastError ?? null,
    lastResponseSnippet: event?.lastResponseSnippet ?? event?.lastResponseBodySnippet ?? null,
    correlationId: event?.correlationId ?? event?.correlation ?? event?.traceId ?? null,
    dedupeKey: event?.dedupeKey ?? event?.reference ?? null,
    orderCode: event?.orderCode ?? event?.payload?.orderCode ?? null,
    phone: event?.phone ?? event?.payload?.phone ?? null,
  };
}

function normalizeCounts(source: any) {
  const aggregates = source?.counts ?? source?.aggregates ?? source ?? {};
  return {
    PENDING: toNumber(aggregates.PENDING ?? aggregates.pendingCount),
    FAILED: toNumber(aggregates.FAILED ?? aggregates.failedCount),
    DEAD: toNumber(aggregates.DEAD ?? aggregates.deadCount),
    SENT: toNumber(aggregates.SENT ?? aggregates.sentCount),
  } as Partial<Record<AutomationStatus | string, number>>;
}

export async function fetchAutomationEvents(params?: AutomationQuery) {
  const query = buildQueryParams(params);
  const { data } = await api.get<AutomationEventResponse & { aggregates?: unknown; counts?: unknown }>(
    "/api/v1/admin/automation/events",
    {
      params: query,
    }
  );

  const items = Array.isArray((data as any)?.items) ? (data as any).items.map((item: any) => normalizeAutomationEvent(item)) : [];
  return {
    ...(data as any),
    items,
    counts: normalizeCounts((data as any)?.counts ?? (data as any)?.aggregates),
  };
}

export async function replayAutomation(payload: { status?: AutomationStatus | string; from?: string; to?: string; limit?: number }) {
  const { data } = await api.post<{ success: true; replayed: number }>("/api/v1/admin/automation/replay", payload);
  return data;
}

export async function replayAutomationEvent(id: string) {
  const { data } = await api.post<{ success: true; id: string }>(`/api/v1/admin/automation/events/${id}/replay`, {});
  return data;
}
