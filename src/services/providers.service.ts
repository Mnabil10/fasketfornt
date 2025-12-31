import { api } from "../lib/api";
import { buildQueryParams } from "../lib/query";
import type { Provider, ProviderFilters, ProviderListResponse, ProviderUpsertInput } from "../types/provider";

const BASE = "/api/v1/admin/providers";

export async function listProviders(filters?: ProviderFilters) {
  const params = buildQueryParams(filters);
  const { data } = await api.get<ProviderListResponse>(BASE, { params });
  return data;
}

export async function getProvider(id: string) {
  const { data } = await api.get<Provider>(`${BASE}/${id}`);
  return data;
}

export async function createProvider(payload: ProviderUpsertInput) {
  const { data } = await api.post<Provider>(BASE, payload);
  return data;
}

export async function updateProvider(id: string, payload: ProviderUpsertInput) {
  const { data } = await api.patch<Provider>(`${BASE}/${id}`, payload);
  return data;
}
