import { api } from "../lib/api";
import { buildQueryParams } from "../lib/query";
import type { Review } from "../types/review";

export type ProviderReviewFilters = {
  page?: number;
  pageSize?: number;
};

export type ProviderReviewListResponse = {
  items: Review[];
  total: number;
  page: number;
  pageSize: number;
  ratingAvg: number;
  ratingCount: number;
};

export async function listProviderReviews(filters?: ProviderReviewFilters) {
  const params = buildQueryParams(filters);
  const { data } = await api.get<ProviderReviewListResponse>("/api/v1/provider/reviews", { params });
  return data;
}

export async function replyToReview(reviewId: string, reply: string) {
  const { data } = await api.post<Review>(`/api/v1/provider/reviews/${reviewId}/reply`, { reply });
  return data;
}
