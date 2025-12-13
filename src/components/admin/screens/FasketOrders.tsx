import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FasketBadge, FasketButton, FasketCard, FasketEmptyState, FasketTable } from "../../fasket";
import { Input } from "../../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Label } from "../../ui/label";
import { toast } from "sonner";
import { useDeliveryDrivers } from "../../../hooks/api/useDeliveryDrivers";
import { useAssignDriver } from "../../../hooks/api/useAssignDriver";
import { useOrderReceipt } from "../../../hooks/api/useOrderReceipt";
import { useOrdersAdmin, ORDERS_QUERY_KEY } from "../../../hooks/api/useOrdersAdmin";
import { getAdminErrorMessage } from "../../../lib/errors";
import { fmtEGP } from "../../../lib/money";
import { updateOrderStatus } from "../../../services/orders.service";
import type { OrderFilters, OrderStatus, OrderSummary } from "../../../types/order";
import { OrderReceiptView } from "./OrderReceiptView";
import { useDebounce } from "../../../hooks/useDebounce";

const STATUS_COLORS: Record<OrderStatus, Parameters<typeof FasketBadge>[0]["tone"]> = {
  PENDING: "warning",
  PROCESSING: "info",
  OUT_FOR_DELIVERY: "info",
  DELIVERED: "success",
  CANCELED: "danger",
};

type OrdersProps = { initialOrderId?: string | null };

