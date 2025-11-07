
import { api } from "../lib/api";

export type DashboardSummary = {
  sales: { totalRevenueCents: number; totalOrders: number; avgOrderValueCents: number };
  byStatus: Array<{ status: string; _count: { status: number } }>;
  recent: Array<{ id: string; totalCents: number; status: string; createdAt: string; user: { name: string; phone: string } }>;
  topProducts: Array<{ productId: string; qty: number; name: string }>;
  lowStock: Array<{ id: string; name: string; stock: number }>;
  customersCount: number;
};

export async function fetchDashboard(params?: { from?: string; to?: string }) {
  const { data } = await api.get<DashboardSummary>("/api/v1/admin/dashboard", {
    params: { ...params, _ts: Date.now() } // 👈 cache-buster
  });
  return data;
}
export async function fetchDashboardTimeseries(params?: { from?: string; to?: string; granularity?: "day"|"week"|"month" }) {
  const { data } = await api.get("/api/v1/admin/dashboard/timeseries", {
    params: { ...params, _ts: Date.now() }
  });
  return data as Array<{ period: string; revenueCents: number; orders: number }>;
}

