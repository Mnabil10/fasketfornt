import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { useQuery } from "@tanstack/react-query";
import { listCustomers } from "../../../services/customers.service";
import type { Customer } from "../../../services/customers.service";
import { FasketBadge, FasketButton, FasketCard, FasketTable } from "../../fasket";
import { Input } from "../../ui/input";
import { fmtEGP } from "../../../lib/money";

export function FasketCustomers() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [search, setSearch] = useState("");

  const query = useQuery({
    queryKey: ["customers", { page, pageSize, search }],
    queryFn: () => listCustomers({ page, pageSize, q: search.trim() || undefined }),
    keepPreviousData: true,
  });

  const customers = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const columns = useMemo(
    () => [
      {
        key: "name",
        title: t("customers.name", "Name"),
        render: (row: Customer) => (
          <div className="space-y-1">
            <div className="font-semibold">{row.name}</div>
            <div className="text-xs text-muted-foreground">{row.email || row.phone}</div>
          </div>
        ),
      },
      {
        key: "phone",
        title: t("customers.phone", "Phone"),
        render: (row: Customer) => row.phone,
      },
      {
        key: "orders",
        title: t("customers.orders", "Orders"),
        render: (row: Customer) => (
          <div className="space-y-1">
            <div className="font-semibold">{row.ordersCount ?? 0}</div>
            {row.totalSpentCents != null && (
              <div className="text-xs text-muted-foreground">{fmtEGP(row.totalSpentCents)}</div>
            )}
          </div>
        ),
      },
      {
        key: "role",
        title: t("customers.role", "Role"),
        render: (row: Customer) => (
          <FasketBadge tone={row.role === "CUSTOMER" ? "neutral" : "info"}>{row.role}</FasketBadge>
        ),
      },
      {
        key: "createdAt",
        title: t("common.createdAt", "Created"),
        render: (row: Customer) => dayjs(row.createdAt).format("YYYY/MM/DD"),
      },
    ],
    [t]
  );

  return (
    <FasketCard
      title={t("customers.title", "Customers")}
      description={t("customers.subtitle", "Customers and their loyalty/ordering stats")}
      actions={
        <Input
          placeholder={t("common.search_placeholder") as string}
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="w-56"
        />
      }
    >
      <FasketTable<Customer>
        columns={columns}
        data={customers}
        loading={query.isLoading || query.isFetching}
        skeletonRows={5}
        emptyTitle={t("customers.emptyTitle", "No customers found")}
        emptyDescription={t("customers.emptyDescription", "Try searching by name or phone")}
      />
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
