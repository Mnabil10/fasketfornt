import { api } from "../lib/api";
import { buildQueryParams } from "../lib/query";
import type { ProviderSubscription } from "./provider-account.service";

export type ProviderBalance = {
  id?: string;
  providerId?: string;
  currency?: string;
  availableCents: number;
  pendingCents: number;
  lifetimeSalesCents: number;
  lifetimeCommissionCents: number;
  lifetimeEarningsCents: number;
  lastSettlementAt?: string | null;
  lastPayoutAt?: string | null;
};

export type ProviderDashboard = {
  ordersCount: number;
  pendingOrdersCount: number;
  totalRevenueCents: number;
  ratingAvg: number;
  ratingCount: number;
  subscription?: ProviderSubscription | null;
  balance: ProviderBalance;
};

export type ProviderEarningsSummary = {
  balance: ProviderBalance;
  totals: {
    totalSalesCents: number;
    totalCommissionCents: number;
    totalNetCents: number;
    platformRevenueCents: number;
  };
};

export type LedgerEntry = {
  id: string;
  type: string;
  orderId?: string | null;
  payoutId?: string | null;
  amountCents: number;
  currency?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
};

export type PayoutItem = {
  id: string;
  amountCents: number;
  feeCents?: number | null;
  currency?: string | null;
  status: string;
  referenceId?: string | null;
  failureReason?: string | null;
  processedAt?: string | null;
  createdAt: string;
};

export type ProviderNotificationPreferences = {
  newOrders: { email: boolean; sms: boolean; push: boolean };
  payoutSuccess: { email: boolean; sms: boolean; push: boolean };
  subscriptionExpiry: { email: boolean; sms: boolean; push: boolean };
};

export async function fetchProviderDashboard() {
  const { data } = await api.get<ProviderDashboard>("/api/v1/provider/dashboard");
  return data;
}

export async function fetchProviderEarningsSummary(params?: { from?: string; to?: string }) {
  const query = buildQueryParams(params);
  const { data } = await api.get<ProviderEarningsSummary>("/api/v1/provider/earnings/summary", { params: query });
  return data;
}

export async function fetchProviderStatement(params?: {
  from?: string;
  to?: string;
  type?: string;
  page?: number;
  pageSize?: number;
}) {
  const query = buildQueryParams(params);
  const { data } = await api.get<{ items: LedgerEntry[]; total: number; page: number; pageSize: number }>(
    "/api/v1/provider/earnings/statement",
    { params: query }
  );
  return data;
}

export async function downloadProviderStatementCsv(params?: { from?: string; to?: string; type?: string }) {
  const query = buildQueryParams(params);
  const response = await api.get("/api/v1/provider/earnings/statement/csv", {
    params: query,
    responseType: "blob",
  });
  return response.data as Blob;
}

export async function fetchProviderPayouts(params?: { from?: string; to?: string; page?: number; pageSize?: number }) {
  const query = buildQueryParams(params);
  const { data } = await api.get<{ items: PayoutItem[]; total: number; page: number; pageSize: number }>(
    "/api/v1/provider/payouts",
    { params: query }
  );
  return data;
}

export async function fetchProviderNotificationPreferences() {
  const { data } = await api.get<ProviderNotificationPreferences>("/api/v1/provider/notification-preferences");
  return data;
}

export async function updateProviderNotificationPreferences(payload: ProviderNotificationPreferences) {
  const { data } = await api.patch<ProviderNotificationPreferences>("/api/v1/provider/notification-preferences", payload);
  return data;
}
