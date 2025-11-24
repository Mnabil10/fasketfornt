import type { PaginatedQuery, PaginatedResponse } from "./common";

export type DeliveryZone = {
  id: string;
  nameEn: string;
  nameAr: string;
  city?: string | null;
  region?: string | null;
  fee: number;
  feeCents: number;
  etaMinutes?: number | null;
  freeDeliveryThresholdCents?: number | null;
  minOrderAmountCents?: number | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type DeliveryZonePayload = {
  nameEn: string;
  nameAr?: string | null;
  city?: string | null;
  region?: string | null;
  feeCents: number;
  etaMinutes?: number | null;
  freeDeliveryThresholdCents?: number | null;
  minOrderAmountCents?: number | null;
  isActive?: boolean;
};

export type DeliveryZoneFilters = PaginatedQuery & {
  search?: string;
  city?: string;
  region?: string;
  isActive?: boolean;
};

export type DeliveryZonesPaged<T = DeliveryZone> = PaginatedResponse<T>;
