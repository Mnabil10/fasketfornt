import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Badge } from "../../ui/badge";
import { AdminTableSkeleton } from "../common/AdminTableSkeleton";
import { EmptyState } from "../common/EmptyState";
import { ErrorState } from "../common/ErrorState";
import { useProviders } from "../../../hooks/api/useProviders";
import { useReviews, REVIEWS_QUERY_KEY } from "../../../hooks/api/useReviews";
import { moderateReview } from "../../../services/reviews.service";
import { getAdminErrorMessage } from "../../../lib/errors";
import type { Review, ReviewFilters, ReviewStatus } from "../../../types/review";
import { toast } from "sonner";

const statusBadge = (status: ReviewStatus) => {
  if (status === "APPROVED") return "secondary";
  if (status === "REJECTED") return "destructive";
  return "outline";
};

export function ReviewsManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [providerId, setProviderId] = useState("all");
  const [status, setStatus] = useState<ReviewStatus | "all">("all");
  const [rating, setRating] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const filters = useMemo<ReviewFilters>(
    () => ({
      providerId: providerId === "all" ? undefined : providerId,
      status: status === "all" ? undefined : status,
      rating: rating ? Number(rating) : undefined,
      q: q.trim() || undefined,
      page,
      pageSize,
    }),
    [providerId, status, rating, q, page]
  );

  const providersQuery = useProviders({ page: 1, pageSize: 200 }, { enabled: true });
  const reviewsQuery = useReviews(filters);
  const items = reviewsQuery.data?.items ?? [];
  const total = reviewsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const moderateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { status: ReviewStatus } }) =>
      moderateReview(id, payload),
    onSuccess: async (_data, variables) => {
      toast.success(
        variables.payload.status === "APPROVED"
          ? t("reviews.approved", "Review approved")
          : t("reviews.rejected", "Review rejected")
      );
      await queryClient.invalidateQueries({ queryKey: REVIEWS_QUERY_KEY });
    },
    onError: (error) =>
      toast.error(getAdminErrorMessage(error, t, t("reviews.action_failed", "Unable to update review"))),
  });

  const providers = providersQuery.data?.items ?? [];
  const resolveProviderName = (review: Review) =>
    review.provider?.nameAr || review.provider?.name || review.providerId || "-";

  const resetFilters = () => {
    setProviderId("all");
    setStatus("all");
    setRating("");
    setQ("");
    setPage(1);
  };

  const renderActions = (review: Review) => {
    if (review.status !== "PENDING") {
      return <span className="text-xs text-muted-foreground">{t("reviews.no_action", "No action")}</span>;
    }
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => moderateMutation.mutate({ id: review.id, payload: { status: "APPROVED" } })}
          disabled={moderateMutation.isPending}
        >
          {t("reviews.approve", "Approve")}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => moderateMutation.mutate({ id: review.id, payload: { status: "REJECTED" } })}
          disabled={moderateMutation.isPending}
        >
          {t("reviews.reject", "Reject")}
        </Button>
      </div>
    );
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("reviews.title", "Reviews")}</h1>
          <p className="text-muted-foreground">{t("reviews.subtitle", "Moderate provider ratings and feedback")}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("common.filters", "Filters")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <Select value={providerId} onValueChange={(value) => { setProviderId(value); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder={t("reviews.provider", "Provider")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all", "All")}</SelectItem>
              {providers.map((provider) => (
                <SelectItem key={provider.id} value={provider.id}>
                  {provider.nameAr || provider.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(value) => { setStatus(value as ReviewStatus | "all"); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder={t("reviews.status", "Status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all", "All")}</SelectItem>
              <SelectItem value="PENDING">{t("reviews.status_pending", "Pending")}</SelectItem>
              <SelectItem value="APPROVED">{t("reviews.status_approved", "Approved")}</SelectItem>
              <SelectItem value="REJECTED">{t("reviews.status_rejected", "Rejected")}</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={1}
            max={5}
            placeholder={t("reviews.rating", "Rating")}
            value={rating}
            onChange={(e) => { setRating(e.target.value); setPage(1); }}
          />
          <Input
            placeholder={t("reviews.search", "Search comments or customer")}
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => reviewsQuery.refetch()}>
              {t("common.refresh", "Refresh")}
            </Button>
            <Button variant="outline" onClick={resetFilters}>
              {t("common.resetFilters", "Reset")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="hidden md:grid grid-cols-[1fr,1fr,1fr,0.8fr,1.5fr,0.9fr,1.2fr] text-xs font-medium text-muted-foreground px-4 py-2 border-b">
            <span>{t("reviews.date", "Date")}</span>
            <span>{t("reviews.provider", "Provider")}</span>
            <span>{t("reviews.customer", "Customer")}</span>
            <span>{t("reviews.rating", "Rating")}</span>
            <span>{t("reviews.comment", "Comment")}</span>
            <span>{t("reviews.status", "Status")}</span>
            <span>{t("reviews.actions", "Actions")}</span>
          </div>

          {reviewsQuery.isLoading ? (
            <div className="p-4">
              <AdminTableSkeleton rows={5} columns={7} />
            </div>
          ) : reviewsQuery.isError ? (
            <ErrorState message={getAdminErrorMessage(reviewsQuery.error, t)} onRetry={() => reviewsQuery.refetch()} />
          ) : !items.length ? (
            <div className="p-4">
              <EmptyState title={t("reviews.empty", "No reviews found")} />
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                {items.map((review) => (
                  <div
                    key={review.id}
                    className="grid grid-cols-[1fr,1fr,1fr,0.8fr,1.5fr,0.9fr,1.2fr] px-4 py-3 border-b text-sm items-center"
                  >
                    <span>{dayjs(review.createdAt).format("DD MMM YYYY HH:mm")}</span>
                    <span>{resolveProviderName(review)}</span>
                    <span>{review.user?.name || review.user?.phone || "-"}</span>
                    <span>{review.rating}/5</span>
                    <span className="text-xs text-muted-foreground line-clamp-2">{review.comment || "-"}</span>
                    <Badge variant={statusBadge(review.status)}>
                      {t(`reviews.status_${review.status.toLowerCase()}`, review.status)}
                    </Badge>
                    {renderActions(review)}
                  </div>
                ))}
              </div>

              <div className="md:hidden space-y-3 p-4">
                {items.map((review) => (
                  <div key={review.id} className="rounded-lg border bg-card p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{resolveProviderName(review)}</p>
                        <p className="text-xs text-muted-foreground">
                          {dayjs(review.createdAt).format("DD MMM HH:mm")}
                        </p>
                      </div>
                      <Badge variant={statusBadge(review.status)}>
                        {t(`reviews.status_${review.status.toLowerCase()}`, review.status)}
                      </Badge>
                    </div>
                    <p className="text-sm">
                      {t("reviews.customer", "Customer")}: {review.user?.name || review.user?.phone || "-"}
                    </p>
                    <p className="text-sm">
                      {t("reviews.rating", "Rating")}: {review.rating}/5
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-3">{review.comment || "-"}</p>
                    {renderActions(review)}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
                <div>
                  {t("common.pagination.label", {
                    defaultValue: "Page {{page}} of {{count}}",
                    page,
                    count: totalPages,
                  })}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    {t("common.prev", "Prev")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    {t("common.next", "Next")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
