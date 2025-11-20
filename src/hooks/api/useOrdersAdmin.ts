import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listOrders } from "../../services/orders.service";
import type { OrderFilters } from "../../types/order";

export const ORDERS_QUERY_KEY = ["admin-orders"] as const;

export function useOrdersAdmin(filters: OrderFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...ORDERS_QUERY_KEY, filters] as const,
    queryFn: () => listOrders(filters),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}
