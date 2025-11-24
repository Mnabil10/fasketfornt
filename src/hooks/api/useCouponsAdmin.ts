import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listCoupons } from "../../services/coupons.service";
import type { CouponFilters, CouponListResponse } from "../../types/coupon";

export const COUPONS_QUERY_KEY = ["admin-coupons"] as const;

export function useCouponsAdmin(filters: CouponFilters, options?: { enabled?: boolean }) {
  return useQuery<CouponListResponse>({
    queryKey: [...COUPONS_QUERY_KEY, filters] as const,
    queryFn: () => listCoupons(filters),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}
