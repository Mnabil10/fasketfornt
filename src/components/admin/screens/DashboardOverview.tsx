import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchDashboard as getDashboard,
  fetchDashboardTimeseries,
  type DashboardSummary,
} from "../../../services/dashboard.service";
import { fmtEGP } from "../../../lib/money";

import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from "recharts";
import {
  Package, ShoppingCart, Users, DollarSign, TrendingUp, TrendingDown, Eye, ArrowRight,
} from "lucide-react";

// Make these props optional. If you pass them (like in your second file), quick actions will navigate.
export type AdminState = {
  currentScreen: "dashboard" | "products" | "categories" | "orders" | "customers" | "settings";
};
type Props = {
  adminState?: AdminState;
  updateAdminState?: (updates: Partial<AdminState>) => void;
};

export function DashboardOverview({ adminState, updateAdminState }: Props) {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [series, setSeries] = useState<Array<{ period: string; revenueCents: number; orders: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [d, ts] = await Promise.all([
          getDashboard(), // summary
          fetchDashboardTimeseries({ granularity: "day" }), // time-series
        ]);
        if (!mounted) return;
        setData(d);
        setSeries(ts);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const fmtDateTime = (iso: string) =>
    new Date(iso).toLocaleString(i18n.language === "ar" ? "ar-EG" : undefined);

  const getStatusColor = (status: string) => {
    // Map your real backend statuses to badge colors
    const s = String(status || "").toLowerCase();
    if (["completed", "paid", "delivered", "success"].some((k) => s.includes(k)))
      return "text-green-600 bg-green-100";
    if (["processing", "in_progress", "preparing"].some((k) => s.includes(k)))
      return "text-blue-600 bg-blue-100";
    if (["pending", "created", "awaiting"].some((k) => s.includes(k)))
      return "text-yellow-600 bg-yellow-100";
    if (["cancel", "fail", "refunded"].some((k) => s.includes(k)))
      return "text-red-600 bg-red-100";
    return "text-gray-600 bg-gray-100";
  };

  const stats = useMemo(() => {
    if (!data) return [];
    return [
      {
        title: t("dashboard.orders"),
        value: data.sales.totalOrders.toLocaleString(),
        change: "", // you can wire this later from backend if available
        icon: ShoppingCart,
        color: "text-blue-600",
      },
      {
        title: t("dashboard.revenue"),
        value: fmtEGP(data.sales.totalRevenueCents),
        change: "",
        icon: DollarSign,
        color: "text-green-600",
      },
      {
        title: t("dashboard.avgOrder"),
        value: fmtEGP(data.sales.avgOrderValueCents),
        change: "",
        icon: TrendingUp, // just an icon; not implying change
        color: "text-purple-600",
      },
      {
        title: t("dashboard.customers"),
        value: (data.customersCount ?? 0).toString(),
        change: "",
        icon: Users,
        color: "text-orange-600",
      },
    ];
  }, [data, t]);

  const salesChartData = useMemo(
    () =>
      series.map((p) => ({
        name: p.period, // e.g., "2025-11-03"
        revenue: Math.round((p.revenueCents || 0) / 100),
        orders: p.orders || 0,
      })),
    [series]
  );

  if (loading) return <div className="p-6">{t("app.loading")}</div>;
  if (!data) return <div className="p-6">{t("app.notifications.error")}</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => updateAdminState?.({ currentScreen: "products" })}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Package className="w-4 h-4" />
          {t("products.add") || "Add Product"}
        </Button>
        <Button
          onClick={() => updateAdminState?.({ currentScreen: "categories" })}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Package className="w-4 h-4" />
          {t("categories.manage") || "Manage Categories"}
        </Button>
        <Button
          onClick={() => updateAdminState?.({ currentScreen: "orders" })}
          variant="outline"
          className="flex items-center gap-2"
        >
          <ShoppingCart className="w-4 h-4" />
          {t("orders.viewAll") || "View Orders"}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <h3 className="text-2xl font-semibold">{stat.value}</h3>
                </div>
                <div
                  className={`w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center ${stat.color}`}
                >
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">
        {/* Sales Overview */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("dashboard.salesOverview") || "Daily Sales Overview"}</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary">
              {t("common.viewDetails") || "View Details"} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="min-w-0">
            <div className="w-full h-[300px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                {/* Combined chart: revenue (bar) + orders (line) */}
                <BarChart data={salesChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: any, key: string) => {
                      if (key === "revenue") return [fmtEGP((Number(value) || 0) * 100), t("dashboard.revenue")];
                      return [value, t("dashboard.orders")];
                    }}
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e0e0e0",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="orders" strokeWidth={2} dot={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Products (from API) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("dashboard.topProducts") || "Top Products"}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary"
              onClick={() => updateAdminState?.({ currentScreen: "products" })}
            >
              {t("common.viewAll") || "View All"} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(data.topProducts || []).slice(0, 6).map((p, index) => (
                <div key={p.productId} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary text-xs font-medium">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-gray-600">
                        {p.qty} {t("dashboard.sold") || "sold"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {!data.topProducts?.length && (
                <div className="text-sm text-gray-500">{t("app.table.noData")}</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders + Performance-like metrics sourced from API */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("dashboard.recentOrders")}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary"
              onClick={() => updateAdminState?.({ currentScreen: "orders" })}
            >
              {t("common.viewAll") || "View All"} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recent?.length ? (
                data.recent.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">#{o.id}</span>
                        <span className="text-xs text-gray-500">{fmtDateTime(o.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {o.user?.name || o.user?.phone || "-"}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-medium">{fmtEGP(o.totalCents)}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(o.status)}`}>
                        {o.status}
                      </span>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">{t("app.table.noData")}</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Performance-like panels fed by API (AOV + Low Stock + Customers) */}
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.metrics") || "Performance Metrics"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-green-800">
                    {t("dashboard.avgOrder") || "Average Order Value"}
                  </p>
                  <p className="text-xs text-green-600">{t("dashboard.last30d") || "Last 30 days"}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-800">{fmtEGP(data.sales.avgOrderValueCents)}</p>
                  <div className="flex items-center text-green-600">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    <span className="text-xs">—</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    {t("dashboard.customers") || "Customers"}
                  </p>
                  <p className="text-xs text-blue-600">{t("dashboard.total") || "Total"}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-800">{data.customersCount}</p>
                  <div className="flex items-center text-blue-600">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    <span className="text-xs">—</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-sm font-medium text-purple-800">
                  {t("dashboard.lowStock") || "Low Stock"}
                </p>
                <div className="mt-2 space-y-2">
                  {(data.lowStock || []).slice(0, 4).map((it) => (
                    <div key={it.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{it.name}</span>
                      <span className="font-semibold">{it.stock}</span>
                    </div>
                  ))}
                  {!data.lowStock?.length && (
                    <div className="text-sm text-purple-700/80">{t("app.table.noData")}</div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
