import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listProducts, updateProduct, type Product } from "../../../services/products.service";
import { FasketBadge, FasketButton, FasketCard, FasketEmptyState, FasketTable } from "../../fasket";
import { Input } from "../../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { fmtEGP } from "../../../lib/money";
import { toast } from "sonner";
import { useDebounce } from "../../../hooks/useDebounce";
import { useNavigate } from "react-router-dom";
import { useCategoriesAdmin } from "../../../hooks/api/useCategoriesAdmin";
import { Checkbox } from "../../ui/checkbox";

type Status = Product["status"];

export function FasketProducts() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status | "all">("all");
  const [sort, setSort] = useState<"createdAt" | "priceCents" | "name">("createdAt");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const debouncedSearch = useDebounce(search, 250);
  const qc = useQueryClient();
  const categoriesQuery = useCategoriesAdmin({ page: 1, take: 100 }, { enabled: true });
  const [categoryId, setCategoryId] = useState<string | "all">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const query = useQuery({
    queryKey: ["products", { page, pageSize, search: debouncedSearch, status, sort, direction, categoryId }],
    queryFn: () =>
      listProducts({
        page,
        pageSize,
        q: debouncedSearch.trim() || undefined,
        status: status === "all" ? undefined : (status as Status),
        orderBy: sort,
        sort: direction,
        categoryId: categoryId === "all" ? undefined : categoryId,
      }),
    keepPreviousData: true,
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Status }) => updateProduct(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
    onError: (error) =>
      toast.error(t("products.updateFailed", "Failed to update product"), { description: String(error) }),
  });

  const toggleHotOffer = useMutation({
    mutationFn: ({ id, isHotOffer }: { id: string; isHotOffer: boolean }) => updateProduct(id, { isHotOffer }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
    onError: (error) =>
      toast.error(t("products.updateFailed", "Failed to update product"), { description: String(error) }),
  });

  const products = query.data?.items ?? [];
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
            {row.isHotOffer && <FasketBadge tone="info">{t("products.hotOffer", "Hot offer")}</FasketBadge>}
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
        render: (row: Product) => (
          <div className="space-y-1">
            <span className="font-semibold">{row.stock}</span>
            <span className="text-xs text-muted-foreground">{row.sku || row.slug}</span>
          </div>
        ),
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
        key: "createdAt",
        title: t("common.createdAt", "Created"),
        render: (row: Product) => (row.createdAt ? dayjs(row.createdAt).format("YYYY/MM/DD") : "—"),
      },
      {
        key: "actions",
        title: t("common.actions", "Actions"),
        render: (row: Product) => (
          <div className="flex flex-wrap gap-2">
            <Checkbox
              checked={selectedIds.has(row.id)}
              onCheckedChange={(checked) => {
                const next = new Set(selectedIds);
                if (checked) next.add(row.id);
                else next.delete(row.id);
                setSelectedIds(next);
              }}
            />
            <FasketButton
              size="sm"
              variant="outline"
              onClick={() => navigate(`/products/manage/${row.id}`)}
            >
              {t("products.actions.edit", "Edit")}
            </FasketButton>
            <FasketButton
              size="sm"
              variant="outline"
              loading={toggleStatus.isPending}
              onClick={() =>
                toggleStatus.mutate({
                  id: row.id,
                  status: row.status === "ACTIVE" ? "HIDDEN" : "ACTIVE",
                })
              }
            >
              {row.status === "ACTIVE"
                ? t("products.actions.hide", "Hide")
                : t("products.actions.activate", "Activate")}
            </FasketButton>
            <FasketButton
              size="sm"
              variant="ghost"
              loading={toggleHotOffer.isPending}
              onClick={() => toggleHotOffer.mutate({ id: row.id, isHotOffer: !row.isHotOffer })}
            >
              {row.isHotOffer
                ? t("products.actions.removeHot", "Remove hot offer")
                : t("products.actions.markHot", "Mark hot offer")}
            </FasketButton>
          </div>
        ),
      },
    ],
    [t, toggleStatus.isPending, toggleHotOffer.isPending]
  );

  if (query.isError) {
    return (
      <FasketCard
        title={t("products.title", "Products")}
        description={t("products.subtitle", "Catalog overview with pricing and stock")}
        actions={
          <FasketButton size="sm" variant="outline" onClick={() => query.refetch()}>
            {t("app.actions.refresh", "Refresh")}
          </FasketButton>
        }
      >
        <FasketEmptyState
          title={t("products.load_failed", "Unable to load products")}
          description={t("products.retry_hint", "Check your connection and try again.")}
          action={
            <FasketButton size="sm" onClick={() => query.refetch()}>
              {t("app.actions.retry", "Retry")}
            </FasketButton>
          }
        />
      </FasketCard>
    );
  }

  return (
    <FasketCard
      title={t("products.title", "Products")}
      description={t("products.subtitle", "Catalog overview with pricing and stock")}
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          <FasketButton size="sm" onClick={() => navigate("/products/manage")}>
            {t("products.actions.create", "Create product")}
          </FasketButton>
          {!!selectedIds.size && (
            <>
              <FasketButton
                size="sm"
                variant="outline"
                onClick={() => {
                  const ids = Array.from(selectedIds);
                  toggleStatus.mutate({ id: ids[0], status: "ACTIVE" }); // trigger loading state
                  Promise.all(ids.map((id) => updateProduct(id, { status: "ACTIVE" })))
                    .then(() => {
                      toast.success(t("products.bulkActivated", "Products activated"));
                      setSelectedIds(new Set());
                      qc.invalidateQueries({ queryKey: ["products"] });
                    })
                    .catch((err) => toast.error(t("products.updateFailed"), { description: String(err) }));
                }}
              >
                {t("products.actions.bulkActivate", "Activate selected")}
              </FasketButton>
              <FasketButton
                size="sm"
                variant="outline"
                onClick={() => {
                  const ids = Array.from(selectedIds);
                  toggleStatus.mutate({ id: ids[0], status: "HIDDEN" }); // trigger loading state
                  Promise.all(ids.map((id) => updateProduct(id, { status: "HIDDEN" })))
                    .then(() => {
                      toast.success(t("products.bulkHidden", "Products hidden"));
                      setSelectedIds(new Set());
                      qc.invalidateQueries({ queryKey: ["products"] });
                    })
                    .catch((err) => toast.error(t("products.updateFailed"), { description: String(err) }));
                }}
              >
                {t("products.actions.bulkHide", "Hide selected")}
              </FasketButton>
            </>
          )}
          <Input
            placeholder={t("common.search_placeholder") as string}
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            className="w-56"
          />
          <Select value={status} onValueChange={(value) => setStatus(value as Status | "all")}>
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
          <Select value={sort} onValueChange={(value) => setSort(value as typeof sort)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t("products.sort_by", "Sort by")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">{t("products.sort.createdAt", "Created date")}</SelectItem>
              <SelectItem value="priceCents">{t("products.sort.price", "Price")}</SelectItem>
              <SelectItem value="name">{t("products.sort.name", "Name")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={direction} onValueChange={(value) => setDirection(value as typeof direction)}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder={t("products.sort.direction", "Order")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">{t("products.sort.desc", "Desc")}</SelectItem>
              <SelectItem value="asc">{t("products.sort.asc", "Asc")}</SelectItem>
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
            <SelectTrigger className="w-28">
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
      }
    >
      {products.length === 0 && !(query.isLoading || query.isFetching) ? (
        <FasketEmptyState
          title={t("products.emptyTitle", "No products found")}
          description={t("products.emptyDescription", "Try a different search or status")}
          action={
            <FasketButton size="sm" variant="outline" onClick={() => query.refetch()}>
              {t("app.actions.refresh", "Refresh")}
            </FasketButton>
          }
        />
      ) : (
        <FasketTable<Product>
          columns={columns}
          data={products}
          loading={query.isLoading || query.isFetching}
          skeletonRows={6}
          emptyTitle={t("products.emptyTitle", "No products found")}
          emptyDescription={t("products.emptyDescription", "Try a different search or status")}
        />
      )}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-muted-foreground">
          {t("common.pagination.summary", "{{from}}-{{to}} of {{total}}", {
            from: (page - 1) * pageSize + 1,
            to: Math.min(page * pageSize, total),
            total,
          })}
        </div>
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
    </FasketCard>
  );
}
