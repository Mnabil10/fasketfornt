import { api } from "../lib/api";
import { buildQueryParams } from "../lib/query";
import type {
  DeliveryDriver,
  DeliveryDriverFilters,
  DeliveryDriverPayload,
  DriverVehiclePayload,
  DriversPaged,
} from "../types/delivery";

const BASE = "/admin/delivery-drivers";

export async function listDeliveryDrivers(filters?: DeliveryDriverFilters) {
  const params = buildQueryParams(filters);
  const { data } = await api.get<DriversPaged>(BASE, { params });
  return data;
}

export async function getDeliveryDriver(id: string) {
  const { data } = await api.get<DeliveryDriver>(`${BASE}/${id}`);
  return data;
}

export async function createDeliveryDriver(payload: DeliveryDriverPayload) {
  const { data } = await api.post<DeliveryDriver>(BASE, payload);
  return data;
}

export async function updateDeliveryDriver(id: string, payload: DeliveryDriverPayload) {
  const { data } = await api.put<DeliveryDriver>(`${BASE}/${id}`, payload);
  return data;
}

export async function updateDeliveryDriverStatus(id: string, isActive: boolean) {
  const { data } = await api.patch<DeliveryDriver>(`${BASE}/${id}/status`, { isActive });
  return data;
}

export async function saveDeliveryDriverVehicle(id: string, payload: DriverVehiclePayload) {
  const { data } = await api.post<DeliveryDriver>(`${BASE}/${id}/vehicle`, payload);
  return data;
}
