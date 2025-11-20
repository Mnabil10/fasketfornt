import { api } from "../lib/api";
import { buildQueryParams } from "../lib/query";
import type {
  OrderDetail,
  OrderFilters,
  OrderStatus,
  OrderStatusPayload,
  OrdersPaged,
} from "../types/order";
import type { DriverAssignmentPayload } from "../types/delivery";
import type { OrderReceipt } from "../types/receipt";

export async function listOrders(params?: OrderFilters) {
  const query = buildQueryParams(params);
  const { data } = await api.get<OrdersPaged>("/admin/orders", { params: query });
  const items = (data.items || []).map((order: any) => ({
    ...order,
    customer: order.customer || order.user,
  }));
  return { ...data, items };
}

export async function getOrder(id: string) {
  const { data } = await api.get<OrderDetail>(`/admin/orders/${id}`);
  return {
    ...data,
    customer: (data as any).customer || (data as any).user,
  };
}

export async function updateOrderStatus(id: string, body: OrderStatusPayload) {
  const { data } = await api.patch<{ ok: true }>(`/admin/orders/${id}/status`, body);
  return data;
}

export async function assignDriverToOrder(id: string, payload: DriverAssignmentPayload) {
  const { data } = await api.patch<OrderDetail>(`/admin/orders/${id}/assign-driver`, payload);
  return data;
}

export async function getOrderReceipt(orderId: string) {
  const { data } = await api.get<OrderReceipt>(`/admin/orders/${orderId}/receipt`);
  return data;
}
