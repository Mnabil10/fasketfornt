import React, { useState } from "react";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { toast } from "sonner";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import { AdminTableSkeleton } from "../common/AdminTableSkeleton";
import { EmptyState } from "../common/EmptyState";
import { ErrorState } from "../common/ErrorState";
import { RefreshCcw, MapPin, PhoneCall } from "lucide-react";
import { getAdminErrorMessage } from "../../../lib/errors";
import { fmtCurrency } from "../../../lib/money";
import { useDriverOrder, useDriverOrders, DRIVER_ORDERS_QUERY_KEY } from "../../../hooks/api/useDriverOrders";
import { updateDriverOrderStatus } from "../../../services/driver-orders.service";
import type { DriverOrder, DriverOrderAddress } from "../../../types/driver-orders";
import type { DeliveryFailureReason, OrderStatus } from "../../../types/order";

const STATUS_OPTIONS: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "OUT_FOR_DELIVERY",
  "DELIVERY_FAILED",
  "DELIVERED",
  "CANCELED",
];

const FAILURE_REASONS: DeliveryFailureReason[] = [
  "NO_ANSWER",
  "WRONG_ADDRESS",
  "UNSAFE_LOCATION",
  "CUSTOMER_REQUESTED_RESCHEDULE",
];

const statusBadge = (status: OrderStatus, t: (key: string, fallback?: string) => string) => {
  const map: Record<OrderStatus, { color: string; label: string }> = {
    PENDING: { color: "bg-yellow-100 text-yellow-800", label: t("orders.statuses.PENDING", "Pending") },
    CONFIRMED: { color: "bg-blue-100 text-blue-800", label: t("orders.statuses.CONFIRMED", "Confirmed") },
    PREPARING: { color: "bg-amber-100 text-amber-800", label: t("orders.statuses.PREPARING", "Preparing") },
    OUT_FOR_DELIVERY: {
      color: "bg-purple-100 text-purple-800",
      label: t("orders.statuses.OUT_FOR_DELIVERY", "Out for delivery"),
    },
    DELIVERY_FAILED: { color: "bg-orange-100 text-orange-800", label: t("orders.statuses.DELIVERY_FAILED", "Delivery failed") },
    DELIVERED: { color: "bg-green-100 text-green-800", label: t("orders.statuses.DELIVERED", "Delivered") },
    CANCELED: { color: "bg-red-100 text-red-800", label: t("orders.statuses.CANCELED", "Canceled") },
  };
  return map[status] ?? { color: "bg-slate-100 text-slate-700", label: status };
};

const formatAddress = (address: DriverOrderAddress | null | undefined, fallback: string) => {
  if (!address) return fallback;
  const parts = [address.label, address.street, address.building, address.apartment, address.city].filter(Boolean);
  return parts.length ? parts.join(", ") : fallback;
};

const hasCoords = (address: DriverOrderAddress | null | undefined) =>
  address && Number.isFinite(address.lat) && Number.isFinite(address.lng);

