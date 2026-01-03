import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Switch } from "../../ui/switch";
import { AdminTableSkeleton } from "../common/AdminTableSkeleton";
import { EmptyState } from "../common/EmptyState";
import { ErrorState } from "../common/ErrorState";
import { Search, Truck, Filter, RefreshCcw, Receipt, Clock, PhoneCall, MessageCircle, Shield, MapPin } from "lucide-react";
import dayjs from "dayjs";
import { toast } from "sonner";
import { ORDERS_QUERY_KEY, useOrdersAdmin } from "../../../hooks/api/useOrdersAdmin";
import { useDeliveryDrivers } from "../../../hooks/api/useDeliveryDrivers";
import { useAssignDriver } from "../../../hooks/api/useAssignDriver";
import { useOrderReceipt } from "../../../hooks/api/useOrderReceipt";
import { cancelOrder, getOrder, getOrderDriverLocation, getOrderHistory, getOrderTransitions, updateOrderStatus } from "../../../services/orders.service";
import { fetchAutomationEvents } from "../../../services/automation.service";
import { getAdminErrorMessage } from "../../../lib/errors";
import { usePermissions } from "../../../auth/permissions";
import type { OrderDetail, OrderFilters, OrderStatus, OrderHistoryEntry, OrderTransition } from "../../../types/order";
import { fmtCurrency } from "../../../lib/money";
import { maskPhone } from "../../../lib/pii";
import { useDebounce } from "../../../hooks/useDebounce";
import { OrderReceiptView } from "./OrderReceiptView";
import { collectAllowedTargets, isTransitionAllowed } from "../../../lib/order-transitions";

type OrdersManagementProps = {
  initialOrderId?: string | null;
};

