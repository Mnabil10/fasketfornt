import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listCategories, type Category, type Paged } from "../../services/categories.service";

export type UseCategoriesAdminFilters = {
  q?: string;
  parentId?: string;
  isActive?: boolean;
  providerId?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
};

export const CATEGORIES_QUERY_KEY = ["admin-categories"] as const;

export function useCategoriesAdmin(
  filters: UseCategoriesAdminFilters = {},
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [...CATEGORIES_QUERY_KEY, filters] as const,
    queryFn: () => listCategories(filters),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}
