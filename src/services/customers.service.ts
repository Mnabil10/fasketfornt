import type { AxiosError } from "axios";
import { api } from "../lib/api";
import { buildQueryParams } from "../lib/query";
import type { LoyaltyAdjustPayload, LoyaltyTransaction, LoyaltyUserSummary } from "../types/loyalty";

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: "CUSTOMER" | "ADMIN" | "STAFF" | string;
  createdAt: string;
  ordersCount?: number;
  totalSpentCents?: number;
  loyaltyTier?: string;
};

export type CustomerLoyalty = {
  summary: LoyaltyUserSummary;
  history: LoyaltyTransaction[];
};

export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

type CustomerLoyaltyResponse = Partial<LoyaltyUserSummary> & {
  summary?: LoyaltyUserSummary;
  history?: LoyaltyTransaction[];
  transactions?: LoyaltyTransaction[];
};

function normalizeCustomerLoyalty(data: CustomerLoyaltyResponse): CustomerLoyalty {
  const source = data.summary ?? data;
  const summary: LoyaltyUserSummary = {
    id: source.id ?? "",
    name: source.name ?? (source as any).userName ?? "",
    email: source.email ?? (source as any).userEmail ?? null,
    phone: source.phone ?? (source as any).userPhone ?? null,
    balance: source.balance ?? 0,
    totalEarned: source.totalEarned,
    totalRedeemed: source.totalRedeemed,
    totalAdjusted: source.totalAdjusted,
  };

  const historySource = (data.history ?? data.transactions ?? []) as unknown;
  const history = Array.isArray(historySource) ? historySource : [];

  return { summary, history };
}

export async function listCustomers(params?: { q?: string; page?: number; pageSize?: number }) {
  const query = buildQueryParams(params);
  try {
    const { data } = await api.get<Paged<Customer>>("/api/v1/admin/customers", { params: query });
    return data;
  } catch (error) {
    if (shouldRetryWithoutFilters(error, ["q"]) && query?.q) {
      const fallbackQuery = { ...query };
      delete (fallbackQuery as any).q;
      const { data } = await api.get<Paged<Customer>>("/api/v1/admin/customers", { params: fallbackQuery });
      return data;
    }
    throw error;
  }
}

export async function getCustomer(id: string) {
  const { data } = await api.get(`/api/v1/admin/customers/${id}`);
  return data as any;
}

export async function setCustomerRole(id: string, role: "CUSTOMER" | "ADMIN" | "STAFF") {
  const { data } = await api.patch<{ ok: true }>(`/api/v1/admin/customers/${id}/role`, { role });
  return data;
}

export async function resetCustomerPassword(id: string, newPassword: string) {
  const { data } = await api.patch<{ ok: true }>(`/api/v1/admin/customers/${id}/password`, { newPassword });
  return data;
}

export async function deleteCustomer(id: string) {
  const { data } = await api.delete<{ ok: true }>(`/api/v1/admin/customers/${id}`);
  return data;
}

export async function getCustomerLoyalty(id: string, options?: { limit?: number }) {
  const limit =
    options?.limit != null && Number.isFinite(Number(options.limit))
      ? Math.min(Math.max(Math.trunc(Number(options.limit)), 1), 50)
      : undefined;
  const params = buildQueryParams(limit ? { limit } : undefined);
  const { data } = await api.get<CustomerLoyaltyResponse>(`/api/v1/admin/customers/${id}/loyalty`, { params });
  return normalizeCustomerLoyalty(data);
}

export type AdjustCustomerLoyaltyResult = {
  balance?: number;
  transaction?: LoyaltyTransaction;
};

export async function adjustCustomerLoyalty(id: string, payload: LoyaltyAdjustPayload) {
  const body = {
    points: Math.trunc(Number(payload.points)),
    reason: payload.reason,
    orderId: payload.orderId,
  };
  const { data } = await api.post<AdjustCustomerLoyaltyResult>(`/api/v1/admin/customers/${id}/loyalty-adjust`, body);
  return data;
}

function shouldRetryWithoutFilters(error: unknown, forbiddenKeys: string[]) {
  const axiosError = error as AxiosError;
  if (!axiosError?.response?.data) return false;
  const errors = (axiosError.response.data as any)?.details?.errors;
  if (!Array.isArray(errors)) return false;
  return errors.some(
    (msg) => typeof msg === "string" && forbiddenKeys.some((key) => msg.includes(key) && msg.includes("should not exist"))
  );
}
