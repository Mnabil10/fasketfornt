import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listCustomers, type Customer, type Paged } from "../../services/customers.service";

export type UseCustomersAdminFilters = {
  q?: string;
  role?: Customer["role"];
  page?: number;
  pageSize?: number;
};

export const CUSTOMERS_QUERY_KEY = ["admin-customers"] as const;

export function useCustomersAdmin(filters: UseCustomersAdminFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...CUSTOMERS_QUERY_KEY, filters] as const,
    queryFn: () => listCustomers(filters),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}
