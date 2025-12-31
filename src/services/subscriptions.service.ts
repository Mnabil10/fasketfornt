import { api } from "../lib/api";
import { buildQueryParams } from "../lib/query";
import type {
  ProviderSubscription,
  SubscriptionFilters,
  SubscriptionListResponse,
  SubscriptionUpsertInput,
} from "../types/subscription";

const BASE = "/api/v1/admin/subscriptions";

export async function listSubscriptions(filters?: SubscriptionFilters) {
  const params = buildQueryParams(filters);
  const { data } = await api.get<SubscriptionListResponse>(BASE, { params });
  return data;
}

export async function getSubscription(id: string) {
  const { data } = await api.get<ProviderSubscription>(`${BASE}/${id}`);
  return data;
}

export async function createSubscription(payload: SubscriptionUpsertInput) {
  const { data } = await api.post<ProviderSubscription>(BASE, payload);
  return data;
}

export async function updateSubscription(id: string, payload: SubscriptionUpsertInput) {
  const { data } = await api.patch<ProviderSubscription>(`${BASE}/${id}`, payload);
  return data;
}