export function DriverOrders() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [failureDialogOpen, setFailureDialogOpen] = useState(false);
  const [failureOrder, setFailureOrder] = useState<DriverOrder | null>(null);
  const [failureReason, setFailureReason] = useState<DeliveryFailureReason>("NO_ANSWER");
  const [failureNote, setFailureNote] = useState("");

  const ordersQuery = useDriverOrders({
    status: statusFilter === "all" ? undefined : statusFilter,
    page,
    pageSize,
  });

  const detailQuery = useDriverOrder(detailOrderId || undefined, { enabled: Boolean(detailOrderId) });

  const updateStatusMutation = useMutation({
    mutationFn: ({
      id,
      to,
      reason,
      note,
    }: {
      id: string;
      to: OrderStatus;
      reason?: DeliveryFailureReason;
      note?: string;
    }) => updateDriverOrderStatus(id, { to, reason, note }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: DRIVER_ORDERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...DRIVER_ORDERS_QUERY_KEY, "detail", variables.id] });
    },
  });

  const handleStatusUpdate = async (orderId: string, to: OrderStatus) => {
    setUpdatingOrderId(orderId);
    try {
      await updateStatusMutation.mutateAsync({ id: orderId, to });
      toast.success(t("orders.updated", "Order updated"));
    } catch (error) {
      toast.error(getAdminErrorMessage(error, t));
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const openFailureDialog = (order: DriverOrder) => {
    setFailureOrder(order);
    setFailureReason("NO_ANSWER");
    setFailureNote("");
    setFailureDialogOpen(true);
  };

  const submitFailure = async () => {
    if (!failureOrder) return;
    setUpdatingOrderId(failureOrder.id);
    try {
      await updateStatusMutation.mutateAsync({
        id: failureOrder.id,
        to: "DELIVERY_FAILED",
        reason: failureReason,
        note: failureNote.trim() || undefined,
      });
      toast.success(t("orders.deliveryFailedRecorded", "Delivery marked as failed"));
      setFailureDialogOpen(false);
      setFailureOrder(null);
    } catch (error) {
      toast.error(getAdminErrorMessage(error, t));
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const items = ordersQuery.data?.items || [];
  const total = ordersQuery.data?.total || 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const formatTotal = (order: DriverOrder) => fmtCurrency(order.totalCents ?? 0);

  const emptyFallback = t("common.not_available", "N/A");

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("driverPortal.title", "Driver Orders")}</h1>
          <p className="text-muted-foreground">{t("driverPortal.subtitle", "View assigned orders and update delivery status")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as OrderStatus | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder={t("orders.status", "Status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all", "All")}</SelectItem>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusBadge(status, t).label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => ordersQuery.refetch()}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            {t("common.refresh", "Refresh")}
          </Button>
          <p className="text-xs text-muted-foreground">{t("driverPortal.refreshHint", "Auto-refresh every 15s")}</p>
        </div>
      </div>

      {ordersQuery.isLoading ? (
        <AdminTableSkeleton rows={4} columns={3} />
      ) : ordersQuery.isError ? (
        <ErrorState
          message={getAdminErrorMessage(ordersQuery.error, t, t("driverPortal.loadError", "Unable to load assigned orders"))}
          onRetry={() => ordersQuery.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title={t("driverPortal.emptyTitle", "No assigned orders")}
          description={t("driverPortal.emptyDesc", "You're all caught up. Check back soon.")}
        />
      ) : (
        <>
          <div className="space-y-4">
            {items.map((order) => {
              const meta = statusBadge(order.status, t);
              const canOutForDelivery = order.status === "PREPARING";
              const canDeliver = order.status === "OUT_FOR_DELIVERY";
              const canFail = order.status === "OUT_FOR_DELIVERY";
              const addressText = formatAddress(order.address, emptyFallback);
              const coordsAvailable = hasCoords(order.address);
              return (
                <Card key={order.id}>
                  <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {t("orders.code", "Code")} #{order.code || order.id}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{dayjs(order.createdAt).format("DD MMM YYYY HH:mm")}</p>
                    </div>
                    <Badge className={meta.color}>{meta.label}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <p className="text-muted-foreground">{t("orders.customer", "Customer")}</p>
                        <p className="font-medium">{order.customer?.name}</p>
                        {order.customer?.phone && <p className="text-xs text-muted-foreground">{order.customer.phone}</p>}
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t("orders.address", "Address")}</p>
                        <p className="font-medium">{addressText}</p>
                        {coordsAvailable && (
                          <p className="text-xs text-muted-foreground">
                            {order.address?.lat?.toFixed(5)}, {order.address?.lng?.toFixed(5)}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t("orders.total", "Total")}</p>
                        <p className="font-medium">{formatTotal(order)}</p>
                        {order.paymentMethod && (
                          <p className="text-xs text-muted-foreground">
                            {t("orders.payment", "Payment")}: {order.paymentMethod}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canOutForDelivery || updatingOrderId === order.id}
                        onClick={() => handleStatusUpdate(order.id, "OUT_FOR_DELIVERY")}
                      >
                        {t("orders.markOutForDelivery", "Out for delivery")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canDeliver || updatingOrderId === order.id}
                        onClick={() => handleStatusUpdate(order.id, "DELIVERED")}
                      >
                        {t("orders.markDelivered", "Mark delivered")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canFail || updatingOrderId === order.id}
                        onClick={() => openFailureDialog(order)}
                      >
                        {t("orders.markDeliveryFailed", "Delivery failed")}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setDetailOrderId(order.id)}>
                        {t("driverPortal.viewDetails", "View details")}
                      </Button>
                      {order.customer?.phone && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`tel:${order.customer.phone}`, "_self")}
                        >
                          <PhoneCall className="w-4 h-4 mr-2" />
                          {t("driverPortal.callCustomer", "Call customer")}
                        </Button>
                      )}
                      {coordsAvailable && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const lat = order.address?.lat as number;
                            const lng = order.address?.lng as number;
                            window.open(`https://maps.google.com/?q=${lat},${lng}`, "_blank", "noopener,noreferrer");
                          }}
                        >
                          <MapPin className="w-4 h-4 mr-2" />
                          {t("orders.trackingOpenMap", "Open map")}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground">
            <div>
              {t("common.pagination.label", { defaultValue: "Page {{page}} of {{count}}", page, count: pageCount })}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                {t("common.prev", "Prev")}
              </Button>
              <Button size="sm" variant="outline" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>
                {t("common.next", "Next")}
              </Button>
            </div>
          </div>
        </>
      )}

      <Dialog open={Boolean(detailOrderId)} onOpenChange={(open) => setDetailOrderId(open ? detailOrderId : null)}>
        <DialogContent className="max-w-3xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>{t("driverPortal.detailTitle", "Order details")}</DialogTitle>
          </DialogHeader>
          {detailQuery.isLoading ? (
            <AdminTableSkeleton rows={4} columns={2} />
          ) : detailQuery.isError ? (
            <ErrorState
              message={getAdminErrorMessage(detailQuery.error, t, t("driverPortal.detailError", "Unable to load order details"))}
              onRetry={() => detailQuery.refetch()}
            />
          ) : !detailQuery.data ? (
            <EmptyState title={t("orders.no_detail", "No details")} />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">{t("orders.summary", "Summary")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span>{t("orders.code", "Code")}</span>
                      <span className="font-semibold">{detailQuery.data.code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("orders.status", "Status")}</span>
                      <span>{statusBadge(detailQuery.data.status, t).label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("orders.createdAt", "Created")}</span>
                      <span>{dayjs(detailQuery.data.createdAt).format("DD MMM YYYY HH:mm")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("orders.payment", "Payment")}</span>
                      <span>{detailQuery.data.paymentMethod || emptyFallback}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("orders.total", "Total")}</span>
                      <span>{fmtCurrency(detailQuery.data.totalCents ?? 0)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">{t("orders.address", "Address")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm">{formatAddress(detailQuery.data.address, emptyFallback)}</div>
                    {hasCoords(detailQuery.data.address) && (
                      <div className="text-xs text-muted-foreground">
                        {detailQuery.data.address?.lat?.toFixed(5)}, {detailQuery.data.address?.lng?.toFixed(5)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t("orders.items", "Items")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {(detailQuery.data.items || []).length ? (
                    <div className="space-y-2">
                      {detailQuery.data.items?.map((item) => (
                        <div key={item.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {t("orders.qty", "Qty")}: {item.qty ?? 0}
                            </p>
                          </div>
                          {item.priceSnapshotCents != null && (
                            <div className="text-sm font-medium">{fmtCurrency(item.priceSnapshotCents)}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState title={t("orders.no_items", "No items")} />
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={failureDialogOpen}
        onOpenChange={(open) => {
          setFailureDialogOpen(open);
          if (!open) {
            setFailureOrder(null);
          }
        }}
      >
        <DialogContent className="max-w-md w-[95vw]">
          <DialogHeader>
            <DialogTitle>{t("orders.markDeliveryFailed", "Delivery failed")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            {failureOrder && (
              <p className="text-muted-foreground">
                {t("orders.code", "Code")} #{failureOrder.code || failureOrder.id}
              </p>
            )}
            <div className="space-y-2">
              <p className="text-muted-foreground">{t("orders.failureReason", "Failure reason")}</p>
              <Select
                value={failureReason}
                onValueChange={(value) => setFailureReason(value as DeliveryFailureReason)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("orders.failureReason", "Failure reason")} />
                </SelectTrigger>
                <SelectContent>
                  {FAILURE_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {t(`orders.failureReasons.${reason}`, reason)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground">{t("orders.failureNote", "Notes (optional)")}</p>
              <Textarea
                rows={3}
                placeholder={t("orders.failureNotePlaceholder", "Add context for ops")}
                value={failureNote}
                onChange={(event) => setFailureNote(event.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFailureDialogOpen(false)}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                onClick={submitFailure}
                disabled={!failureOrder || updatingOrderId === failureOrder?.id}
              >
                {updatingOrderId === failureOrder?.id
                  ? t("common.saving", "Saving...")
                  : t("orders.markDeliveryFailed", "Delivery failed")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
