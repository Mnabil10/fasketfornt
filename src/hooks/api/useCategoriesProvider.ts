import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listProviderCategories } from "../../services/provider-categories.service";

export type UseCategoriesProviderFilters = {
  q?: string;
  parentId?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
  sort?: string;
};

export const PROVIDER_CATEGORIES_QUERY_KEY = ["provider-categories"] as const;

export function useCategoriesProvider(
  filters: UseCategoriesProviderFilters = {},
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [...PROVIDER_CATEGORIES_QUERY_KEY, filters] as const,
    queryFn: () => listProviderCategories(filters),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}
