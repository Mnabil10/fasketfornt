import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getDriverOrder, listDriverOrders } from "../../services/driver-orders.service";
import type { DriverOrder, DriverOrderFilters, DriverOrdersPaged } from "../../types/driver-orders";

export const DRIVER_ORDERS_QUERY_KEY = ["driver-orders"] as const;

type DriverOrdersOptions = {
  enabled?: boolean;
  refetchInterval?: number | false;
  refetchIntervalInBackground?: boolean;
};

export function useDriverOrders(filters: DriverOrderFilters, options?: DriverOrdersOptions) {
  return useQuery<DriverOrdersPaged>({
    queryKey: [...DRIVER_ORDERS_QUERY_KEY, filters] as const,
    queryFn: () => listDriverOrders(filters),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval ?? 15000,
    refetchIntervalInBackground: options?.refetchIntervalInBackground ?? true,
  });
}

export function useDriverOrder(id: string | undefined, options?: { enabled?: boolean }) {
  return useQuery<DriverOrder | null>({
    queryKey: [...DRIVER_ORDERS_QUERY_KEY, "detail", id] as const,
    queryFn: () => (id ? getDriverOrder(id) : Promise.resolve(null)),
    enabled: Boolean(id) && (options?.enabled ?? true),
  });
}
