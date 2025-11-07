import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { listOrders, getOrder, updateOrderStatus, OrderSummary } from "../../../services/orders.service";
import { fmtEGP } from "../../../lib/money";
import { toast } from "sonner";

// shadcn ui
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Separator } from "../../ui/separator";

// icons
import {
  Search,
  Eye,
  Package,
  CreditCard,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  Calendar,
  DollarSign,
  ShoppingBag,
  Users,
  MapPin,
} from "lucide-react";

const ALL = "ALL"; // Radix: avoid empty-string Select values

export function OrdersManagement(props?: any) {
  const { t } = useTranslation();

  // === state (same logic & shapes as your old page)
  type OrderStatus = OrderSummary["status"];
  type OrderListItem = OrderSummary;
  type OrderDetail = any;

  const [filters, setFilters] = useState({
    status: "" as "" | OrderStatus,
    from: "",
    to: "",
    customer: "",
    page: 1,
  });
  const pageSize = 20;
  const [items, setItems] = useState<OrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<OrderDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const locale = "ar-EG"; // same as old page

  // status badge UI
  const statusMeta = useMemo(
    () => ({
      PENDING: { label: t("orders.statuses.PENDING"), color: "bg-yellow-100 text-yellow-700", icon: Clock },
      PROCESSING: { label: t("orders.statuses.PROCESSING"), color: "bg-blue-100 text-blue-700", icon: Package },
      OUT_FOR_DELIVERY: {
        label: t("orders.statuses.OUT_FOR_DELIVERY"),
        color: "bg-purple-100 text-purple-700",
        icon: Truck,
      },
      DELIVERED: { label: t("orders.statuses.DELIVERED"), color: "bg-green-100 text-green-700", icon: CheckCircle },
      CANCELED: { label: t("orders.statuses.CANCELED"), color: "bg-red-100 text-red-700", icon: XCircle },
    }),
    [t]
  );

  // === data (same logic calls)
  async function load() {
    setLoading(true);
    const res = await listOrders({
      status: (filters.status || undefined) as OrderStatus | undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      customer: filters.customer || undefined,
      page: filters.page,
      pageSize,
    });
    setItems(res.items);
    setTotal(res.total);
    setLoading(false);
  }
  useEffect(() => {
    // same dependency as old: any filter change reloads
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  async function openDetail(id: string) {
    const detail = await getOrder(id);
    setSelected(detail);
    setDetailOpen(true);
  }

  // Deep-link from notifications: open a specific order
  useEffect(() => {
    const id = props?.adminState?.selectedOrder;
    if (!id) return;
    (async () => {
      try { await openDetail(String(id)); } catch {}
      finally { props?.updateAdminState?.({ selectedOrder: null }); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props?.adminState?.selectedOrder]);

  async function changeStatus(to: OrderStatus) {
    if (!selected) return;
    await updateOrderStatus(selected.id, { to });
    toast.success(t("orders.updated") || "Order updated");
    // refresh detail & list like old page
    await openDetail(selected.id);
    await load();
  }

  // quick stats (optional pretty header, derived from current page)
  const stats = useMemo(() => {
    const totalOnPage = items.length;
    const count = (s: OrderStatus) => items.filter((o) => o.status === s).length;
    const revenueCents = items.reduce((sum, o) => sum + o.totalCents, 0);
    return {
      totalOnPage,
      pending: count("PENDING"),
      processing: count("PROCESSING"),
      delivered: count("DELIVERED"),
      revenueCents,
    };
  }, [items]);

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-poppins text-2xl lg:text-3xl text-gray-900" style={{ fontWeight: 700 }}>
            {t("orders.title") || "Orders Management"}
          </h1>
          <p className="text-gray-600 mt-1 text-sm lg:text-base">
            {t("orders.subtitle") || "Track and manage customer orders"}
          </p>
        </div>
      </div>

      {/* Stats (derived from current page; has no effect on logic) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
        <Card>
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-gray-600">{t("orders.totalOnPage") || "Orders (this page)"}</p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900">{stats.totalOnPage}</p>
              </div>
              <ShoppingBag className="w-6 h-6 lg:w-8 lg:h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-gray-600">{t("orders.statuses.PENDING")}</p>
                <p className="text-xl lg:text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="w-6 h-6 lg:w-8 lg:h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-gray-600">{t("orders.statuses.PROCESSING")}</p>
                <p className="text-xl lg:text-2xl font-bold text-blue-600">{stats.processing}</p>
              </div>
              <Package className="w-6 h-6 lg:w-8 lg:h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-gray-600">{t("orders.statuses.DELIVERED")}</p>
                <p className="text-xl lg:text-2xl font-bold text-green-600">{stats.delivered}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t("orders.revenueOnPage") || "Revenue (this page)"}</p>
                <p className="text-2xl font-bold text-primary">{fmtEGP(stats.revenueCents)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters (same fields/behavior as old page) */}
      <Card>
        <CardContent className="p-3 lg:p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:gap-4">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={t("filters.searchPlaceholder") || "Search by name/phone/order id"}
                value={filters.customer}
                onChange={(e) => setFilters((f) => ({ ...f, customer: e.target.value, page: 1 }))}
                className="pl-10"
              />
            </div>

            <Select
              value={filters.status || ALL}
              onValueChange={(v) =>
                setFilters((f) => ({
                  ...f,
                  status: v === ALL ? "" : (v as OrderStatus),
                  page: 1,
                }))
              }
            >
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder={t("orders.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("common.all") || "All"}</SelectItem>
                <SelectItem value="PENDING">{t("orders.statuses.PENDING")}</SelectItem>
                <SelectItem value="PROCESSING">{t("orders.statuses.PROCESSING")}</SelectItem>
                <SelectItem value="OUT_FOR_DELIVERY">{t("orders.statuses.OUT_FOR_DELIVERY")}</SelectItem>
                <SelectItem value="DELIVERED">{t("orders.statuses.DELIVERED")}</SelectItem>
                <SelectItem value="CANCELED">{t("orders.statuses.CANCELED")}</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2 items-center">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="date"
                  value={filters.from}
                  onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value, page: 1 }))}
                  className="pl-10 w-44"
                />
              </div>
              <span className="text-gray-500">—</span>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="date"
                  value={filters.to}
                  onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value, page: 1 }))}
                  className="pl-10 w-44"
                />
              </div>
            </div>

            <Button onClick={() => load()} disabled={loading}>
              {t("app.actions.apply")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table (same columns/values as old page) */}
      <Card>
        <CardHeader>
          <CardTitle>{t("orders.listTitle", { count: items.length }) || `Orders (${items.length})`}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 lg:p-6">
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("dashboard.orderId")}</TableHead>
                  <TableHead>{t("dashboard.customer")}</TableHead>
                  <TableHead>{t("dashboard.total")}</TableHead>
                  <TableHead>{t("dashboard.createdAt")}</TableHead>
                  <TableHead>{t("dashboard.status")}</TableHead>
                  <TableHead className="text-right">{t("common.actions") || ""}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!items.length && (
                  <TableRow>
                    <TableCell colSpan={6}>{t("app.table.noData")}</TableCell>
                  </TableRow>
                )}
                {items.map((o) => {
                  const meta = statusMeta[o.status] ?? { label: o.status, color: "", icon: Clock };
                  const Icon = meta.icon;
                  return (
                    <TableRow key={o.id}>
                      <TableCell>
                        <div className="font-mono">{o.id}</div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{o.user?.name || o.user?.phone || "-"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{fmtEGP(o.totalCents)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{new Date(o.createdAt).toLocaleString(locale)}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={meta.color}>
                          <Icon className="w-3 h-3 mr-1" />
                          {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openDetail(o.id)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination (same logic) */}
          <div className="flex items-center gap-2 justify-end p-4">
            <Button
              variant="outline"
              disabled={filters.page === 1}
              onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
            >
              {t("app.actions.prev")}
            </Button>
            <span className="text-sm">
              {t("app.table.page")} {filters.page} {t("app.table.of")} {pageCount}
            </span>
            <Button
              variant="outline"
              disabled={filters.page * pageSize >= total}
              onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
            >
              {t("app.actions.next")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Details (Dialog instead of raw overlay; same data & actions) */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>
                {t("orders.detail")} — {selected?.id}
              </span>
              {selected && (
                <Select value={selected.status} onValueChange={(v) => changeStatus(v as OrderStatus)}>
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">{t("orders.statuses.PENDING")}</SelectItem>
                    <SelectItem value="PROCESSING">{t("orders.statuses.PROCESSING")}</SelectItem>
                    <SelectItem value="OUT_FOR_DELIVERY">{t("orders.statuses.OUT_FOR_DELIVERY")}</SelectItem>
                    <SelectItem value="DELIVERED">{t("orders.statuses.DELIVERED")}</SelectItem>
                    <SelectItem value="CANCELED">{t("orders.statuses.CANCELED")}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-gray-600" />
                      <h3 className="font-medium">{t("orders.customer")}</h3>
                    </div>
                    <p className="font-medium">{selected.user?.name || "-"}</p>
                    <p className="text-sm text-gray-600">{selected.user?.phone || "-"}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-gray-600" />
                      <h3 className="font-medium">{t("orders.address")}</h3>
                    </div>
                    <p className="text-sm">
                      {[selected.address?.label, selected.address?.city, selected.address?.street]
                        .filter(Boolean)
                        .join(" — ")}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="w-4 h-4 text-gray-600" />
                      <h3 className="font-medium">{t("orders.payment") || "Payment"}</h3>
                    </div>
                    <p className="text-sm">
                      {t("orders.subtotal")}: {fmtEGP(selected.subtotalCents)}
                    </p>
                    <p className="text-sm">
                      {t("orders.shipping")}: {fmtEGP(selected.shippingFeeCents)}
                    </p>
                    {selected.couponCode && (
                      <p className="text-sm">
                        {t("orders.coupon", "Coupon")}:
                        <span className="ml-1 font-mono">{selected.couponCode}</span>
                      </p>
                    )}
                    {selected.cartId && (
                      <p className="text-sm">
                        {t("orders.cartId", "Cart ID")}:
                        <span className="ml-1 font-mono">{selected.cartId}</span>
                      </p>
                    )}
                    <p className="text-sm font-semibold">
                      {t("orders.total")}: {fmtEGP(selected.totalCents)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Items */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("orders.items")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selected.items.map((it: any) => (
                      <div
                        key={it.productId}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{it.productNameSnapshot}</p>
                          <p className="text-sm text-gray-600">
                            {t("orders.qty")}: {it.qty}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{fmtEGP(it.priceSnapshotCents)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{t("orders.subtotal")}</span>
                      <span>{fmtEGP(selected.subtotalCents)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{t("orders.shipping")}</span>
                      <span>{fmtEGP(selected.shippingFeeCents)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{t("orders.discount")}</span>
                      <span>{fmtEGP(selected.discountCents)}</span>
                    </div>
                    <div className="flex justify-between font-medium text-lg pt-2 border-t">
                      <span>{t("orders.total")}</span>
                      <span>{fmtEGP(selected.totalCents)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              {selected.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t("orders.notes", "Notes")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm text-gray-800">{selected.notes}</p>
                  </CardContent>
                </Card>
              )}

              {/* History */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("orders.history")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selected.statusHistory.map((h: any, idx: number) => {
                      const from = t(`orders.statuses.${h.from}`);
                      const to = t(`orders.statuses.${h.to}`);
                      return (
                        <div key={idx} className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">
                              {from} → {to}
                            </p>
                            <p className="text-sm text-gray-600">
                              {new Date(h.createdAt).toLocaleString(locale)}
                            </p>
                            {h.note && <p className="text-sm mt-1">{t("orders.note")}: {h.note}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Quick status actions (same call) */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("orders.updateStatus")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(["PENDING", "PROCESSING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELED"] as OrderStatus[]).map(
                      (s) => (
                        <Button key={s} variant="outline" onClick={() => changeStatus(s)}>
                          {t(`orders.statuses.${s}`)}
                        </Button>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
