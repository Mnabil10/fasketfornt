import type { PaginatedQuery, PagedResponse, Timestamped } from "./common";
import type { DeliveryMode } from "./provider";

export type BranchStatus = "ACTIVE" | "INACTIVE";

export type BranchProviderSummary = {
  id: string;
  name: string;
  slug: string;
};

export type Branch = Timestamped & {
  id: string;
  providerId: string;
  provider?: BranchProviderSummary | null;
  name: string;
  nameAr?: string | null;
  slug: string;
  status: BranchStatus;
  address?: string | null;
  city?: string | null;
  region?: string | null;
  lat?: number | null;
  lng?: number | null;
  deliveryMode?: DeliveryMode | null;
  deliveryRadiusKm?: number | null;
  deliveryRatePerKmCents?: number | null;
  minDeliveryFeeCents?: number | null;
  maxDeliveryFeeCents?: number | null;
  serviceArea?: Record<string, unknown> | null;
  isDefault?: boolean;
};

export type BranchFilters = PaginatedQuery & {
  q?: string;
  providerId?: string;
  status?: BranchStatus;
};

export type BranchListResponse = PagedResponse<Branch>;

export type BranchUpsertInput = {
  providerId: string;
  name: string;
  nameAr?: string | null;
  slug?: string | null;
  status?: BranchStatus;
  address?: string | null;
  city?: string | null;
  region?: string | null;
  lat?: number | null;
  lng?: number | null;
  deliveryMode?: DeliveryMode | null;
  deliveryRadiusKm?: number | null;
  deliveryRatePerKmCents?: number | null;
  minDeliveryFeeCents?: number | null;
  maxDeliveryFeeCents?: number | null;
  serviceArea?: Record<string, unknown> | null;
  isDefault?: boolean;
};
