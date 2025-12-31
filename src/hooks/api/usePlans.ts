import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listPlans } from "../../services/plans.service";
import type { PlanFilters, PlanListResponse } from "../../types/plan";

export const PLANS_QUERY_KEY = ["admin-plans"] as const;

export function usePlans(filters: PlanFilters, options?: { enabled?: boolean }) {
  return useQuery<PlanListResponse>({
    queryKey: [...PLANS_QUERY_KEY, filters] as const,
    queryFn: () => listPlans(filters),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}
