import { api } from "../lib/api";
import { buildQueryParams } from "../lib/query";

export type SupportQuery = {
  id: string;
  createdAt: string;
  phone?: string | null;
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

export async function fetchSupportQueries(params: {
  page?: number;
  pageSize?: number;
  phone?: string;
  code?: string;
  intent?: string;
  status?: string;
}) {
  const query = buildQueryParams(params);
  const { data } = await api.get<SupportQueryResponse>("/api/v1/admin/support/queries", { params: query });
  return data;
}

export async function fetchSupportQuery(id: string) {
  const { data } = await api.get<SupportQuery>(`/api/v1/admin/support/queries/${id}`);
  return data;
}
