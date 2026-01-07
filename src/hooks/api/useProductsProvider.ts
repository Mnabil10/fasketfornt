import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listProviderProducts } from "../../services/products.service";
import type { ProductFilters } from "../../types/product";

export const PROVIDER_PRODUCTS_QUERY_KEY = ["provider-products"] as const;

export function useProductsProvider(filters: ProductFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...PROVIDER_PRODUCTS_QUERY_KEY, filters] as const,
    queryFn: () => listProviderProducts(filters),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}
