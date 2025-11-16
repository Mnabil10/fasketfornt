import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listProducts, type Product, type Paged } from "../../services/products.service";

export type UseProductsAdminFilters = {
  q?: string;
  categoryId?: string;
  status?: Product["status"];
  minPriceCents?: number;
  maxPriceCents?: number;
  inStock?: boolean;
  isHotOffer?: boolean;
  orderBy?: "createdAt" | "priceCents" | "name" | "stock";
  sort?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export const PRODUCTS_QUERY_KEY = ["admin-products"] as const;

export function useProductsAdmin(filters: UseProductsAdminFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...PRODUCTS_QUERY_KEY, filters] as const,
    queryFn: () => listProducts(filters),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}
