import { api } from "../lib/api";
import { buildQueryParams } from "../lib/query";
import type {
  ProviderApplication,
  ProviderApplicationApprovalInput,
  ProviderApplicationFilters,
  ProviderApplicationListResponse,
  ProviderApplicationRejectionInput,
} from "../types/provider-application";

const BASE = "/api/v1/admin/provider-applications";

export async function listProviderApplications(filters?: ProviderApplicationFilters) {
  const params = buildQueryParams(filters);
  const { data } = await api.get<ProviderApplicationListResponse>(BASE, { params });
  return data;
}

export async function getProviderApplication(id: string) {
  const { data } = await api.get<ProviderApplication>(`${BASE}/${id}`);
  return data;
}

export async function approveProviderApplication(id: string, payload: ProviderApplicationApprovalInput) {
  const { data } = await api.post(`${BASE}/${id}/approve`, payload);
  return data;
}

export async function rejectProviderApplication(id: string, payload: ProviderApplicationRejectionInput) {
  const { data } = await api.post(`${BASE}/${id}/reject`, payload);
  return data;
}
