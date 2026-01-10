import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import { PhoneCall } from "lucide-react";
import { useOrdersAdmin, ORDERS_QUERY_KEY } from "../../../hooks/api/useOrdersAdmin";
import { useDeliveryDrivers } from "../../../hooks/api/useDeliveryDrivers";
import { assignDriverToOrder, cancelOrder, updateOrderStatus } from "../../../services/orders.service";
import { getAdminErrorMessage } from "../../../lib/errors";
import { fmtCurrency } from "../../../lib/money";
import { maskPhone } from "../../../lib/pii";
import { usePermissions } from "../../../auth/permissions";
import type { DeliveryFailureReason, Order, OrderStatus } from "../../../types/order";

const FAILURE_REASONS: DeliveryFailureReason[] = [
  "NO_ANSWER",
  "WRONG_ADDRESS",
  "UNSAFE_LOCATION",
  "CUSTOMER_REQUESTED_RESCHEDULE",
];

export function FailedDeliveriesQueue() {
  const { t } = useTranslation();
  const perms = usePermissions();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [reasonFilter, setReasonFilter] = useState<DeliveryFailureReason | "all">("all");
  const [driverFilter, setDriverFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [assigningOrder, setAssigningOrder] = useState<Order | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [assignNote, setAssignNote] = useState("");

  const ordersQuery = useOrdersAdmin({
    status: "DELIVERY_FAILED",
    driverId: driverFilter !== "all" ? driverFilter : undefined,
    page,
    pageSize,
  });

  const driversQuery = useDeliveryDrivers({ isActive: true, page: 1, pageSize: 200 });
  const items = ordersQuery.data?.items || [];
  const total = ordersQuery.data?.total || 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const filteredItems = useMemo(() => {
    const from = fromDate ? dayjs(fromDate).startOf("day") : null;
    const to = toDate ? dayjs(toDate).endOf("day") : null;
    return items.filter((order) => {
      if (reasonFilter !== "all" && order.deliveryFailedReason !== reasonFilter) {
        return false;
      }
      if (from || to) {
        if (!order.deliveryFailedAt) return false;
        const failedAt = dayjs(order.deliveryFailedAt);
        if (from && failedAt.isBefore(from)) return false;
        if (to && failedAt.isAfter(to)) return false;
      }
      return true;
    });
  }, [items, reasonFilter, fromDate, toDate]);

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, to, note }: { id: string; to: OrderStatus; note?: string }) =>
      updateOrderStatus(id, { to, note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => cancelOrder(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ orderId, driverId }: { orderId: string; driverId: string }) =>
      assignDriverToOrder(orderId, driverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
    },
  });

  const handleReschedule = async (order: Order) => {
    if (!perms.canUpdateOrders) {
      toast.error(t("orders.permission.update", "You do not have permission to update orders."));
      return;
    }
    try {
      await updateStatusMutation.mutateAsync({
        id: order.id,
        to: "PREPARING",
        note: t("orders.rescheduledNote", "Rescheduled after delivery failed"),
      });
      toast.success(t("orders.rescheduled", "Order rescheduled"));
    } catch (error) {
      toast.error(getAdminErrorMessage(error, t));
    }
  };

  const handleCancel = async (order: Order) => {
    if (!perms.canCancelOrder) {
      toast.error(t("orders.permission.cancel", "You do not have permission to cancel orders."));
      return;
    }
    try {
      await cancelMutation.mutateAsync({
        id: order.id,
        note: t("orders.cancelAfterFailure", "Canceled after delivery failed"),
      });
      toast.success(t("orders.canceled", "Order canceled"));
    } catch (error) {
      toast.error(getAdminErrorMessage(error, t));
    }
  };

  const openAssign = (order: Order) => {
    setAssigningOrder(order);
    setSelectedDriverId(order.driver?.id ?? "");
    setAssignNote("");
  };

  const handleAssign = async () => {
    if (!assigningOrder || !selectedDriverId) return;
    if (!perms.canAssignDriver) {
      toast.error(t("orders.permission.assign", "You do not have permission to assign drivers."));
      return;
    }
    try {
      await updateStatusMutation.mutateAsync({
        id: assigningOrder.id,
        to: "PREPARING",
        note: assignNote.trim() || t("orders.rescheduledNote", "Rescheduled after delivery failed"),
      });
      await assignMutation.mutateAsync({ orderId: assigningOrder.id, driverId: selectedDriverId });
      toast.success(t("orders.driverAssigned", "Driver assigned"));
      setAssigningOrder(null);
      setSelectedDriverId("");
      setAssignNote("");
    } catch (error) {
      toast.error(getAdminErrorMessage(error, t));
    }
  };

  const copyPhone = async (phone?: string | null) => {
    if (!phone) return;
    try {
      await navigator.clipboard.writeText(phone);
      toast.success(t("orders.phoneCopied", "Phone copied"));
    } catch {
      window.open(`tel:${phone}`, "_self");
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("failedDeliveries.title", "Failed deliveries")}</h1>
          <p className="text-muted-foreground">
            {t("failedDeliveries.subtitle", "Review delivery failures and decide the next action")}
          </p>
        </div>
        <Button variant="outline" onClick={() => ordersQuery.refetch()}>
          {t("common.refresh", "Refresh")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("common.filters", "Filters")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Select value={reasonFilter} onValueChange={(value) => setReasonFilter(value as any)}>
            <SelectTrigger>
              <SelectValue placeholder={t("orders.failureReason", "Failure reason")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all", "All")}</SelectItem>
              {FAILURE_REASONS.map((reason) => (
                <SelectItem key={reason} value={reason}>
                  {t(`orders.failureReasons.${reason}`, reason)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={driverFilter} onValueChange={(value) => setDriverFilter(value)}>
            <SelectTrigger>
              <SelectValue placeholder={t("orders.driver_filter", "Driver")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all", "All")}</SelectItem>
              {(driversQuery.data?.items || []).map((driver) => (
                <SelectItem key={driver.id} value={driver.id}>
                  {driver.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            placeholder={t("orders.filterFrom", "From")}
          />
          <Input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            placeholder={t("orders.filterTo", "To")}
          />
        </CardContent>
      </Card>

      {ordersQuery.isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">{t("common.loading", "Loading...")}</CardContent>
        </Card>
      ) : ordersQuery.isError ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {getAdminErrorMessage(ordersQuery.error, t, t("orders.loadError", "Unable to load orders"))}
          </CardContent>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {t("failedDeliveries.empty", "No failed deliveries match your filters.")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((order) => {
            const customerPhone = perms.canViewPII ? order.customer?.phone : maskPhone(order.customer?.phone);
            const reasonLabel = order.deliveryFailedReason
              ? t(`orders.failureReasons.${order.deliveryFailedReason}`, order.deliveryFailedReason)
              : t("orders.failureReasonUnknown", "Unknown");
            const failedAtText = order.deliveryFailedAt
              ? dayjs(order.deliveryFailedAt).format("DD MMM YYYY HH:mm")
              : t("common.not_available", "N/A");
            return (
              <Card key={order.id}>
                <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {t("orders.code", "Code")} #{order.code || order.id}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {t("orders.failedAt", "Failed at")}: {failedAtText}
                    </p>
                    {order.orderGroupId && (
                      <p className="text-xs text-muted-foreground">
                        {t("orders.groupId", "Group")} #{order.orderGroupId}
                      </p>
                    )}
                  </div>
                  <Badge className="bg-orange-100 text-orange-800">{reasonLabel}</Badge>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <p className="text-muted-foreground">{t("orders.customer", "Customer")}</p>
                      <p className="font-medium">{order.customer?.name}</p>
                      {customerPhone && <p className="text-xs text-muted-foreground">{customerPhone}</p>}
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("orders.driver", "Driver")}</p>
                      <p className="font-medium">{order.driver?.fullName ?? t("orders.noDriver", "Unassigned")}</p>
                      {order.driver?.phone && <p className="text-xs text-muted-foreground">{order.driver.phone}</p>}
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("orders.total", "Total")}</p>
                      <p className="font-medium">{fmtCurrency(order.totalCents ?? 0)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("orders.status", "Status")}</p>
                      <p className="font-medium">{t("orders.statuses.DELIVERY_FAILED", "Delivery failed")}</p>
                    </div>
                  </div>
                  {order.deliveryFailedNote && (
                    <p className="text-xs text-muted-foreground">
                      {t("orders.failureNote", "Notes")}: {order.deliveryFailedNote}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => openAssign(order)}>
                      {t("orders.reassign", "Reassign")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleReschedule(order)}>
                      {t("orders.reschedule", "Reschedule")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleCancel(order)}>
                      {t("orders.cancel", "Cancel")}
                    </Button>
                    {order.customer?.phone && (
                      <Button size="sm" variant="outline" onClick={() => copyPhone(order.customer?.phone)}>
                        <PhoneCall className="w-4 h-4 mr-2" />
                        {t("orders.contactCustomer", "Contact")}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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

      <Dialog open={Boolean(assigningOrder)} onOpenChange={(open) => setAssigningOrder(open ? assigningOrder : null)}>
        <DialogContent className="max-w-md w-[95vw]">
          <DialogHeader>
            <DialogTitle>{t("orders.reassign", "Reassign")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <Select value={selectedDriverId} onValueChange={(value) => setSelectedDriverId(value)}>
              <SelectTrigger>
                <SelectValue placeholder={t("orders.selectDriver", "Select driver")} />
              </SelectTrigger>
              <SelectContent>
                {(driversQuery.data?.items || []).map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.fullName} {driver.phone ? `(${driver.phone})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              rows={3}
              placeholder={t("orders.rescheduleNote", "Add a note for ops")}
              value={assignNote}
              onChange={(event) => setAssignNote(event.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAssigningOrder(null)}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button onClick={handleAssign} disabled={!selectedDriverId || assignMutation.isPending}>
                {assignMutation.isPending ? t("common.saving", "Saving...") : t("orders.reassign", "Reassign")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
