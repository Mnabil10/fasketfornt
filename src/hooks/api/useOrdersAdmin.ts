import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listOrders, type OrderSummary, type Paged } from "../../services/orders.service";

export type UseOrdersAdminFilters = {
  status?: OrderSummary["status"];
  from?: string;
  to?: string;
  minTotalCents?: number;
  maxTotalCents?: number;
  customer?: string;
  page?: number;
  pageSize?: number;
};

export const ORDERS_QUERY_KEY = ["admin-orders"] as const;

export function useOrdersAdmin(filters: UseOrdersAdminFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...ORDERS_QUERY_KEY, filters] as const,
    queryFn: () => listOrders(filters),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}
