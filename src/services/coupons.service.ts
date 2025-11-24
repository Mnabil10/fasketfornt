import { api } from "../lib/api";
import { buildQueryParams } from "../lib/query";
import type { Coupon, CouponFilters, CouponListResponse, CouponUpsertInput } from "../types/coupon";

export async function listCoupons(params?: CouponFilters) {
  const query = buildQueryParams(params);
  const { data } = await api.get<CouponListResponse>("/api/v1/admin/coupons", { params: query });
  return data;
}

function toCouponPayload(body: CouponUpsertInput): Omit<CouponUpsertInput, "percent"> {
  const payload: CouponUpsertInput = { ...body };

  if (payload.percent != null && payload.type == null) {
    payload.type = "PERCENT";
    payload.valueCents = Math.trunc(Number(payload.percent));
  }

  if (payload.valueCents != null) {
    payload.valueCents = Math.trunc(Number(payload.valueCents));
  }

  // Normalize empty strings to null to avoid backend validation errors
  payload.startsAt = payload.startsAt === "" ? null : payload.startsAt ?? null;
  payload.endsAt = payload.endsAt === "" ? null : payload.endsAt ?? null;
  payload.minOrderCents = payload.minOrderCents == null ? null : Math.trunc(Number(payload.minOrderCents));
  payload.maxDiscountCents = payload.maxDiscountCents == null ? null : Math.trunc(Number(payload.maxDiscountCents));

  const { percent, ...rest } = payload;
  return rest;
}

export async function createCoupon(body: CouponUpsertInput & { code: string }) {
  const payload = toCouponPayload(body);
  const { data } = await api.post<Coupon>("/api/v1/admin/coupons", payload);
  return data;
}

export async function updateCoupon(id: string, body: CouponUpsertInput) {
  const payload = toCouponPayload(body);
  const { data } = await api.patch<Coupon>(`/api/v1/admin/coupons/${id}`, payload);
  return data;
}