export function OrdersManagement({ initialOrderId }: OrdersManagementProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const perms = usePermissions();
  const isProvider = perms.role === "PROVIDER";
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(initialOrderId ?? null);
  const [detailOpen, setDetailOpen] = useState<boolean>(Boolean(initialOrderId));
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [driverSearch, setDriverSearch] = useState("");
  const [selectedDriverIdToAssign, setSelectedDriverIdToAssign] = useState<string>("");

  const [filters, setFilters] = useState<OrderFilters>({
    status: undefined,
    from: undefined,
    to: undefined,
    customer: "",
    driverId: undefined,
    page,
    pageSize,
  });
  const [stuckOnly, setStuckOnly] = useState(false);

  const debouncedCustomer = useDebounce(filters.customer || "", 300);
  const debouncedDriverSearch = useDebounce(driverSearch, 300);
  const customerTerm = useMemo(() => {
    const trimmed = debouncedCustomer?.trim();
    if (!trimmed) return undefined;
    // backend validation fails on very short search strings; require 3+ chars
    return trimmed.length < 3 ? undefined : trimmed;
  }, [debouncedCustomer]);
  const mergedFilters = useMemo(
    () => ({
      status: filters.status,
      from: filters.from,
      to: filters.to,
      driverId: filters.driverId,
      customer: customerTerm,
      page,
      pageSize,
    }),
    [filters.driverId, filters.from, filters.status, filters.to, customerTerm, page, pageSize]
  );

  const ordersQuery = useOrdersAdmin(mergedFilters);
  const items = ordersQuery.data?.items || [];
  const total = ordersQuery.data?.total || 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const isStuck = (order: OrderDetail | OrderFilters & any) => {
    const updated = order.updatedAt || order.createdAt;
    if (!updated) return false;
    const minutes = dayjs().diff(dayjs(updated), "minute");
    return minutes >= 30 && !["DELIVERED", "CANCELED"].includes((order.status || "").toUpperCase());
  };

  const visibleItems = useMemo(() => {
    const base = stuckOnly ? items.filter((o) => isStuck(o)) : items;
    const stuckFirst = [...base].sort((a, b) => Number(isStuck(b)) - Number(isStuck(a)));
    return stuckFirst;
  }, [items, stuckOnly]);

  const driverFilters = useMemo(
    () => ({ isActive: true, search: debouncedDriverSearch || undefined, page: 1, pageSize: 100 }),
    [debouncedDriverSearch]
  );

  const driversQuery = useDeliveryDrivers(driverFilters, { enabled: detailOpen && perms.canAssignDriver });

  const detailQuery = useQuery({
    queryKey: [...ORDERS_QUERY_KEY, "detail", selectedOrderId],
    queryFn: () => (selectedOrderId ? getOrder(selectedOrderId) : null),
    enabled: Boolean(selectedOrderId),
  });

  const transitionsQuery = useQuery({
    queryKey: [...ORDERS_QUERY_KEY, "transitions", selectedOrderId],
    queryFn: () => (selectedOrderId ? getOrderTransitions(selectedOrderId) : []),
    enabled: Boolean(selectedOrderId),
  });

  const historyQuery = useQuery({
    queryKey: [...ORDERS_QUERY_KEY, "history", selectedOrderId],
    queryFn: () => (selectedOrderId ? getOrderHistory(selectedOrderId) : []),
    enabled: perms.canViewHistory && Boolean(selectedOrderId),
  });

  const driverLocationQuery = useQuery({
    queryKey: [...ORDERS_QUERY_KEY, "driver-location", selectedOrderId],
    queryFn: () => (selectedOrderId ? getOrderDriverLocation(selectedOrderId) : null),
    enabled: detailOpen && Boolean(selectedOrderId),
    refetchInterval: detailQuery.data?.status === "OUT_FOR_DELIVERY" ? 15000 : false,
  });

  const receiptQuery = useOrderReceipt(selectedOrderId || undefined, {
    enabled: detailOpen && Boolean(selectedOrderId),
  });

  const automationQuery = useQuery({
    queryKey: [...ORDERS_QUERY_KEY, "automation", selectedOrderId, detailQuery.data?.code],
    queryFn: () => fetchAutomationEvents({ q: detailQuery.data?.code || selectedOrderId || "" }),
    enabled: perms.canViewAutomation && detailOpen && Boolean(detailQuery.data?.code || selectedOrderId),
  });

  const fallbackAutomationQuery = useQuery({
    queryKey: [...ORDERS_QUERY_KEY, "automation-fallback", selectedOrderId],
    queryFn: () => fetchAutomationEvents({ q: selectedOrderId || "" }),
    enabled:
      perms.canViewAutomation &&
      detailOpen &&
      Boolean(selectedOrderId) &&
      automationQuery.isSuccess &&
      (automationQuery.data?.items?.length || 0) === 0,
  });
  const automationItems =
    automationQuery.data?.items?.length && !automationQuery.isError
      ? automationQuery.data.items
      : fallbackAutomationQuery.data?.items || [];
  const automationLoading = automationQuery.isLoading || fallbackAutomationQuery.isLoading;
  const automationError = automationQuery.error || fallbackAutomationQuery.error;
  const automationUsedFallback =
    automationQuery.isSuccess && (automationQuery.data?.items?.length || 0) === 0 && (fallbackAutomationQuery.data?.items?.length || 0) > 0;

  const assignDriverMutation = useAssignDriver(selectedOrderId || "");
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, to }: { id: string; to: OrderStatus }) => updateOrderStatus(id, { to }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...ORDERS_QUERY_KEY, "transitions", selectedOrderId] });
      queryClient.invalidateQueries({ queryKey: [...ORDERS_QUERY_KEY, "history", selectedOrderId] });
    },
  });
  const cancelMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => cancelOrder(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...ORDERS_QUERY_KEY, "detail", selectedOrderId] });
    },
  });

  useEffect(() => {
    if (initialOrderId) {
      setSelectedOrderId(initialOrderId);
      setDetailOpen(true);
    }
  }, [initialOrderId]);

  useEffect(() => {
    if (detailQuery.data?.driver?.id) {
      setSelectedDriverIdToAssign(detailQuery.data.driver.id);
    } else {
      setSelectedDriverIdToAssign("");
    }
  }, [detailQuery.data?.driver?.id]);

  useEffect(() => {
    if (!detailOpen) {
      setReceiptOpen(false);
    }
  }, [detailOpen]);

  useEffect(() => {
    setReceiptOpen(false);
  }, [selectedOrderId]);

  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: visibleItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 6,
  });

  const baseStatuses: OrderStatus[] = ["PENDING", "PROCESSING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELED"];
  const statusFilterOptions = baseStatuses;
  const allowedTargets = useMemo(
    () => collectAllowedTargets(detailQuery.data?.allowedTransitions, transitionsQuery.data as OrderTransition[] | undefined),
    [detailQuery.data?.allowedTransitions, transitionsQuery.data]
  );

  const allowedStatusList = useMemo(() => {
    const set = new Set<OrderStatus>(baseStatuses);
    allowedTargets.forEach((s) => set.add(s));
    (transitionsQuery.data || []).forEach((t) => {
      set.add((t as OrderTransition).from);
      set.add((t as OrderTransition).to);
    });
    return Array.from(set);
  }, [allowedTargets, transitionsQuery.data]);

  const canTransitionTo = (target: OrderStatus) => isTransitionAllowed(target, allowedTargets);

  const assignNotAllowed = detailQuery.data?.status
    ? ["DELIVERED", "CANCELED"].includes((detailQuery.data.status || "").toUpperCase())
    : false;

  const statusBadge = (status: OrderStatus) => {
    const map: Record<OrderStatus, { color: string; label: string }> = {
      PENDING: { color: "bg-yellow-100 text-yellow-800", label: t("orders.statuses.PENDING", "Pending") },
      PROCESSING: { color: "bg-blue-100 text-blue-800", label: t("orders.statuses.PROCESSING", "Processing") },
      OUT_FOR_DELIVERY: {
        color: "bg-purple-100 text-purple-800",
        label: t("orders.statuses.OUT_FOR_DELIVERY", "Out for delivery"),
      },
      DELIVERED: { color: "bg-green-100 text-green-800", label: t("orders.statuses.DELIVERED", "Delivered") },
      CANCELED: { color: "bg-red-100 text-red-800", label: t("orders.statuses.CANCELED", "Canceled") },
    };
    return map[status];
  };

  const openDetail = (orderId: string) => {
    setSelectedOrderId(orderId);
    setDetailOpen(true);
  };

  const onAssignDriver = async () => {
    if (!selectedOrderId || !selectedDriverIdToAssign) return;
    if (!perms.canAssignDriver) {
      toast.error(t("orders.permission.assign", "You do not have permission to assign drivers."));
      return;
    }
    try {
      await assignDriverMutation.mutateAsync({ orderId: selectedOrderId, driverId: selectedDriverIdToAssign });
      toast.success(t("orders.driverAssigned", "Driver assigned"));
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
      detailQuery.refetch();
    } catch (error) {
      toast.error(getAdminErrorMessage(error, t));
    }
  };

  const onStatusChange = async (to: OrderStatus) => {
    if (!selectedOrderId) return;
    if (!perms.canUpdateOrders) {
      toast.error(t("orders.permission.update", "You do not have permission to update orders."));
      return;
    }
    if (!canTransitionTo(to)) {
      toast.error(t("orders.transition_blocked", "Transition not allowed by backend policy"));
      return;
    }
    if (detailQuery.data?.status === to) return;
    try {
      await updateStatusMutation.mutateAsync({ id: selectedOrderId, to });
      toast.success(t("orders.updated", "Order updated"));
      detailQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
    } catch (error) {
      toast.error(getAdminErrorMessage(error, t));
    }
  };

  const onCancelOrder = async () => {
    if (!selectedOrderId) return;
    if (!perms.canCancelOrder) {
      toast.error(t("orders.permission.cancel", "You do not have permission to cancel orders."));
      return;
    }
    try {
      await cancelMutation.mutateAsync({ id: selectedOrderId });
      toast.success(t("orders.canceled", "Order canceled"));
      detailQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
    } catch (error) {
      toast.error(getAdminErrorMessage(error, t));
    }
  };

  const resetFilters = () => {
    setFilters({
      status: undefined,
      from: undefined,
      to: undefined,
      customer: "",
      driverId: undefined,
      page,
      pageSize,
    });
    setPage(1);
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("orders.title", "Orders")}</h1>
          <p className="text-muted-foreground">{t("orders.subtitle", "Track and manage customer orders")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => ordersQuery.refetch()}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            {t("common.refresh", "Refresh")}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            {t("common.filters", "Filters")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder={t("orders.searchCustomer", "Search by customer or code")}
                value={filters.customer}
                onChange={(e) => {
                  setPage(1);
                  setFilters((prev) => ({ ...prev, customer: e.target.value }));
                }}
              />
            </div>
            <Select
              value={filters.status || "all"}
              onValueChange={(val) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, status: val === "all" ? undefined : (val as OrderStatus) }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("orders.status_filter", "Status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                {statusFilterOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusBadge(s).label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isProvider && (
              <Select
                value={filters.driverId || "all"}
                onValueChange={(val) => {
                  setPage(1);
                  setFilters((prev) => ({ ...prev, driverId: val === "all" ? undefined : val }));
                }}
              >
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
            )}
            <div className="flex items-center gap-2">
              <Switch
                id="stuckOnly"
                checked={stuckOnly}
                onCheckedChange={(checked) => {
                  setPage(1);
                  setStuckOnly(Boolean(checked));
                }}
              />
              <label htmlFor="stuckOnly" className="text-sm flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {t("orders.stuckOnly", "Stuck > 30m")}
              </label>
            </div>
            <Button variant="outline" className="w-full md:w-auto" onClick={resetFilters}>
              {t("common.resetFilters", "Reset filters")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="hidden md:grid grid-cols-[1.2fr,1fr,1fr,1fr,0.8fr,0.8fr] text-xs font-medium text-muted-foreground px-4 py-2 border-b">
            <span>{t("orders.code", "Code")}</span>
            <span>{t("orders.customer", "Customer")}</span>
            <span>{t("orders.createdAt", "Created")}</span>
            <span>{t("orders.amount", "Amount")}</span>
            <span>{t("orders.driver", "Driver")}</span>
            <span className="text-right">{t("orders.status", "Status")}</span>
          </div>
          {ordersQuery.isLoading ? (
            <div className="p-4">
              <AdminTableSkeleton rows={5} columns={6} />
            </div>
          ) : ordersQuery.isError ? (
            <ErrorState
              message={getAdminErrorMessage(ordersQuery.error, t, t("orders.loadError", "Unable to load orders"))}
              onRetry={() => ordersQuery.refetch()}
            />
          ) : items.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title={t("orders.empty", "No orders found")}
                description={t("orders.emptyDesc", "Try changing the filters")}
              />
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <div ref={parentRef} style={{ height: "60vh", overflow: "auto", position: "relative" }}>
                  <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const order = visibleItems[virtualRow.index];
                      const meta = statusBadge(order.status);
                      const phone = perms.canViewPII ? order.customer?.phone : maskPhone(order.customer?.phone);
                      const driverPhone = perms.canViewPII ? order.driver?.phone : maskPhone(order.driver?.phone);
                      return (
                        <div
                          key={order.id}
                          className="grid grid-cols-[1.2fr,1fr,1fr,1fr,0.8fr,0.8fr] px-4 py-3 border-b hover:bg-muted/60 cursor-pointer"
                          style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${virtualRow.start}px)` }}
                          onClick={() => openDetail(order.id)}
                        >
                          <div className="font-semibold">{order.code || order.id}</div>
                          <div className="space-y-0.5">
                            <p className="font-medium">{order.customer?.name}</p>
                            <p className="text-xs text-muted-foreground">{phone}</p>
                          </div>
                          <div className="text-sm text-muted-foreground">{dayjs(order.createdAt).format("DD MMM HH:mm")}</div>
                          <div className="font-semibold">{fmtCurrency(order.totalCents, order.currency || "EGP")}</div>
                          <div className="text-sm text-muted-foreground">
                            {order.driver?.fullName ? (
                              <span className="inline-flex items-center gap-1">
                                <Truck className="w-4 h-4" />
                                {order.driver.fullName}
                                {driverPhone ? ` (${driverPhone})` : ""}
                              </span>
                            ) : (
                              "-"
                            )}
                          </div>
                          <div className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isStuck(order) && <Badge variant="outline">{t("orders.stuck", "Stuck")}</Badge>}
                              <Badge className={meta.color}>{meta.label}</Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="md:hidden space-y-3 p-4">
                {visibleItems.map((order) => {
                  const meta = statusBadge(order.status);
                  const phone = perms.canViewPII ? order.customer?.phone : maskPhone(order.customer?.phone);
                  const driverPhone = perms.canViewPII ? order.driver?.phone : maskPhone(order.driver?.phone);
                  return (
                    <div
                      key={order.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openDetail(order.id)}
                      onKeyDown={(event) => event.key === "Enter" && openDetail(order.id)}
                      className="rounded-lg border bg-card shadow-sm p-3 focus:outline-none focus:ring-2 focus:ring-primary/60"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">#{order.code || order.id}</p>
                          <p className="text-xs text-muted-foreground">{dayjs(order.createdAt).format("DD MMM HH:mm")}</p>
                        </div>
                        <Badge className={meta.color}>{meta.label}</Badge>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">{t("orders.customer")}</p>
                          <p className="font-medium">{order.customer?.name || "-"}</p>
                          <p className="text-xs text-muted-foreground">{phone}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-muted-foreground">{t("orders.amount")}</p>
                          <p className="font-semibold">{fmtCurrency(order.totalCents, order.currency || "EGP")}</p>
                        </div>
                        <div className="col-span-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <Truck className="w-4 h-4" />
                          <span>
                            {order.driver?.fullName || t("orders.driver", "Driver")}
                            {driverPhone ? ` - ${driverPhone}` : ""}
                          </span>
                        </div>
                        {isStuck(order) && (
                          <div className="col-span-2">
                            <Badge variant="outline">{t("orders.stuck", "Stuck > 30m")}</Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t text-sm text-muted-foreground">
                <div>
                  {t("common.pagination.label", { defaultValue: "Page {{page}} of {{count}}", page, count: pageCount })}
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
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
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-5xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>{t("orders.detail", "Order details")}</DialogTitle>
          </DialogHeader>
          {detailQuery.isLoading ? (
            <AdminTableSkeleton rows={4} columns={3} />
          ) : detailQuery.isError ? (
            <ErrorState
              message={getAdminErrorMessage(detailQuery.error, t, t("orders.detailError", "Unable to load order details"))}
              onRetry={() => detailQuery.refetch()}
            />
          ) : !detailQuery.data ? (
            <EmptyState title={t("orders.no_detail", "No details")} />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">{t("orders.summary", "Summary")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>{t("orders.code", "Code")}</span>
                      <span className="font-semibold">{detailQuery.data.code || detailQuery.data.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("orders.createdAt", "Created")}</span>
                      <span>{dayjs(detailQuery.data.createdAt).format("DD MMM YYYY HH:mm")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("orders.customer", "Customer")}</span>
                      <span className="font-semibold">{detailQuery.data.customer?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("orders.phone", "Phone")}</span>
                      <span>{perms.canViewPII ? detailQuery.data.customer?.phone : maskPhone(detailQuery.data.customer?.phone)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">{t("orders.status", "Status")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Select value={detailQuery.data.status} onValueChange={(val) => onStatusChange(val as OrderStatus)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {allowedStatusList.map((s) => (
                          <SelectItem key={s} value={s} disabled={!canTransitionTo(s as OrderStatus)}>
                            {statusBadge(s).label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!perms.canUpdateOrders && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        {t("orders.permission.update", "You do not have permission to update orders.")}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {perms.canAssignDriver && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-sm">{t("orders.assignDriver", "Assign driver")}</CardTitle>
                      <Truck className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <Input
                          placeholder={t("orders.searchDriver", "Search drivers")}
                          value={driverSearch}
                          onChange={(e) => setDriverSearch(e.target.value)}
                        />
                      </div>
                      <Select value={selectedDriverIdToAssign} onValueChange={(val) => setSelectedDriverIdToAssign(val)}>
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
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={onAssignDriver}
                          disabled={!selectedDriverIdToAssign || assignDriverMutation.isPending || assignNotAllowed}
                        >
                          {assignDriverMutation.isPending
                            ? t("common.saving", "Saving...")
                            : t("orders.assignDriver", "Assign driver")}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => driversQuery.refetch()}>
                          {t("common.refresh", "Refresh")}
                        </Button>
                      </div>
                      {assignNotAllowed && (
                        <p className="text-xs text-orange-600">
                          {t("orders.assignDriverDisabled", "Driver assignment is blocked for completed or canceled orders.")}
                        </p>
                      )}
                      {detailQuery.data.driver ? (
                        <div className="text-sm text-muted-foreground">
                          {t("orders.currentDriver", "Current:")} {detailQuery.data.driver.fullName} -{" "}
                          {perms.canViewPII ? detailQuery.data.driver.phone : maskPhone(detailQuery.data.driver.phone)}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">{t("orders.noDriver", "No driver assigned")}</div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Receipt className="w-4 h-4" />
                      {t("orders.receipt", "Receipt")}
                    </CardTitle>
                    <Button size="sm" variant="outline" onClick={() => setReceiptOpen(true)} disabled={!selectedOrderId}>
                      {t("orders.viewReceipt", "View receipt")}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <OrderReceiptView receipt={receiptQuery.data || null} isLoading={receiptQuery.isLoading} />
                  </CardContent>
                </Card>

                {perms.canViewAutomation && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MessageCircle className="w-4 h-4" />
                        {t("orders.automation", "Automation / Notifications")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {automationItems.length ? (
                        <div className="flex items-center justify-between text-sm">
                          <div className="space-y-1">
                            <p className="text-muted-foreground">{t("orders.lastAutomation", "Last automation status")}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant={["FAILED", "DEAD"].includes((automationItems[0].status || "").toUpperCase()) ? "destructive" : "outline"}>
                                {automationItems[0].status}
                              </Badge>
                              {automationItems[0].lastHttpStatus ? (
                                <span className="text-xs text-muted-foreground">HTTP {automationItems[0].lastHttpStatus}</span>
                              ) : null}
                            </div>
                            {automationItems[0].lastErrorSnippet ? (
                              <p className="text-xs text-red-600 line-clamp-2">{automationItems[0].lastErrorSnippet}</p>
                            ) : null}
                            {automationItems[0].lastResponseSnippet ? (
                              <p className="text-xs text-muted-foreground line-clamp-2">{automationItems[0].lastResponseSnippet}</p>
                            ) : null}
                            {automationUsedFallback && (
                              <p className="text-[11px] text-muted-foreground">
                                {t("orders.automation_fallback", "Using fallback search by order ID because order code was not present in payload.")}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : null}
                      {automationLoading ? (
                        <AdminTableSkeleton rows={2} columns={3} />
                      ) : automationError ? (
                        <ErrorState
                          message={getAdminErrorMessage(automationError, t)}
                          onRetry={() => {
                            automationQuery.refetch();
                            fallbackAutomationQuery.refetch();
                          }}
                        />
                      ) : automationItems.length ? (
                        <div className="space-y-2">
                          {automationItems.slice(0, 4).map((evt) => (
                            <div key={evt.id} className="flex items-start justify-between gap-3 border-b last:border-0 pb-2">
                              <div>
                                <p className="font-medium text-sm">{evt.type}</p>
                                <p className="text-xs text-muted-foreground">{evt.correlationId || detailQuery.data.code}</p>
                                {evt.lastErrorSnippet && (
                                  <p className="text-xs text-red-600 line-clamp-2">{evt.lastErrorSnippet}</p>
                                )}
                              </div>
                              <Badge variant={evt.status === "FAILED" || evt.status === "DEAD" ? "destructive" : "outline"}>
                                {evt.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {t("orders.no_automation_hint", "No automation events found for this order (may be older data or backfill pending).")}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {t("orders.tracking", "Live tracking")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {driverLocationQuery.isLoading && (
                      <p className="text-muted-foreground">{t("orders.trackingLoading", "Loading location...")}</p>
                    )}
                    {!driverLocationQuery.isLoading && !driverLocationQuery.data && (
                      <p className="text-muted-foreground">{t("orders.trackingEmpty", "No driver location yet.")}</p>
                    )}
                    {driverLocationQuery.data && (
                      <>
                        <div className="flex justify-between">
                          <span>{t("orders.trackingUpdated", "Updated")}</span>
                          <span>{dayjs(driverLocationQuery.data.recordedAt).format("DD MMM YYYY HH:mm")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t("orders.trackingCoords", "Coordinates")}</span>
                          <span>
                            {driverLocationQuery.data.lat.toFixed(5)}, {driverLocationQuery.data.lng.toFixed(5)}
                          </span>
                        </div>
                        {detailQuery.data?.estimatedDeliveryTime && (
                          <div className="flex justify-between">
                            <span>{t("orders.trackingEta", "ETA")}</span>
                            <span>{detailQuery.data.estimatedDeliveryTime}</span>
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const { lat, lng } = driverLocationQuery.data!;
                            window.open(`https://maps.google.com/?q=${lat},${lng}`, "_blank", "noopener,noreferrer");
                          }}
                        >
                          {t("orders.trackingOpenMap", "Open map")}
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {t("orders.history", "Status history")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!perms.canViewHistory ? (
                    <p className="text-sm text-muted-foreground">{t("orders.permission.history", "You do not have permission to view history.")}</p>
                  ) : historyQuery.isLoading ? (
                      <AdminTableSkeleton rows={3} columns={2} />
                    ) : historyQuery.isError ? (
                      <ErrorState
                        message={getAdminErrorMessage(historyQuery.error, t, t("orders.history_error", "Unable to load history"))}
                        onRetry={() => historyQuery.refetch()}
                      />
                    ) : (historyQuery.data || []).length ? (
                      <ul className="space-y-2">
                        {(historyQuery.data as OrderHistoryEntry[]).map((entry) => (
                          <li key={entry.id} className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-sm">
                                {entry.from ? `${entry.from} -> ${entry.to}` : entry.to}
                              </p>
                              {entry.note && <p className="text-xs text-muted-foreground">{entry.note}</p>}
                            </div>
                            <div className="text-xs text-muted-foreground text-right">
                              <p>{dayjs(entry.at).format("DD MMM HH:mm")}</p>
                              {entry.actor && <p>{entry.actor}</p>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <EmptyState title={t("orders.no_history", "No history yet")} />
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <PhoneCall className="w-4 h-4" />
                      {t("orders.actions", "Actions")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!perms.canCancelOrder || cancelMutation.isPending}
                        onClick={onCancelOrder}
                        title={!perms.canCancelOrder ? t("orders.permission.cancel", "No permission") : undefined}
                      >
                        {cancelMutation.isPending ? t("common.saving", "Saving...") : t("orders.cancel", "Cancel")}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => driversQuery.refetch()}>
                        {t("common.refresh", "Refresh")}
                      </Button>
                    </div>
                    {!perms.canCancelOrder && (
                      <p className="text-xs text-muted-foreground">
                        {t("orders.permission.cancel", "You do not have permission to cancel orders.")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-5xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>{t("orders.receipt", "Receipt")}</DialogTitle>
          </DialogHeader>
          <OrderReceiptView receipt={receiptQuery.data || null} isLoading={receiptQuery.isLoading} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

