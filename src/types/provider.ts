import type { PaginatedQuery, PagedResponse, Timestamped } from "./common";

export type ProviderType = "SUPERMARKET" | "PHARMACY" | "RESTAURANT" | "SERVICE" | "OTHER";
export type ProviderStatus = "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED" | "DISABLED";
export type DeliveryMode = "PLATFORM" | "MERCHANT";

export type Provider = Timestamped & {
  id: string;
  name: string;
  nameAr?: string | null;
  slug: string;
  type: ProviderType;
  status: ProviderStatus;
  deliveryMode?: DeliveryMode | null;
  deliveryRatePerKmCents?: number | null;
  minDeliveryFeeCents?: number | null;
  maxDeliveryFeeCents?: number | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  logoUrl?: string | null;
  description?: string | null;
  descriptionAr?: string | null;
};

export type ProviderFilters = PaginatedQuery & {
  q?: string;
  type?: ProviderType;
  status?: ProviderStatus;
};

export type ProviderListResponse = PagedResponse<Provider>;

export type ProviderUpsertInput = {
  name: string;
  nameAr?: string | null;
  slug?: string | null;
  type?: ProviderType;
  status?: ProviderStatus;
  deliveryMode?: DeliveryMode | null;
  deliveryRatePerKmCents?: number | null;
  minDeliveryFeeCents?: number | null;
  maxDeliveryFeeCents?: number | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  logoUrl?: string | null;
  description?: string | null;
  descriptionAr?: string | null;
};
