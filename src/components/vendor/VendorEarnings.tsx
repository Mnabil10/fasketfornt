import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { ErrorState } from "../admin/common/ErrorState";
import { fmtCurrency } from "../../lib/money";
import {
  downloadProviderStatementCsv,
  fetchProviderEarningsSummary,
  fetchProviderPayouts,
  fetchProviderStatement,
} from "../../services/provider-finance.service";
import { Download } from "lucide-react";

export function VendorEarnings() {
  const { t, i18n } = useTranslation();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const rangeParams = useMemo(
    () => ({
      from: from || undefined,
      to: to || undefined,
      page,
      pageSize,
    }),
    [from, to, page]
  );

  const summaryQuery = useQuery({
    queryKey: ["provider-earnings-summary", rangeParams.from, rangeParams.to],
    queryFn: () => fetchProviderEarningsSummary({ from: rangeParams.from, to: rangeParams.to }),
  });

  const statementQuery = useQuery({
    queryKey: ["provider-statement", rangeParams],
    queryFn: () =>
      fetchProviderStatement({
        from: rangeParams.from,
        to: rangeParams.to,
        page: rangeParams.page,
        pageSize: rangeParams.pageSize,
      }),
  });

  const payoutsQuery = useQuery({
    queryKey: ["provider-payouts", rangeParams.from, rangeParams.to],
    queryFn: () => fetchProviderPayouts({ from: rangeParams.from, to: rangeParams.to, page: 1, pageSize: 5 }),
  });

  const currency = summaryQuery.data?.balance?.currency || "EGP";
  const totalPages = Math.max(1, Math.ceil((statementQuery.data?.total || 0) / pageSize));

  const handleExport = async () => {
    const blob = await downloadProviderStatementCsv({ from: rangeParams.from, to: rangeParams.to });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "vendor-statement.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (summaryQuery.isError) {
    return (
      <ErrorState
        message={t("vendor.earnings.load_failed", "Unable to load earnings")}
        onRetry={() => summaryQuery.refetch()}
      />
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("vendor.earnings.title", "Earnings")}</h1>
          <p className="text-muted-foreground">
            {t("vendor.earnings.subtitle", "Track payouts, commissions, and available balance")}
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExport} disabled={statementQuery.isLoading}>
          <Download className="h-4 w-4" />
          {t("vendor.earnings.export_csv", "Export CSV")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("vendor.earnings.filters", "Filters")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex flex-col gap-2">
            <label className="text-sm text-muted-foreground">{t("vendor.earnings.from", "From")}</label>
            <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-muted-foreground">{t("vendor.earnings.to", "To")}</label>
            <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("vendor.earnings.total_sales", "Total sales")}</p>
            <p className="text-lg font-semibold">
              {fmtCurrency(summaryQuery.data?.totals.totalSalesCents ?? 0, currency, i18n.language)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("vendor.earnings.total_commission", "Total commission")}</p>
            <p className="text-lg font-semibold">
              {fmtCurrency(summaryQuery.data?.totals.totalCommissionCents ?? 0, currency, i18n.language)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("vendor.earnings.net_earnings", "Net earnings")}</p>
            <p className="text-lg font-semibold">
              {fmtCurrency(summaryQuery.data?.totals.totalNetCents ?? 0, currency, i18n.language)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("vendor.earnings.available", "Available")}</p>
            <p className="text-lg font-semibold">
              {fmtCurrency(summaryQuery.data?.balance.availableCents ?? 0, currency, i18n.language)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("vendor.earnings.statement", "Statement")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {statementQuery.isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">{t("app.loading", "Loading...")}</div>
          ) : statementQuery.isError ? (
            <ErrorState
              message={t("vendor.earnings.statement_failed", "Unable to load statement")}
              onRetry={() => statementQuery.refetch()}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("vendor.earnings.date", "Date")}</TableHead>
                    <TableHead>{t("vendor.earnings.type", "Type")}</TableHead>
                    <TableHead>{t("vendor.earnings.order", "Order")}</TableHead>
                    <TableHead>{t("vendor.earnings.payout", "Payout")}</TableHead>
                    <TableHead className="text-right">{t("vendor.earnings.amount", "Amount")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(statementQuery.data?.items || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        {t("vendor.earnings.empty", "No ledger entries yet")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    (statementQuery.data?.items || []).map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{new Date(entry.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{entry.type}</Badge>
                        </TableCell>
                        <TableCell>{entry.orderId ?? "--"}</TableCell>
                        <TableCell>{entry.payoutId ?? "--"}</TableCell>
                        <TableCell className="text-right">
                          {fmtCurrency(entry.amountCents, entry.currency || currency, i18n.language)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between px-4 py-3 text-sm text-muted-foreground border-t">
                <div>
                  {t("common.pagination.label", {
                    defaultValue: "Page {{page}} of {{count}}",
                    page,
                    count: totalPages,
                  })}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    {t("common.prev", "Prev")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    {t("common.next", "Next")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("vendor.earnings.payouts", "Recent payouts")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {payoutsQuery.isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">{t("app.loading", "Loading...")}</div>
          ) : payoutsQuery.isError ? (
            <ErrorState
              message={t("vendor.earnings.payouts_failed", "Unable to load payouts")}
              onRetry={() => payoutsQuery.refetch()}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("vendor.earnings.date", "Date")}</TableHead>
                  <TableHead>{t("vendor.earnings.status", "Status")}</TableHead>
                  <TableHead>{t("vendor.earnings.reference", "Reference")}</TableHead>
                  <TableHead className="text-right">{t("vendor.earnings.amount", "Amount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(payoutsQuery.data?.items || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      {t("vendor.earnings.no_payouts", "No payouts yet")}
                    </TableCell>
                  </TableRow>
                ) : (
                  (payoutsQuery.data?.items || []).map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell>{new Date(payout.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{payout.status}</Badge>
                      </TableCell>
                      <TableCell>{payout.referenceId || "--"}</TableCell>
                      <TableCell className="text-right">
                        {fmtCurrency(payout.amountCents, payout.currency || currency, i18n.language)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
