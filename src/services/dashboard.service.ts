
import { api } from "../lib/api";
import { buildQueryParams } from "../lib/query";

export type DashboardSummary = {
  sales: { totalRevenueCents: number; totalOrders: number; avgOrderValueCents: number };
  byStatus: Array<{ status: string; _count: { status: number } }>;
  recent: Array<{ id: string; totalCents: number; status: string; createdAt: string; user: { name: string; phone: string } }>;
  topProducts: Array<{ productId: string; qty: number; name: string }>;
  topCategories?: Array<{ categoryId: string; name: string; orders: number; revenueCents?: number }>;
  lowStock: Array<{ id: string; name: string; stock: number }>;
  customersCount: number;
  activeOrders?: number;
  activeDrivers?: number;
  outForDelivery?: number;
};

export async function fetchDashboard(params?: { from?: string; to?: string }) {
  const query = buildQueryParams(params);
  const { data } = await api.get<DashboardSummary>("/api/v1/admin/dashboard", {
    params: query,
  });
  return data;
}
export async function fetchDashboardTimeseries(params?: { from?: string; to?: string; granularity?: "day"|"week"|"month" }) {
  const query = buildQueryParams(params);
  const { data } = await api.get("/api/v1/admin/dashboard/timeseries", { params: query });
  return data as Array<{ period: string; revenueCents: number; orders: number }>;
}

export async function fetchDashboardTopProducts(params?: { from?: string; to?: string; limit?: number }) {
  const query = buildQueryParams(params);
  const { data } = await api.get<Array<{ productId: string; qty: number; name: string }>>(
    "/api/v1/admin/dashboard/top-products",
    { params: query }
  );
  return data;
}

export async function fetchDashboardLowStock(params?: { threshold?: number }) {
  const query = buildQueryParams(params);
  const { data } = await api.get<Array<{ id: string; name: string; stock: number }>>(
    "/api/v1/admin/dashboard/low-stock",
    { params: query }
  );
  return data;
}

export async function fetchDashboardStatusBreakdown(params?: { from?: string; to?: string }) {
  const query = buildQueryParams(params);
  const { data } = await api.get<Array<{ status: string; _count: { status: number } }>>(
    "/api/v1/admin/dashboard/status-breakdown",
    { params: query }
  );
  return data;
}
