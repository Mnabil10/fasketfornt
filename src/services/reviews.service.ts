import { api } from "../lib/api";
import { buildQueryParams } from "../lib/query";
import type { Review, ReviewFilters, ReviewListResponse, ReviewModerationInput } from "../types/review";

const BASE = "/api/v1/admin/reviews";

export async function listReviews(filters?: ReviewFilters) {
  const params = buildQueryParams(filters);
  const { data } = await api.get<ReviewListResponse>(BASE, { params });
  return data;
}

export async function moderateReview(id: string, payload: ReviewModerationInput) {
  const { data } = await api.patch<Review>(`${BASE}/${id}`, payload);
  return data;
}
