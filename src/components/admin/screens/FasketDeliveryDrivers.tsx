import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { useDeliveryDrivers } from "../../../hooks/api/useDeliveryDrivers";
import { FasketBadge, FasketButton, FasketCard, FasketTable } from "../../fasket";
import { Input } from "../../ui/input";
import type { DeliveryDriver } from "../../../types/delivery";

const toneForStatus = (isActive: boolean) => (isActive ? "success" : "danger") as const;

export function FasketDeliveryDrivers() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [search, setSearch] = useState("");
  const filters = useMemo(() => ({ page, pageSize, search: search.trim() || undefined }), [page, pageSize, search]);

  const query = useDeliveryDrivers(filters);
  const drivers = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const columns = useMemo(
    () => [
      {
        key: "name",
        title: t("drivers.name", "Name"),
        render: (row: DeliveryDriver) => (
          <div className="space-y-1">
            <div className="font-semibold">{row.fullName}</div>
            <div className="text-xs text-muted-foreground">{row.phone}</div>
          </div>
        ),
      },
      {
        key: "status",
        title: t("drivers.status", "Status"),
        render: (row: DeliveryDriver) => (
          <FasketBadge tone={toneForStatus(Boolean(row.isActive))}>
            {row.isActive ? t("common.active", "Active") : t("common.inactive", "Inactive")}
          </FasketBadge>
        ),
      },
      {
        key: "vehicle",
        title: t("drivers.vehicle", "Vehicle"),
        render: (row: DeliveryDriver) =>
          row.vehicle ? (
            <div className="space-y-1">
              <div className="font-medium">{row.vehicle.type}</div>
              <div className="text-xs text-muted-foreground">
                {row.vehicle.plateNumber} {row.vehicle.color ? `• ${row.vehicle.color}` : ""}
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">{t("drivers.noVehicle", "No vehicle")}</span>
          ),
      },
      {
        key: "createdAt",
        title: t("common.createdAt", "Created"),
        render: (row: DeliveryDriver) => dayjs(row.createdAt).format("YYYY/MM/DD"),
      },
    ],
    [t]
  );

  return (
    <FasketCard
      title={t("drivers.title", "Delivery Drivers")}
      description={t("drivers.subtitle", "Manage drivers and see their vehicles")}
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
      <FasketTable<DeliveryDriver>
        columns={columns}
        data={drivers}
        loading={query.isLoading || query.isFetching}
        skeletonRows={5}
        emptyTitle={t("drivers.emptyTitle", "No drivers found")}
        emptyDescription={t("drivers.emptyDescription", "Try adjusting filters")}
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
