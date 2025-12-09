import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listHotOffers, updateProduct, type Product } from "../../../services/products.service";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Input } from "../../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { FasketBadge, FasketButton, FasketEmptyState, FasketTable } from "../../fasket";
import { fmtEGP } from "../../../lib/money";
import { toast } from "sonner";
import { useDebounce } from "../../../hooks/useDebounce";
import { AdminTableSkeleton } from "../common/AdminTableSkeleton";
import { ErrorState } from "../common/ErrorState";
import { useCategoriesAdmin } from "../../../hooks/api/useCategoriesAdmin";
import { useNavigate } from "react-router-dom";

type HotOfferStatus = Product["status"];

export function HotOffersList() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const categoriesQuery = useCategoriesAdmin({ page: 1, take: 200 }, { enabled: true });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<HotOfferStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const debouncedSearch = useDebounce(search, 300);
  const [categoryId, setCategoryId] = useState<string | "all">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const query = useQuery({
    queryKey: ["hot-offers", { search: debouncedSearch, status, page, pageSize, categoryId }],
    queryFn: () =>
      listHotOffers({
        q: debouncedSearch.trim() || undefined,
        status: status === "all" ? undefined : status,
        page,
        pageSize,
        categoryId: categoryId === "all" ? undefined : categoryId,
      }),
    keepPreviousData: true,
  });

  const toggleHot = useMutation({
    mutationFn: ({ id, isHotOffer }: { id: string; isHotOffer: boolean }) => updateProduct(id, { isHotOffer }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hot-offers"] }),
    onError: (error) =>
      toast.error(t("products.updateFailed", "Failed to update product"), { description: String(error) }),
  });
  const toggleHotBulk = useMutation({
    mutationFn: (payload: { ids: string[]; isHotOffer: boolean }) =>
      Promise.all(payload.ids.map((id) => updateProduct(id, { isHotOffer: payload.isHotOffer }))),
    onSuccess: () => {
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["hot-offers"] });
    },
    onError: (error) =>
      toast.error(t("products.updateFailed", "Failed to update product"), { description: String(error) }),
  });

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const columns = useMemo(
    () => [
      {
        key: "name",
        title: t("products.name", "Name"),
        render: (row: Product) => (
          <div className="space-y-1">
            <div className="font-semibold">{row.name}</div>
            <p className="text-xs text-muted-foreground">{row.sku || row.slug}</p>
          </div>
        ),
      },
      {
        key: "price",
        title: t("products.price", "Price"),
        render: (row: Product) => (
          <div className="space-y-1">
            <div className="font-semibold">{fmtEGP(row.salePriceCents ?? row.priceCents)}</div>
            {row.salePriceCents != null && (
              <div className="text-xs text-muted-foreground line-through">{fmtEGP(row.priceCents)}</div>
            )}
          </div>
        ),
      },
      {
        key: "stock",
        title: t("products.stock", "Stock"),
        render: (row: Product) => <span className="font-semibold">{row.stock}</span>,
      },
      {
        key: "status",
        title: t("products.status", "Status"),
        render: (row: Product) => (
          <FasketBadge
            tone={
              row.status === "ACTIVE"
                ? "success"
                : row.status === "DRAFT"
                  ? "warning"
                  : row.status === "HIDDEN"
                    ? "info"
                    : "danger"
            }
          >
            {row.status}
          </FasketBadge>
        ),
      },
      {
        key: "actions",
        title: t("common.actions", "Actions"),
        render: (row: Product) => (
          <FasketButton
            size="sm"
            variant="outline"
            loading={toggleHot.isPending}
            onClick={() => toggleHot.mutate({ id: row.id, isHotOffer: !row.isHotOffer })}
          >
            {row.isHotOffer
              ? t("products.actions.removeHot", "Remove hot offer")
              : t("products.actions.markHot", "Mark hot offer")}
          </FasketButton>
        ),
      },
    ],
    [t, toggleHot.isPending]
  );

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("products.hotOffers", "Hot Offers")}</h1>
          <p className="text-sm text-muted-foreground">{t("products.hotOffersSubtitle", "Products marked as hot offers")}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("common.filters", "Filters")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input
              className="w-64"
              placeholder={t("filters.searchPlaceholder") || "Search"}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <Select value={status} onValueChange={(value) => { setStatus(value as HotOfferStatus | "all"); setPage(1); }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={t("products.status.all", "All statuses")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("products.status.all", "All statuses")}</SelectItem>
                <SelectItem value="ACTIVE">{t("products.status.active", "Active")}</SelectItem>
                <SelectItem value="DRAFT">{t("products.status.draft", "Draft")}</SelectItem>
                <SelectItem value="HIDDEN">{t("products.status.hidden", "Hidden")}</SelectItem>
                <SelectItem value="DISCONTINUED">{t("products.status.discontinued", "Discontinued")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryId} onValueChange={(value) => { setCategoryId(value as typeof categoryId); setPage(1); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t("products.category", "Category")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("products.category_all", "All categories")}</SelectItem>
                {categoriesQuery.data?.items?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setPage(1); }}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={t("common.page_size", "Page size")} />
              </SelectTrigger>
              <SelectContent>
                {[20, 50, 100].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} / {t("common.page", "page")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            <FasketButton
              size="sm"
              variant="outline"
              disabled={!selected.size}
              loading={toggleHotBulk.isPending}
              onClick={() => toggleHotBulk.mutate({ ids: Array.from(selected), isHotOffer: true })}
            >
              {t("products.actions.markHot", "Mark hot offer")}
            </FasketButton>
            <FasketButton
              size="sm"
              variant="outline"
              disabled={!selected.size}
              loading={toggleHotBulk.isPending}
              onClick={() => toggleHotBulk.mutate({ ids: Array.from(selected), isHotOffer: false })}
            >
              {t("products.actions.removeHot", "Remove hot offer")}
            </FasketButton>
          </div>

          <div className="border rounded-lg">
            {query.isLoading ? (
              <div className="p-4">
                <AdminTableSkeleton rows={5} columns={6} />
              </div>
            ) : query.isError ? (
              <div className="p-4">
                <ErrorState
                  message={t("products.load_failed", "Unable to load products")}
                  onRetry={() => query.refetch()}
                />
              </div>
            ) : items.length === 0 ? (
              <div className="p-6">
                <FasketEmptyState
                  title={t("products.emptyTitle", "No products found")}
                  description={t("products.emptyDescription", "Try a different search or status")}
                  action={
                    <div className="flex gap-2">
                      <FasketButton size="sm" variant="outline" onClick={() => query.refetch()}>
                        {t("app.actions.refresh", "Refresh")}
                      </FasketButton>
                      <FasketButton size="sm" onClick={() => navigate("/products/manage")}>
                        {t("products.actions.create", "Create product")}
                      </FasketButton>
                    </div>
                  }
                />
              </div>
            ) : (
              <FasketTable<Product>
                columns={[
                  {
                    key: "select",
                    title: "",
                    render: (row) => (
                      <input
                        type="checkbox"
                        className="accent-primary"
                        checked={selected.has(row.id)}
                        onChange={(e) => {
                          const next = new Set(selected);
                          if (e.target.checked) next.add(row.id);
                          else next.delete(row.id);
                          setSelected(next);
                        }}
                      />
                    ),
                  },
                  ...columns,
                ]}
                data={items}
                loading={query.isFetching}
                skeletonRows={5}
                emptyTitle={t("products.emptyTitle", "No products found")}
                emptyDescription={t("products.emptyDescription", "Try a different search or status")}
              />
            )}
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
              <span>
                {t("common.pagination.summary", "{{from}}-{{to}} of {{total}}", {
                  from: (page - 1) * pageSize + 1,
                  to: Math.min(page * pageSize, total),
                  total,
                })}
              </span>
              <div className="flex gap-2">
                <FasketButton size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  {t("common.prev", "Prev")}
                </FasketButton>
                <FasketButton
                  size="sm"
                  variant="outline"
                  disabled={page >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                >
                  {t("common.next", "Next")}
                </FasketButton>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
