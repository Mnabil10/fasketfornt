export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

export type ReviewUser = {
  id: string;
  name: string;
  phone?: string | null;
};

export type ReviewProvider = {
  id: string;
  name: string;
  nameAr?: string | null;
};

export type ReviewOrder = {
  id: string;
  code?: string | null;
};

export type Review = {
  id: string;
  rating: number;
  comment?: string | null;
  status: ReviewStatus;
  providerId?: string;
  orderId?: string;
  userId?: string;
  moderatedAt?: string | null;
  moderationNote?: string | null;
  createdAt: string;
  updatedAt: string;
  provider?: ReviewProvider | null;
  user?: ReviewUser | null;
  order?: ReviewOrder | null;
};

export type ReviewFilters = {
  providerId?: string;
  status?: ReviewStatus;
  rating?: number;
  q?: string;
  page?: number;
  pageSize?: number;
};

export type ReviewListResponse = {
  items: Review[];
  total: number;
  page: number;
  pageSize: number;
};

export type ReviewModerationInput = {
  status: ReviewStatus;
  moderationNote?: string | null;
};
