import { api } from "../lib/api";

export type CouponType = 'PERCENT' | 'FIXED';
export type Coupon = {
  id: string;
  code: string;
  type: CouponType;
  valueCents: number;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  minOrderCents?: number | null;
  maxDiscountCents?: number | null;
  createdAt?: string;
};

export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

export async function listCoupons(params?: { q?: string; page?: number; pageSize?: number }) {
  const { data } = await api.get<Paged<Coupon>>("/api/v1/admin/coupons", { params: { ...params, _ts: Date.now() } });
  return data;
}

type CreateCouponBody = {
  code: string;
  type?: CouponType;
  valueCents?: number;
  isActive?: boolean;
  startsAt?: string;
  endsAt?: string;
  minOrderCents?: number;
  maxDiscountCents?: number;
  // shortcut: { percent: 10 }
  percent?: number;
};

export async function createCoupon(body: CreateCouponBody) {
  let payload: any = { ...body };
  if (!payload.type && typeof payload.percent === 'number') {
    payload.type = 'PERCENT';
    payload.valueCents = Math.trunc(payload.percent);
    delete payload.percent;
  }
  const { data } = await api.post<Coupon>("/api/v1/admin/coupons", payload);
  return data;
}

export async function updateCoupon(id: string, body: Partial<CreateCouponBody>) {
  let payload: any = { ...body };
  if (!payload.type && typeof payload.percent === 'number') {
    payload.type = 'PERCENT';
    payload.valueCents = Math.trunc(payload.percent);
    delete payload.percent;
  }
  const { data } = await api.patch<Coupon>(`/api/v1/admin/coupons/${id}`, payload);
  return data;
}
