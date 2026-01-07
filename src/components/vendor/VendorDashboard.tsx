import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ErrorState } from "../admin/common/ErrorState";
import { fmtCurrency } from "../../lib/money";
import {
  fetchProviderDashboard,
  fetchProviderEarningsSummary,
} from "../../services/provider-finance.service";
import { ArrowUpRight, Package, ShoppingCart, Star, Wallet, Clock } from "lucide-react";

type StatCardProps = {
  title: string;
  value: string | number;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  tone?: string;
};

function StatCard({ title, value, icon: Icon, tone }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`h-10 w-10 rounded-full bg-muted flex items-center justify-center ${tone || ""}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleDateString();
}

export function VendorDashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const dashboardQuery = useQuery({
    queryKey: ["provider-dashboard"],
    queryFn: fetchProviderDashboard,
  });

  const earningsQuery = useQuery({
    queryKey: ["provider-earnings-summary"],
    queryFn: () => fetchProviderEarningsSummary(),
  });

  if (dashboardQuery.isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">{t("app.loading", "Loading...")}</div>;
  }

  if (dashboardQuery.isError) {
    return (
      <ErrorState
        message={t("vendor.dashboard.load_failed", "Unable to load dashboard")}
        onRetry={() => dashboardQuery.refetch()}
      />
    );
  }

  const dashboard = dashboardQuery.data;
  const summary = earningsQuery.data;
  const balance = dashboard?.balance;
  const currency = balance?.currency || dashboard?.subscription?.plan?.currency || "EGP";
  const commissionRate =
    dashboard?.subscription?.commissionRateBpsOverride ??
    dashboard?.subscription?.plan?.commissionRateBps ??
    0;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("vendor.dashboard.title", "Dashboard")}</h1>
          <p className="text-muted-foreground">
            {t("vendor.dashboard.subtitle", "Track orders, revenue, and store health")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate("/orders")}>
            {t("vendor.dashboard.view_orders", "View orders")}
          </Button>
          <Button onClick={() => navigate("/products")}>
            {t("vendor.dashboard.add_product", "Manage products")}
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title={t("vendor.dashboard.total_orders", "Total orders")}
          value={dashboard?.ordersCount ?? 0}
          icon={ShoppingCart}
        />
        <StatCard
          title={t("vendor.dashboard.pending_orders", "Pending orders")}
          value={dashboard?.pendingOrdersCount ?? 0}
          icon={Clock}
          tone="text-amber-600"
        />
        <StatCard
          title={t("vendor.dashboard.total_sales", "Total sales")}
          value={fmtCurrency(summary?.totals.totalSalesCents ?? dashboard?.totalRevenueCents ?? 0, currency, i18n.language)}
          icon={Wallet}
          tone="text-emerald-600"
        />
        <StatCard
          title={t("vendor.dashboard.rating", "Rating")}
          value={`${(dashboard?.ratingAvg ?? 0).toFixed(1)} / 5`}
          icon={Star}
          tone="text-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("vendor.dashboard.earnings", "Earnings snapshot")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">{t("vendor.dashboard.available", "Available balance")}</p>
              <p className="text-lg font-semibold">
                {fmtCurrency(balance?.availableCents ?? 0, currency, i18n.language)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("vendor.dashboard.pending", "Pending balance")}</p>
              <p className="text-lg font-semibold">
                {fmtCurrency(balance?.pendingCents ?? 0, currency, i18n.language)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("vendor.dashboard.commission", "Total commission")}</p>
              <p className="text-lg font-semibold">
                {fmtCurrency(summary?.totals.totalCommissionCents ?? 0, currency, i18n.language)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("vendor.dashboard.plan", "Subscription")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("vendor.dashboard.plan_name", "Plan")}</span>
              <span className="font-semibold">{dashboard?.subscription?.plan?.name || "--"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("vendor.dashboard.plan_status", "Status")}</span>
              <Badge variant="outline">{dashboard?.subscription?.status || "--"}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("vendor.dashboard.plan_commission", "Commission")}</span>
              <span>{(commissionRate ?? 0) / 100}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("vendor.dashboard.plan_renewal", "Renewal")}</span>
              <span>{formatDate(dashboard?.subscription?.currentPeriodEnd)}</span>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={() => navigate("/settings")}>
              {t("vendor.dashboard.manage_plan", "Manage subscription")}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("vendor.dashboard.stock_hint", "Keep inventory updated")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p className="text-muted-foreground">
            {t("vendor.dashboard.stock_copy", "Update stock levels to avoid cancellations and improve customer trust.")}
          </p>
          <Button variant="outline" className="w-fit" onClick={() => navigate("/products")}>
            <Package className="mr-2 h-4 w-4" />
            {t("vendor.dashboard.manage_inventory", "Manage inventory")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
