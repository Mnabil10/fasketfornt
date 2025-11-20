import type { PaginatedQuery, PagedResponse, Timestamped } from "./common";

export type DeliveryZone = Timestamped & {
  id: string;
  name: string;
  city: string;
  region?: string | null;
  deliveryFeeCents: number;
  freeDeliveryThresholdCents?: number | null;
  minOrderAmountCents?: number | null;
  isActive: boolean;
};

export type DeliveryZonePayload = {
  name: string;
  city: string;
  region?: string | null;
  deliveryFeeCents: number;
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

export type DeliveryZonesPaged = PagedResponse<DeliveryZone>;
