import { api } from "../lib/api";
import { buildQueryParams } from "../lib/query";

export type SupportQuery = {
  id: string;
  createdAt: string;
  phone?: string | null;
  maskedPhone?: string | null;
  orderCode?: string | null;
  intent?: string | null;
  status?: string | null;
  responseSnippet?: string | null;
  correlationId?: string | null;
};

export type SupportQueryResponse = {
  items: SupportQuery[];
  total: number;
  page: number;
  pageSize: number;
};

function normalizeSupportQuery(row: any): SupportQuery {
  return {
    id: String(row?.id ?? row?._id ?? row?.correlationId ?? row?.traceId ?? ""),
    createdAt: row?.createdAt ?? row?.created_at ?? row?.timestamp ?? new Date().toISOString(),
    phone: row?.phone ?? row?.masked_phone ?? row?.maskedPhone ?? null,
    maskedPhone: row?.masked_phone ?? row?.maskedPhone ?? null,
    orderCode: row?.orderCode ?? row?.order_code ?? row?.order?.code ?? null,
    intent: row?.intent ?? row?.intentName ?? row?.topic ?? null,
    status: row?.status ?? row?.state ?? null,
    responseSnippet: row?.responseSnippet ?? row?.response_snippet ?? row?.responsePreview ?? row?.response ?? null,
    correlationId: row?.correlationId ?? row?.correlation_id ?? null,
  };
}

export async function fetchSupportQueries(params: {
  page?: number;
  pageSize?: number;
  phone?: string;
  code?: string;
  intent?: string;
  status?: string;
}) {
  const query = buildQueryParams(params);
  const { data } = await api.get<SupportQueryResponse & { items: any[] }>("/api/v1/admin/support/queries", { params: query });
  const items = Array.isArray((data as any)?.items) ? (data as any).items.map((row: any) => normalizeSupportQuery(row)) : [];
  return { ...(data as any), items };
}

export async function fetchSupportQuery(id: string) {
  const { data } = await api.get<SupportQuery>(`/api/v1/admin/support/queries/${id}`);
  return data;
}
