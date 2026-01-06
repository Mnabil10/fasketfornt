import type { PaginatedQuery, PagedResponse, Timestamped } from "./common";
import type { Plan } from "./plan";
import type { ProviderStatus } from "./provider";

export type SubscriptionStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED";

export type ProviderSummary = {
  id: string;
  name: string;
  slug: string;
  status?: ProviderStatus;
};

export type SubscriptionPlanSummary = Pick<
  Plan,
  "id" | "code" | "name" | "billingInterval" | "amountCents" | "commissionRateBps"
>;

export type ProviderSubscription = Timestamped & {
  id: string;
  providerId: string;
  planId: string;
  status: SubscriptionStatus;
  commissionRateBpsOverride?: number | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  trialEndsAt?: string | null;
  cancelAt?: string | null;
  canceledAt?: string | null;
  provider?: ProviderSummary | null;
  plan?: SubscriptionPlanSummary | null;
};

export type SubscriptionFilters = PaginatedQuery & {
  providerId?: string;
  planId?: string;
  status?: SubscriptionStatus;
};

export type SubscriptionListResponse = PagedResponse<ProviderSubscription>;

export type SubscriptionUpsertInput = {
  providerId: string;
  planId: string;
  status?: SubscriptionStatus;
  commissionRateBpsOverride?: number | null;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  trialEndsAt?: string;
  cancelAt?: string;
  canceledAt?: string;
};
