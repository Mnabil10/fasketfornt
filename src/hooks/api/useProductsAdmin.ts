import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listProducts, type Product, type Paged } from "../../services/products.service";
import type { ProductFilters } from "../../types/product";

export type UseProductsAdminFilters = ProductFilters;

export const PRODUCTS_QUERY_KEY = ["admin-products"] as const;

export function useProductsAdmin(filters: UseProductsAdminFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...PRODUCTS_QUERY_KEY, filters] as const,
    queryFn: () => listProducts(filters),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}
