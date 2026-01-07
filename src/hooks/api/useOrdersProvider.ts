import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listOrders } from "../../services/orders.service";
import type { OrderFilters, OrdersPaged } from "../../types/order";

export const PROVIDER_ORDERS_QUERY_KEY = ["provider-orders"] as const;

type OrdersProviderOptions = {
  enabled?: boolean;
  refetchInterval?: number | false;
  refetchIntervalInBackground?: boolean;
};

export function useOrdersProvider(filters: OrderFilters, options?: OrdersProviderOptions) {
  return useQuery<OrdersPaged>({
    queryKey: [...PROVIDER_ORDERS_QUERY_KEY, filters] as const,
    queryFn: () => listOrders(filters, "provider"),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval ?? 15000,
    refetchIntervalInBackground: options?.refetchIntervalInBackground ?? true,
  });
}
