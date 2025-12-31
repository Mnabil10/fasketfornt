import type { PaginatedQuery, PagedResponse, Timestamped } from "./common";

export type BillingInterval = "MONTHLY" | "YEARLY";

export type Plan = Timestamped & {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  billingInterval: BillingInterval;
  amountCents: number;
  currency: string;
  commissionRateBps: number;
  trialDays: number;
  isActive: boolean;
};

export type PlanFilters = PaginatedQuery & {
  q?: string;
  billingInterval?: BillingInterval;
  isActive?: boolean;
};

export type PlanListResponse = PagedResponse<Plan>;

export type PlanUpsertInput = {
  code: string;
  name: string;
  description?: string | null;
  billingInterval: BillingInterval;
  amountCents?: number;
  currency?: string | null;
  commissionRateBps?: number;
  trialDays?: number;
  isActive?: boolean;
};
