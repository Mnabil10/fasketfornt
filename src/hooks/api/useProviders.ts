import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listProviders } from "../../services/providers.service";
import type { ProviderFilters, ProviderListResponse } from "../../types/provider";

export const PROVIDERS_QUERY_KEY = ["admin-providers"] as const;

export function useProviders(filters: ProviderFilters, options?: { enabled?: boolean }) {
  return useQuery<ProviderListResponse>({
    queryKey: [...PROVIDERS_QUERY_KEY, filters] as const,
    queryFn: () => listProviders(filters),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}
