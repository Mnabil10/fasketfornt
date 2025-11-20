import { api } from "../lib/api";
import { buildQueryParams } from "../lib/query";
import type { DeliveryZone, DeliveryZoneFilters, DeliveryZonePayload, DeliveryZonesPaged } from "../types/zones";

const BASE = "/admin/settings/zones";

export async function listDeliveryZones(filters?: DeliveryZoneFilters) {
  const params = buildQueryParams(filters);
  const { data } = await api.get<DeliveryZonesPaged>(BASE, { params });
  return data;
}

export async function getDeliveryZone(id: string) {
  const { data } = await api.get<DeliveryZone>(`${BASE}/${id}`);
  return data;
}

export async function createDeliveryZone(payload: DeliveryZonePayload) {
  const { data } = await api.post<DeliveryZone>(BASE, payload);
  return data;
}

export async function updateDeliveryZone(id: string, payload: DeliveryZonePayload) {
  const { data } = await api.put<DeliveryZone>(`${BASE}/${id}`, payload);
  return data;
}

export async function deleteDeliveryZone(id: string) {
  const { data } = await api.delete<{ success: boolean }>(`${BASE}/${id}`);
  return data;
}
