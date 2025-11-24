import { api } from "../lib/api";
import { buildQueryParams } from "../lib/query";
import type { DeliveryZone, DeliveryZoneFilters, DeliveryZonePayload, DeliveryZonesPaged } from "../types/zones";

const BASE = "/api/v1/admin/settings/zones";

type DeliveryZoneDto = {
  id: string;
  nameEn?: string;
  nameAr?: string;
  city?: string | null;
  region?: string | null;
  fee?: number;
  feeCents?: number;
  etaMinutes?: number | null;
  freeDeliveryThresholdCents?: number | null;
  minOrderAmountCents?: number | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

function normalizeZone(zone: DeliveryZoneDto): DeliveryZone {
  const feeCents = zone.feeCents ?? (zone.fee != null ? Math.round(zone.fee * 100) : 0);
  const fee = zone.fee ?? feeCents / 100;
  return {
    id: zone.id,
    nameEn: zone.nameEn ?? "",
    nameAr: zone.nameAr ?? "",
    city: zone.city ?? null,
    region: zone.region ?? null,
    fee,
    feeCents,
    etaMinutes: zone.etaMinutes ?? null,
    freeDeliveryThresholdCents: zone.freeDeliveryThresholdCents ?? null,
    minOrderAmountCents: zone.minOrderAmountCents ?? null,
    isActive: zone.isActive ?? true,
    createdAt: zone.createdAt,
    updatedAt: zone.updatedAt,
  };
}

export async function listDeliveryZones(filters?: DeliveryZoneFilters): Promise<DeliveryZonesPaged> {
  const params = buildQueryParams(filters);
  const { data } = await api.get<DeliveryZonesPaged<DeliveryZoneDto>>(BASE, { params });
  const items = (data.items || []).map(normalizeZone);
  return { ...data, items };
}

export async function getDeliveryZone(id: string): Promise<DeliveryZone> {
  const { data } = await api.get<DeliveryZoneDto>(`${BASE}/${id}`);
  return normalizeZone(data);
}

function serializeZonePayload(payload: DeliveryZonePayload): DeliveryZonePayload {
  const feeCents = Math.round(payload.feeCents);
  return {
    nameEn: payload.nameEn,
    nameAr: payload.nameAr?.trim() ? payload.nameAr.trim() : undefined,
    city: payload.city?.trim() ? payload.city.trim() : undefined,
    region: payload.region?.trim() ? payload.region.trim() : undefined,
    feeCents,
    etaMinutes: payload.etaMinutes != null ? Math.round(payload.etaMinutes) : undefined,
    freeDeliveryThresholdCents:
      payload.freeDeliveryThresholdCents != null ? Math.round(payload.freeDeliveryThresholdCents) : undefined,
    minOrderAmountCents: payload.minOrderAmountCents != null ? Math.round(payload.minOrderAmountCents) : undefined,
    isActive: payload.isActive ?? true,
  };
}

export async function createDeliveryZone(payload: DeliveryZonePayload): Promise<DeliveryZone> {
  const dto = serializeZonePayload(payload);
  const { data } = await api.post<DeliveryZoneDto>(BASE, dto);
  return normalizeZone(data);
}

export async function updateDeliveryZone(id: string, payload: DeliveryZonePayload): Promise<DeliveryZone> {
  const dto = serializeZonePayload(payload);
  const { data } = await api.put<DeliveryZoneDto>(`${BASE}/${id}`, dto);
  return normalizeZone(data);
}

export async function deleteDeliveryZone(id: string) {
  const { data } = await api.delete<{ success: boolean }>(`${BASE}/${id}`);
  return data;
}
