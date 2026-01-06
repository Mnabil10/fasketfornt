import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listReviews } from "../../services/reviews.service";
import type { ReviewFilters, ReviewListResponse } from "../../types/review";

export const REVIEWS_QUERY_KEY = ["admin-reviews"] as const;

export function useReviews(filters: ReviewFilters, options?: { enabled?: boolean }) {
  return useQuery<ReviewListResponse>({
    queryKey: [...REVIEWS_QUERY_KEY, filters] as const,
    queryFn: () => listReviews(filters),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}
