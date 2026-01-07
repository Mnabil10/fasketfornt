import { api } from "../lib/api";
import { buildQueryParams } from "../lib/query";

export type FinanceSummary = {
  platformRevenueCents: number;
  totalCommissionCents: number;
  payoutQueueCount: number;
  unsettledOrdersCount: number;
  totalAvailableCents: number;
  totalPendingCents: number;
};

export type VendorBalanceItem = {
  id: string;
  providerId: string;
  currency?: string | null;
  availableCents: number;
  pendingCents: number;
  lifetimeSalesCents: number;
  lifetimeCommissionCents: number;
  lifetimeEarningsCents: number;
  lastSettlementAt?: string | null;
  lastPayoutAt?: string | null;
  provider?: { id: string; name: string; status: string };
};

export type LedgerEntryItem = {
  id: string;
  providerId: string;
  orderId?: string | null;
  payoutId?: string | null;
  type: string;
  amountCents: number;
  currency?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
  provider?: { id: string; name: string };
  order?: { id: string; code?: string | null };
  payout?: { id: string; status: string; referenceId?: string | null };
};

export type PayoutItem = {
  id: string;
  providerId: string;
  amountCents: number;
  feeCents?: number | null;
  currency?: string | null;
  status: string;
  referenceId?: string | null;
  failureReason?: string | null;
  processedAt?: string | null;
  createdAt: string;
  provider?: { id: string; name: string };
};

export type UnsettledOrderItem = {
  id: string;
  code?: string | null;
  providerId?: string | null;
  totalCents?: number | null;
  createdAt: string;
};

const BASE = "/api/v1/admin/finance";

export async function fetchFinanceSummary() {
  const { data } = await api.get<FinanceSummary>(`${BASE}/summary`);
  return data;
}

export async function listVendorBalances(params?: {
  providerId?: string;
  minAvailableCents?: number;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}) {
  const query = buildQueryParams(params);
  const { data } = await api.get<{ items: VendorBalanceItem[]; total: number; page: number; pageSize: number }>(
    `${BASE}/balances`,
    { params: query }
  );
  return data;
}

export async function listLedgerEntries(params?: {
  providerId?: string;
  type?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}) {
  const query = buildQueryParams(params);
  const { data } = await api.get<{ items: LedgerEntryItem[]; total: number; page: number; pageSize: number }>(
    `${BASE}/ledger`,
    { params: query }
  );
  return data;
}

export async function listPayouts(params?: {
  providerId?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}) {
  const query = buildQueryParams(params);
  const { data } = await api.get<{ items: PayoutItem[]; total: number; page: number; pageSize: number }>(
    `${BASE}/payouts`,
    { params: query }
  );
  return data;
}

export async function createPayout(payload: {
  providerId: string;
  amountCents: number;
  feeCents?: number;
  referenceId?: string | null;
}) {
  const { data } = await api.post<PayoutItem>(`${BASE}/payouts`, payload);
  return data;
}

export async function updatePayout(
  id: string,
  payload: { status: string; referenceId?: string | null; failureReason?: string | null }
) {
  const { data } = await api.patch<PayoutItem>(`${BASE}/payouts/${id}`, payload);
  return data;
}

export async function runScheduledPayouts() {
  const { data } = await api.post<Array<{ providerId: string; payoutId?: string; skipped?: string }>>(
    `${BASE}/payouts/run-scheduled`
  );
  return data;
}

export async function listUnsettledOrders(params?: { from?: string; to?: string; page?: number; pageSize?: number }) {
  const query = buildQueryParams(params);
  const { data } = await api.get<{ items: UnsettledOrderItem[]; total: number; page: number; pageSize: number }>(
    `${BASE}/unsettled-orders`,
    { params: query }
  );
  return data;
}

export async function downloadStatementCsv(
  providerId: string,
  params?: { from?: string; to?: string; type?: string }
) {
  const query = buildQueryParams(params);
  const response = await api.get(`${BASE}/statements/${providerId}/csv`, {
    params: query,
    responseType: "blob",
  });
  return response.data as Blob;
}
