import { api } from "../lib/api";

export type OrderSummary = {
  id: string;
  totalCents: number;
  status: "PENDING" | "PROCESSING" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELED";
  createdAt: string;
  user: { id: string; name: string; phone: string };
};
export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

export async function listOrders(params?: {
  status?: OrderSummary["status"];
  dateFrom?: string;
  dateTo?: string;
  minTotalCents?: number;
  maxTotalCents?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const normalized = {
    status: params?.status,
    from: params?.dateFrom ?? (params as any)?.from,
    to: params?.dateTo ?? (params as any)?.to,
    minTotalCents: params?.minTotalCents,
    maxTotalCents: params?.maxTotalCents,
    customer: params?.search ?? (params as any)?.customer,
    page: params?.page,
    pageSize: params?.pageSize,
  };
  const { data } = await api.get<Paged<OrderSummary>>("/api/v1/admin/orders", { params: normalized });
  return data;
}
export async function getOrder(id: string) {
  const { data } = await api.get(`/api/v1/admin/orders/${id}`);
  return data as any; // full detail per your spec
}
export async function updateOrderStatus(id: string, body: { to: OrderSummary["status"]; note?: string; actorId?: string }) {
  const { data } = await api.patch<{ ok: true }>(`/api/v1/admin/orders/${id}/status`, body);
  return data;
}
