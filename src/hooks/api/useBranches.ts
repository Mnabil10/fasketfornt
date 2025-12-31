import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listBranches } from "../../services/branches.service";
import type { BranchFilters, BranchListResponse } from "../../types/branch";

export const BRANCHES_QUERY_KEY = ["admin-branches"] as const;

export function useBranches(filters: BranchFilters, options?: { enabled?: boolean }) {
  return useQuery<BranchListResponse>({
    queryKey: [...BRANCHES_QUERY_KEY, filters] as const,
    queryFn: () => listBranches(filters),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}
