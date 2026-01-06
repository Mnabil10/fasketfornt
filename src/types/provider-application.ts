import type { PaginatedQuery, PagedResponse, Timestamped } from "./common";
import type { DeliveryMode, ProviderType } from "./provider";

export type ProviderApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

export type ProviderApplication = Timestamped & {
  id: string;
  businessName: string;
  providerType: ProviderType;
  city?: string | null;
  region?: string | null;
  ownerName: string;
  phone: string;
  email?: string | null;
  deliveryMode: DeliveryMode;
  notes?: string | null;
  status: ProviderApplicationStatus;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  providerId?: string | null;
  provider?: { id: string; name: string; status?: string } | null;
};

export type ProviderApplicationFilters = PaginatedQuery & {
  status?: ProviderApplicationStatus;
  type?: ProviderType;
  city?: string;
  q?: string;
};

export type ProviderApplicationListResponse = PagedResponse<ProviderApplication>;

export type ProviderApplicationBranchInput = {
  name?: string | null;
  city?: string | null;
  region?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  deliveryMode?: DeliveryMode | null;
  deliveryRadiusKm?: number | null;
  deliveryRatePerKmCents?: number | null;
  minDeliveryFeeCents?: number | null;
  maxDeliveryFeeCents?: number | null;
};

export type ProviderApplicationApprovalInput = {
  planId: string;
  commissionRateBpsOverride?: number | null;
  branch?: ProviderApplicationBranchInput | null;
};

export type ProviderApplicationRejectionInput = {
  reason?: string | null;
};
