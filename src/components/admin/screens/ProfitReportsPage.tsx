import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { AdminTableSkeleton } from "../common/AdminTableSkeleton";
import { ErrorState } from "../common/ErrorState";
import { EmptyState } from "../common/EmptyState";
import { fetchProfitRange, exportProfit } from "../../../services/reports.service";
import { fmtCurrency } from "../../../lib/money";
import { getAdminErrorMessage } from "../../../lib/errors";
import { usePermissions } from "../../../auth/permissions";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";

type RangeFilter = { from: string; to: string };

const presets = (today: dayjs.Dayjs) => ({
  today: { from: today.format("YYYY-MM-DD"), to: today.format("YYYY-MM-DD") },
  week: { from: today.subtract(6, "day").format("YYYY-MM-DD"), to: today.format("YYYY-MM-DD") },
  mtd: { from: today.startOf("month").format("YYYY-MM-DD"), to: today.format("YYYY-MM-DD") },
});

export function ProfitReportsPage() {
  const { t } = useTranslation();
  const perms = usePermissions();
  const today = dayjs();
  const [range, setRange] = useState<RangeFilter>(presets(today).week);

  const query = useQuery({
    queryKey: ["profit-range", range],
    queryFn: () => fetchProfitRange(range),
    enabled: perms.canViewProfit,
  });

  const data = query.data;
  const currency = data?.currency || data?.totals?.currency || "EGP";
  const warnMissingCost = (data?.totals?.missingCostCount || 0) > 0;

  const handleExport = async (format: "csv" | "xlsx") => {
    if (!range.from || !range.to) return;
    try {
      const blob = await exportProfit({ from: range.from, to: range.to, format });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `profit-${range.from}-${range.to}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(getAdminErrorMessage(error, t));
    }
  };

  const trend = useMemo(() => data?.days || [], [data?.days]);

  if (!perms.canViewProfit) {
    return (
      <div className="p-6">
        <ErrorState message={t("reports.permission", "You do not have access to profit reports.")} />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("reports.profit_title", "Profit Reports")}</h1>
          <p className="text-muted-foreground">{t("reports.profit_subtitle", "Track revenue, COGS, and margins")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setRange(presets(today).today)}>
            {t("reports.preset_today", "Today")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setRange(presets(today).week)}>
            {t("reports.preset_7d", "Last 7d")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setRange(presets(today).mtd)}>
            {t("reports.preset_mtd", "MTD")}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("common.filters", "Filters")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input type="date" value={range.from} onChange={(e) => setRange((prev) => ({ ...prev, from: e.target.value }))} />
          <Input type="date" value={range.to} onChange={(e) => setRange((prev) => ({ ...prev, to: e.target.value }))} />
          <Button variant="outline" onClick={() => query.refetch()}>{t("common.refresh", "Refresh")}</Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>{t("reports.export_csv", "Export CSV")}</Button>
            <Button variant="outline" size="sm" onClick={() => handleExport("xlsx")}>{t("reports.export_xlsx", "Export XLSX")}</Button>
          </div>
        </CardContent>
      </Card>

      {warnMissingCost && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4 text-sm text-orange-700 flex items-center justify-between">
            <div>
              <p className="font-semibold">{t("reports.missing_costs_title", "Missing product costs detected")}</p>
              <p>{t("reports.missing_costs_msg", "Add COGS to products to improve gross profit accuracy.")}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.open("/products", "_self")}>
              {t("reports.fix_costs", "Fix product costs")}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        {query.isLoading ? (
          <div className="p-4">
            <AdminTableSkeleton rows={2} columns={3} />
          </div>
        ) : query.isError ? (
          <ErrorState message={getAdminErrorMessage(query.error, t)} onRetry={() => query.refetch()} />
        ) : !data ? (
          <EmptyState title={t("reports.no_data", "No data")} />
        ) : (
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Metric label={t("reports.sales", "Sales")} value={fmtCurrency(data.totals.salesCents, currency)} />
              <Metric label={t("reports.net_revenue", "Net revenue")} value={fmtCurrency(data.totals.netRevenueCents, currency)} />
              <Metric label={t("reports.cogs", "COGS")} value={fmtCurrency(data.totals.cogsCents, currency)} />
              <Metric
                label={t("reports.gross_profit", "Gross profit")}
                value={fmtCurrency(data.totals.grossProfitCents, currency)}
                helper={`${t("reports.margin", "Margin")} ${data.totals.marginPercent?.toFixed(1) || 0}%`}
              />
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <RechartsTooltip />
                  <Line type="monotone" dataKey="netRevenueCents" name={t("reports.net_revenue", "Net revenue")} stroke="#2563eb" dot={false} />
                  <Line type="monotone" dataKey="grossProfitCents" name={t("reports.gross_profit", "Gross profit")} stroke="#16a34a" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="p-2">{t("reports.date", "Date")}</th>
                    <th className="p-2">{t("reports.net_revenue", "Net revenue")}</th>
                    <th className="p-2">{t("reports.cogs", "COGS")}</th>
                    <th className="p-2">{t("reports.gross_profit", "Gross profit")}</th>
                    <th className="p-2">{t("reports.margin", "Margin %")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.days.map((d) => (
                    <tr key={d.date} className="border-t">
                      <td className="p-2">{d.date}</td>
                      <td className="p-2">{fmtCurrency(d.netRevenueCents, currency)}</td>
                      <td className="p-2">{fmtCurrency(d.cogsCents, currency)}</td>
                      <td className="p-2">{fmtCurrency(d.grossProfitCents, currency)}</td>
                      <td className="p-2">{(d.marginPercent ?? 0).toFixed(1)}%</td>
                    </tr>
                  ))}
                  <tr className="border-t font-semibold">
                    <td className="p-2">{t("reports.total", "Total")}</td>
                    <td className="p-2">{fmtCurrency(data.totals.netRevenueCents, currency)}</td>
                    <td className="p-2">{fmtCurrency(data.totals.cogsCents, currency)}</td>
                    <td className="p-2">{fmtCurrency(data.totals.grossProfitCents, currency)}</td>
                    <td className="p-2">{(data.totals.marginPercent ?? 0).toFixed(1)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

function Metric({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
        {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
      </CardContent>
    </Card>
  );
}
