import type { PaginatedQuery, PagedResponse, Timestamped } from "./common";

export type CouponType = "PERCENT" | "FIXED";

export type Coupon = Timestamped & {
  id: string;
  code: string;
  type: CouponType;
  valueCents: number;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  minOrderCents?: number | null;
  maxDiscountCents?: number | null;
};

export type CouponFilters = PaginatedQuery & {
  q?: string;
};

export type CouponPayload = {
  code: string;
  type: CouponType;
  valueCents: number;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  minOrderCents?: number | null;
  maxDiscountCents?: number | null;
};

export type CouponUpsertInput = Partial<CouponPayload> & {
  // Allows the UI to send a percent shorthand while keeping API payload stable
  percent?: number;
};

export type CouponFormValues = {
  code: string;
  type: CouponType;
  value: number;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  minOrderCents: number | null;
  maxDiscountCents: number | null;
};

export type CouponListResponse = PagedResponse<Coupon>;