export function FasketOrders({ initialOrderId }: OrdersProps) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [filters, setFilters] = useState<Partial<OrderFilters>>({
    status: undefined,
    customer: "",
    driverId: undefined,
  });
  const debouncedSearch = useDebounce(filters.customer ?? "", 250);

  const ordersQuery = useOrdersAdmin({
    status: filters.status,
    customer: debouncedSearch?.trim() || undefined,
    driverId: filters.driverId,
    page,
    pageSize,
  });

  const orders = ordersQuery.data?.items ?? [];
  const total = ordersQuery.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const [receiptOrderId, setReceiptOrderId] = useState<string | null>(initialOrderId ?? null);
  const receiptQuery = useOrderReceipt(receiptOrderId || "", { enabled: Boolean(receiptOrderId) });

  const assignDriver = useAssignDriver();
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [driverSearch, setDriverSearch] = useState("");
  const driversQuery = useDeliveryDrivers({
    isActive: true,
    search: driverSearch || undefined,
    page: 1,
    pageSize: 50,
  });

  const statusMutation = useMutation({
    mutationFn: (payload: { id: string; to: OrderStatus }) => updateOrderStatus(payload.id, { to: payload.to }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
    },
    onError: (error) => {
      toast.error(getAdminErrorMessage(error, t, t("orders.updateFailed", "Failed to update order status")));
    },
  });
  const handleStatusChange = (id: string, to: OrderStatus) => {
    statusMutation.mutate({ id, to });
  };

  const columns = useMemo(
    () => [
      {
        key: "code",
        title: t("orders.code", { defaultValue: "Code" }),
        render: (row: OrderSummary) => <span className="font-semibold">{row.code || row.id}</span>,
      },
      {
        key: "customer",
        title: t("orders.customer", { defaultValue: "Customer" }),
        render: (row: OrderSummary) => (
          <div className="space-y-1">
            <div className="font-medium">{row.customer?.name}</div>
            <div className="text-xs text-muted-foreground">{row.customer?.phone}</div>
          </div>
        ),
      },
      {
        key: "total",
        title: t("orders.total", { defaultValue: "Total" }),
        render: (row: OrderSummary) => <span className="font-semibold">{fmtEGP(row.totalCents || 0)}</span>,
      },
      {
        key: "status",
        title: t("orders.status", { defaultValue: "Status" }),
        render: (row: OrderSummary) => (
          <FasketBadge tone={STATUS_COLORS[row.status] ?? "neutral"}>
            {t(`orders.statuses.${row.status}`, row.status)}
          </FasketBadge>
        ),
      },
      {
        key: "createdAt",
        title: t("orders.createdAt", { defaultValue: "Created" }),
        render: (row: OrderSummary) => dayjs(row.createdAt).format("YYYY/MM/DD HH:mm"),
      },
      {
        key: "driver",
        title: t("orders.driver", { defaultValue: "Driver" }),
        render: (row: OrderSummary) =>
          row.driver ? (
            <div className="space-y-1">
              <div className="font-medium">{row.driver.fullName}</div>
              <div className="text-xs text-muted-foreground">{row.driver.phone}</div>
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">{t("orders.noDriver", "Unassigned")}</span>
          ),
      },
      {
        key: "actions",
        title: t("common.actions", { defaultValue: "Actions" }),
        render: (row: OrderSummary) => (
          <div className="flex items-center gap-2">
            <FasketButton size="sm" variant="outline" onClick={() => setReceiptOrderId(row.id)}>
              {t("orders.receipt", "Receipt")}
            </FasketButton>
            <FasketButton
              size="sm"
              variant="ghost"
              onClick={() => {
                setAssigningOrderId(row.id);
                setSelectedDriverId(row.driver?.id ?? "");
              }}
            >
              {row.driver ? t("orders.changeDriver", "Change driver") : t("orders.assignDriver", "Assign driver")}
            </FasketButton>
            {row.status !== "DELIVERED" && row.status !== "CANCELED" && (
              <>
                <FasketButton
                  size="sm"
                  variant="ghost"
                  loading={statusMutation.isPending}
                  onClick={() => handleStatusChange(row.id, "PROCESSING")}
                >
                  {t("orders.markProcessing", "Mark processing")}
                </FasketButton>
                <FasketButton
                  size="sm"
                  variant="ghost"
                  loading={statusMutation.isPending}
                  onClick={() => handleStatusChange(row.id, "OUT_FOR_DELIVERY")}
                >
                  {t("orders.markOutForDelivery", "Out for delivery")}
                </FasketButton>
                <FasketButton
                  size="sm"
                  variant="ghost"
                  loading={statusMutation.isPending}
                  onClick={() => handleStatusChange(row.id, "DELIVERED")}
                >
                  {t("orders.markDelivered", "Mark delivered")}
                </FasketButton>
                <FasketButton
                  size="sm"
                  variant="destructive"
                  loading={statusMutation.isPending}
                  onClick={() => handleStatusChange(row.id, "CANCELED")}
                >
                  {t("orders.cancel", "Cancel")}
                </FasketButton>
              </>
            )}
          </div>
        ),
      },
    ],
    [t, statusMutation.isPending]
  );

  const handleAssignDriver = async () => {
    if (!assigningOrderId || !selectedDriverId) return;
    try {
      await assignDriver.mutateAsync({ orderId: assigningOrderId, driverId: selectedDriverId });
      setAssigningOrderId(null);
      setSelectedDriverId("");
      qc.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
    } catch (error) {
      const message = getAdminErrorMessage(error, t, t("errors.DEFAULT"));
      toast.error(message);
    }
  };

  return (
    <div className="space-y-4">
      <FasketCard
        title={t("orders.title", "Orders")}
        description={t("orders.subtitle", "Manage recent orders, assign drivers, and update statuses")}
        actions={
          <div className="flex items-center gap-2">
            <Input
              placeholder={t("common.search_placeholder") as string}
              value={filters.customer ?? ""}
              onChange={(e) => setFilters((prev) => ({ ...prev, customer: e.target.value }))}
              className="w-56"
            />
            <Select
              value={filters.status ?? "all"}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, status: value === "all" ? undefined : (value as OrderStatus) }))
              }
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder={t("orders.statuses.ALL", "All statuses")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("orders.statuses.ALL", "All statuses")}</SelectItem>
                <SelectItem value="PENDING">{t("orders.statuses.PENDING", "Pending")}</SelectItem>
                <SelectItem value="PROCESSING">{t("orders.statuses.PROCESSING", "Processing")}</SelectItem>
                <SelectItem value="OUT_FOR_DELIVERY">{t("orders.statuses.OUT_FOR_DELIVERY", "Out for delivery")}</SelectItem>
                <SelectItem value="DELIVERED">{t("orders.statuses.DELIVERED", "Delivered")}</SelectItem>
                <SelectItem value="CANCELED">{t("orders.statuses.CANCELED", "Canceled")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      >
        <FasketTable<OrderSummary>
          columns={columns}
          data={orders}
          loading={ordersQuery.isLoading || ordersQuery.isFetching}
          skeletonRows={5}
          emptyTitle={t("orders.emptyTitle", "No orders found")}
          emptyDescription={t("orders.emptyDescription", "Try adjusting filters or timeframe")}
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

      <Dialog open={Boolean(receiptOrderId)} onOpenChange={(open) => setReceiptOrderId(open ? receiptOrderId : null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("orders.receipt", "Receipt")}</DialogTitle>
          </DialogHeader>
          {receiptQuery.data ? (
            <OrderReceiptView receipt={receiptQuery.data} />
          ) : (
            <FasketEmptyState title={t("common.loading", "Loading...")} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(assigningOrderId)} onOpenChange={(open) => setAssigningOrderId(open ? assigningOrderId : null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("orders.assignDriver", "Assign driver")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("orders.driver", "Driver")}</Label>
              <Input
                placeholder={t("common.search_placeholder") as string}
                value={driverSearch}
                onChange={(e) => setDriverSearch(e.target.value)}
              />
              <Select value={selectedDriverId} onValueChange={(value) => setSelectedDriverId(value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("orders.selectDriver", "Select driver")} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {driversQuery.data?.items?.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{driver.fullName}</span>
                        <span className="text-xs text-muted-foreground">{driver.phone}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <FasketButton variant="ghost" onClick={() => setAssigningOrderId(null)}>
                {t("common.cancel", "Cancel")}
              </FasketButton>
              <FasketButton loading={assignDriver.isPending} onClick={handleAssignDriver} disabled={!selectedDriverId}>
                {t("common.save", "Save")}
              </FasketButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
