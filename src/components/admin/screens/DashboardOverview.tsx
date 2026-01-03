import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useDashboardAdmin } from "../../../hooks/api/useDashboardAdmin";
import { fmtEGP } from "../../../lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Skeleton } from "../../ui/skeleton";
import { AlertTriangle } from "lucide-react";
import { ErrorState } from "../common/ErrorState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { ShoppingCart, Users, DollarSign, TrendingUp, ArrowRight, Flame, Truck, UserCheck } from "lucide-react";

export type AdminState = {
  currentScreen: "dashboard" | "products" | "categories" | "orders" | "customers" | "settings";
};

type Props = {
  adminState?: AdminState;
  updateAdminState?: (updates: Partial<AdminState>) => void;
};

type RangeOption = "7d" | "30d" | "90d";
type MetricOption = "revenue" | "orders";
type TimeseriesPoint = { period: string; revenueCents: number; orders: number };

function getDateRange(range: RangeOption) {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  return { from: start.toISOString(), to: end.toISOString() };
}

export function DashboardOverview({ updateAdminState }: Props) {
  const { t, i18n } = useTranslation();
  const [range, setRange] = useState<RangeOption>("7d");
  const [metric, setMetric] = useState<MetricOption>("revenue");
  const rangeFilter = useMemo(() => getDateRange(range), [range]);
  const granularity = range === "90d" ? "week" : "day";

  const { summaryQuery, seriesQuery } = useDashboardAdmin(rangeFilter, granularity as "day" | "week");

  const summary = summaryQuery.data;
  const seriesData = (seriesQuery.data as TimeseriesPoint[] | undefined) || [];
  const chartData = useMemo(
    () =>
      seriesData.map((point) => ({
        name: new Date(point.period).toLocaleDateString(i18n.language === "ar" ? "ar-EG" : undefined, {
          day: "numeric",
          month: "short",
        }),
        revenue: Math.round((point.revenueCents || 0) / 100),
        orders: point.orders || 0,
      })),
    [seriesData, i18n.language]
  );

  const topProducts = summary?.topProducts?.slice(0, 5) || [];
  const topCategories = summary?.topCategories?.slice(0, 5) || [];
  const recentOrders = summary?.recent?.slice(0, 5) || [];
  const lowStock = summary?.lowStock?.slice(0, 5) || [];
  const resolveOrderStatus = React.useCallback(
    (status?: string) => (status ? t(`orders.statuses.${status}`, { defaultValue: status }) : ""),
    [t]
  );

  const hasError = summaryQuery.isError || seriesQuery.isError;

  const stats = summary
    ? [
        {
          label: t("dashboard.revenue", "Total revenue"),
          value: fmtEGP(summary.sales.totalRevenueCents, i18n.language === "ar" ? "ar-EG" : "en-EG"),
          icon: DollarSign,
        },
        {
          label: t("dashboard.orders", "Orders"),
          value: summary.sales.totalOrders.toLocaleString(),
          icon: ShoppingCart,
        },
        {
          label: t("dashboard.avgOrder", "Avg. order"),
          value: fmtEGP(summary.sales.avgOrderValueCents, i18n.language === "ar" ? "ar-EG" : "en-EG"),
          icon: TrendingUp,
        },
        {
          label: t("dashboard.customers", "Customers"),
          value: (summary.customersCount ?? 0).toLocaleString(),
          icon: Users,
        },
        {
          label: t("dashboard.activeOrders", "Active orders"),
          value: (summary.activeOrders ?? 0).toLocaleString(),
          icon: Truck,
        },
        {
          label: t("dashboard.activeDrivers", "Active drivers"),
          value: (summary.activeDrivers ?? 0).toLocaleString(),
          icon: UserCheck,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {hasError && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">
                {t("dashboard.load_failed", "We couldn't load dashboard data. Please try again.")}
              </p>
              <p className="text-xs text-amber-700">
                {t("dashboard.retry_hint", "Check your connection or refresh the page.")}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => { summaryQuery.refetch(); seriesQuery.refetch(); }}>
              {t("app.actions.refresh", "Refresh")}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl lg:text-3xl font-semibold text-foreground">{t("dashboard.title", "Analytics overview")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("dashboard.subtitle", "Monitor sales, orders, and inventory performance in real-time")}
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={range} onValueChange={(value) => setRange(value as RangeOption)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">{t("dashboard.range_7", "Last 7 days")}</SelectItem>
              <SelectItem value="30d">{t("dashboard.range_30", "Last 30 days")}</SelectItem>
              <SelectItem value="90d">{t("dashboard.range_90", "Last 90 days")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={metric} onValueChange={(value) => setMetric(value as MetricOption)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">{t("dashboard.metric_revenue", "Revenue")}</SelectItem>
              <SelectItem value="orders">{t("dashboard.metric_orders", "Orders")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
        {summaryQuery.isLoading
          ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28" />)
          : stats.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-semibold">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t("dashboard.salesTrend", "Sales trend")}</CardTitle>
              <p className="text-xs text-muted-foreground">{t("dashboard.salesHint", "Revenue and orders for the selected period")}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => summaryQuery.refetch()}>
              {t("app.actions.refresh", "Refresh")}
            </Button>
          </CardHeader>
          <CardContent className="h-72">
            {seriesQuery.isLoading ? (
              <Skeleton className="h-full" />
            ) : seriesQuery.isError ? (
              <ErrorState
                message={t("dashboard.load_failed", "We couldn't load dashboard data. Please try again.")}
                onRetry={() => {
                  seriesQuery.refetch();
                  summaryQuery.refetch();
                }}
              />
            ) : (
              <div className="h-full w-full min-h-[240px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                  <LineChart data={chartData} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => (metric === "revenue" ? fmtCurrency(value, i18n.language) : value)}
                    />
                    <Tooltip formatter={(value: number) => formatTooltip(value, metric, i18n.language, t)} />
                    <Line
                      type="monotone"
                      dataKey={metric === "revenue" ? "revenue" : "orders"}
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.quickActions", "Quick actions")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-between" onClick={() => updateAdminState?.({ currentScreen: "products" })}>
              {t("dashboard.manageProducts", "Manage products")}
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between" onClick={() => updateAdminState?.({ currentScreen: "orders" })}>
              {t("dashboard.viewOrders", "View orders")}
              <ArrowRight className="w-4 h-4" />
            </Button>
            <div className="rounded-lg bg-muted p-3 space-y-2">
              <p className="text-xs text-muted-foreground">{t("dashboard.lowStock", "Low stock alerts")}</p>
              {lowStock.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("dashboard.none", "All good for now")}</p>
              ) : (
                lowStock.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span>{item.name}</span>
                    <Badge variant="secondary">
                      <Flame className="w-3 h-3 mr-1" /> {item.stock}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DataList
          title={t("dashboard.topCategories", "Top categories")}
          description={t("dashboard.topCategoriesHint", "Based on orders for the selected period")}
          emptyLabel={t("dashboard.noData")}
          loading={summaryQuery.isLoading}
          error={summaryQuery.isError}
          onRetry={() => summaryQuery.refetch()}
          items={topCategories.map((item) => ({
            id: item.categoryId,
            name: item.name,
            value: metric === "revenue" && item.revenueCents ? fmtEGP(item.revenueCents) : `${item.orders} ${t("dashboard.orders", "Orders")}`,
          }))}
        />
        <DataList
          title={t("dashboard.topProducts", "Top products")}
          description={t("dashboard.topProductsHint", "Bestsellers by quantity")}
          emptyLabel={t("dashboard.noData")}
          loading={summaryQuery.isLoading}
          error={summaryQuery.isError}
          onRetry={() => summaryQuery.refetch()}
          items={topProducts.map((product) => ({
            id: product.productId,
            name: product.name,
            value: `${product.qty} ${t("dashboard.sold", "Sold")}`,
          }))}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.recentOrders", "Recent orders")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summaryQuery.isLoading ? (
              <Skeleton className="h-40" />
            ) : summaryQuery.isError ? (
              <ErrorState
                message={t("dashboard.load_failed", "We couldn't load dashboard data. Please try again.")}
                onRetry={() => summaryQuery.refetch()}
              />
            ) : recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("dashboard.noRecent", "No recent orders")}</p>
            ) : (
              recentOrders.map((order) => (
                <div key={order.id} className="border rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">#{order.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleString(i18n.language === "ar" ? "ar-EG" : undefined)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{fmtEGP(order.totalCents)}</p>
                    <Badge variant="secondary">{resolveOrderStatus(order.status)}</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.statusBreakdown", "Status breakdown")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {summaryQuery.isLoading ? (
              <Skeleton className="h-40" />
            ) : summaryQuery.isError ? (
              <ErrorState
                message={t("dashboard.load_failed", "We couldn't load dashboard data. Please try again.")}
                onRetry={() => summaryQuery.refetch()}
              />
            ) : (
              summary?.byStatus?.map((status) => (
                <div key={status.status} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{resolveOrderStatus(status.status)}</p>
                    <p className="text-xs text-muted-foreground">{t("dashboard.orders", "Orders")}</p>
                  </div>
                  <Badge>{status._count.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function fmtCurrency(value: number, language: string) {
  try {
    return new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en-EG", {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `EGP ${value}`;
  }
}

function formatTooltip(value: number, metric: MetricOption, language: string, t: TFunction) {
  if (metric === "revenue") {
    return fmtCurrency(value, language);
  }
  return `${value} ${t("dashboard.orders", "Orders")}`;
}

type DataListProps = {
  title: string;
  description: string;
  emptyLabel: string;
  loading: boolean;
  error?: boolean;
  onRetry?: () => void;
  items: Array<{ id: string; name: string; value: string }>;
};

function DataList({ title, description, emptyLabel, loading, error, onRetry, items }: DataListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <Skeleton className="h-36" />
        ) : error ? (
          <ErrorState message={emptyLabel} onRetry={onRetry} />
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{item.name}</p>
              </div>
              <span className="text-sm text-muted-foreground">{item.value}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
