import { api } from "../lib/api";
import { buildQueryParams } from "../lib/query";
import type { DriverOrder, DriverOrderFilters, DriverOrdersPaged, DriverOrderStatusPayload } from "../types/driver-orders";

const BASE = "/api/v1/driver/orders";

export async function listDriverOrders(filters?: DriverOrderFilters) {
  const params = buildQueryParams(filters);
  const { data } = await api.get<DriverOrdersPaged>(BASE, { params });
  return data;
}

export async function getDriverOrder(id: string) {
  const { data } = await api.get<DriverOrder>(`${BASE}/${id}`);
  return data;
}

export async function startDriverDelivery(id: string, payload?: { note?: string }) {
  const { data } = await api.post(`${BASE}/${id}/start-delivery`, payload ?? {});
  return data;
}

export async function completeDriverDelivery(id: string, payload?: { note?: string }) {
  const { data } = await api.post(`${BASE}/${id}/complete`, payload ?? {});
  return data;
}

export async function updateDriverOrderStatus(id: string, payload: DriverOrderStatusPayload) {
  if (payload.to === "OUT_FOR_DELIVERY") {
    return startDriverDelivery(id, { note: payload.note });
  }
  if (payload.to === "DELIVERED") {
    return completeDriverDelivery(id, { note: payload.note });
  }
  const { data } = await api.patch(`${BASE}/${id}/status`, payload);
  return data;
}
