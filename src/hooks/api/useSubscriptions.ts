import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listSubscriptions } from "../../services/subscriptions.service";
import type { SubscriptionFilters, SubscriptionListResponse } from "../../types/subscription";

export const SUBSCRIPTIONS_QUERY_KEY = ["admin-subscriptions"] as const;

export function useSubscriptions(filters: SubscriptionFilters, options?: { enabled?: boolean }) {
  return useQuery<SubscriptionListResponse>({
    queryKey: [...SUBSCRIPTIONS_QUERY_KEY, filters] as const,
    queryFn: () => listSubscriptions(filters),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}
