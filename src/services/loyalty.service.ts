import { api } from "../lib/api";
import { buildQueryParams } from "../lib/query";
import type {
  LoyaltyAdjustPayload,
  LoyaltySettings,
  LoyaltySummary,
  LoyaltyTransactionFilters,
  LoyaltyTransactionsPaged,
  LoyaltyUserSummary,
} from "../types/loyalty";

const BASE = "/api/v1/admin/loyalty";

export async function getLoyaltySettings(): Promise<LoyaltySettings> {
  const { data } = await api.get<LoyaltySettings>(`${BASE}/settings`);
  return data;
}

export async function updateLoyaltySettings(payload: LoyaltySettings): Promise<LoyaltySettings> {
  const { data } = await api.patch<LoyaltySettings>(`${BASE}/settings`, payload);
  return data;
}

export async function adjustUserPoints(userId: string, payload: LoyaltyAdjustPayload) {
  const { data } = await api.post(`${BASE}/users/${userId}/adjust`, payload);
  return data;
}

export async function getUserLoyalty(userId: string): Promise<LoyaltyUserSummary> {
  const { data } = await api.get<LoyaltyUserSummary>(`${BASE}/users/${userId}`);
  return data;
}

export async function getUserLoyaltyTransactions(userId: string, filters?: LoyaltyTransactionFilters) {
  const params = buildQueryParams(filters);
  const { data } = await api.get<LoyaltyTransactionsPaged>(`${BASE}/users/${userId}/transactions`, { params });
  return data;
}

export async function listLoyaltyTransactions(filters?: LoyaltyTransactionFilters) {
  const params = buildQueryParams(filters);
  const { data } = await api.get<LoyaltyTransactionsPaged>(`${BASE}/transactions`, { params });
  return data;
}

export async function getLoyaltyTransactionsSummary(): Promise<LoyaltySummary> {
  const { data } = await api.get<LoyaltySummary>(`${BASE}/transactions/summary`);
  return data;
}
