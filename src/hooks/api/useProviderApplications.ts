import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listProviderApplications } from "../../services/provider-applications.service";
import type { ProviderApplicationFilters, ProviderApplicationListResponse } from "../../types/provider-application";

export const PROVIDER_APPLICATIONS_QUERY_KEY = ["admin-provider-applications"] as const;

export function useProviderApplications(filters: ProviderApplicationFilters, options?: { enabled?: boolean }) {
  return useQuery<ProviderApplicationListResponse>({
    queryKey: [...PROVIDER_APPLICATIONS_QUERY_KEY, filters] as const,
    queryFn: () => listProviderApplications(filters),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}
