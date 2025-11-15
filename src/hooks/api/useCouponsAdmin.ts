import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listCoupons, type Coupon, type Paged } from "../../services/coupons.service";

export type UseCouponsAdminFilters = {
  q?: string;
  page?: number;
  pageSize?: number;
};

export const COUPONS_QUERY_KEY = ["admin-coupons"] as const;

export function useCouponsAdmin(filters: UseCouponsAdminFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...COUPONS_QUERY_KEY, filters] as const,
    queryFn: () => listCoupons(filters),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}
