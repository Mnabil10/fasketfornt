import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Textarea } from "../ui/textarea";
import { ErrorState } from "../admin/common/ErrorState";
import { listProviderReviews, replyToReview } from "../../services/provider-reviews.service";
import { Star } from "lucide-react";

export function VendorReviews() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const reviewsQuery = useQuery({
    queryKey: ["provider-reviews", page, pageSize],
    queryFn: () => listProviderReviews({ page, pageSize }),
  });

  const replyMutation = useMutation({
    mutationFn: ({ reviewId, reply }: { reviewId: string; reply: string }) => replyToReview(reviewId, reply),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-reviews"] });
    },
  });

  const totalPages = Math.max(1, Math.ceil((reviewsQuery.data?.total || 0) / pageSize));
  const summary = reviewsQuery.data;

  const handleDraftChange = (reviewId: string, value: string) => {
    setDrafts((prev) => ({ ...prev, [reviewId]: value }));
  };

  const handleReply = (reviewId: string) => {
    const reply = (drafts[reviewId] || "").trim();
    if (!reply) return;
    replyMutation.mutate({ reviewId, reply });
  };

  if (reviewsQuery.isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">{t("app.loading", "Loading...")}</div>;
  }

  if (reviewsQuery.isError) {
    return (
      <ErrorState
        message={t("vendor.reviews.load_failed", "Unable to load reviews")}
        onRetry={() => reviewsQuery.refetch()}
      />
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("vendor.reviews.title", "Reviews")}</h1>
          <p className="text-muted-foreground">
            {t("vendor.reviews.subtitle", "Respond to customer feedback and track ratings")}
          </p>
        </div>
        <Card className="w-full md:w-auto">
          <CardContent className="flex items-center gap-3 p-4">
            <Star className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-sm font-semibold">
                {(summary?.ratingAvg ?? 0).toFixed(1)} / 5
              </p>
              <p className="text-xs text-muted-foreground">
                {t("vendor.reviews.count", "{{count}} reviews", { count: summary?.ratingCount ?? 0 })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {(summary?.items || []).length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              {t("vendor.reviews.empty", "No reviews yet")}
            </CardContent>
          </Card>
        ) : (
          summary?.items.map((review) => {
            const replyText = drafts[review.id] ?? "";
            return (
              <Card key={review.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{review.user?.name || t("vendor.reviews.anonymous", "Customer")}</span>
                    <Badge variant="outline">{review.rating}/5</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground">{review.comment || "--"}</p>
                  {review.reply ? (
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">{t("vendor.reviews.your_reply", "Your reply")}</p>
                      <p className="mt-1">{review.reply}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Textarea
                        rows={3}
                        placeholder={t("vendor.reviews.reply_placeholder", "Write a reply")}
                        value={replyText}
                        onChange={(event) => handleDraftChange(review.id, event.target.value)}
                      />
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => handleReply(review.id)}
                          disabled={replyMutation.isPending || replyText.trim().length === 0}
                        >
                          {t("vendor.reviews.reply_action", "Reply")}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          {t("common.pagination.label", {
            defaultValue: "Page {{page}} of {{count}}",
            page,
            count: totalPages,
          })}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            {t("common.prev", "Prev")}
          </Button>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            {t("common.next", "Next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
