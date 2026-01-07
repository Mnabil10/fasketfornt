
import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Badge } from "../../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { AdminTableSkeleton } from "../common/AdminTableSkeleton";
import { EmptyState } from "../common/EmptyState";
import { ErrorState } from "../common/ErrorState";
import { toast } from "sonner";
import { fmtCurrency, toCents } from "../../../lib/money";
import { getAdminErrorMessage } from "../../../lib/errors";
import { useProviders } from "../../../hooks/api/useProviders";
import {
  createPayout,
  downloadStatementCsv,
  fetchFinanceSummary,
  listLedgerEntries,
  listPayouts,
  listUnsettledOrders,
  listVendorBalances,
  runScheduledPayouts,
  updatePayout,
  type PayoutItem,
} from "../../../services/admin-finance.service";

const SUMMARY_KEY = ["finance-summary"];
const BALANCES_KEY = ["finance-balances"];
const LEDGER_KEY = ["finance-ledger"];
const PAYOUTS_KEY = ["finance-payouts"];
const UNSETTLED_KEY = ["finance-unsettled"];

function formatDate(value?: string | null) {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleDateString();
}

function parseAmount(value: string) {
  const numeric = Number(value.replace(/[^\d.]/g, ""));
  if (Number.isNaN(numeric)) return 0;
  return numeric;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

export function FinanceManagement() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("balances");
  const [providerId, setProviderId] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [ledgerType, setLedgerType] = useState("all");
  const [payoutStatus, setPayoutStatus] = useState("all");
  const [balancesPage, setBalancesPage] = useState(1);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [payoutsPage, setPayoutsPage] = useState(1);
  const [unsettledPage, setUnsettledPage] = useState(1);
  const pageSize = 10;

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    providerId: "",
    amount: "",
    fee: "",
    referenceId: "",
  });

  const [updateOpen, setUpdateOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<PayoutItem | null>(null);
  const [updateForm, setUpdateForm] = useState({
    status: "PROCESSING",
    referenceId: "",
    failureReason: "",
  });

  const providersQuery = useProviders({ page: 1, pageSize: 200 });
  const providers = providersQuery.data?.items || [];

  const summaryQuery = useQuery({
    queryKey: SUMMARY_KEY,
    queryFn: fetchFinanceSummary,
  });
  const balancesParams = useMemo(
    () => ({
      providerId: providerId !== "all" ? providerId : undefined,
      page: balancesPage,
      pageSize,
    }),
    [providerId, balancesPage]
  );

  const ledgerParams = useMemo(
    () => ({
      providerId: providerId !== "all" ? providerId : undefined,
      type: ledgerType !== "all" ? ledgerType : undefined,
      from: from || undefined,
      to: to || undefined,
      page: ledgerPage,
      pageSize,
    }),
    [providerId, ledgerType, from, to, ledgerPage]
  );

  const payoutParams = useMemo(
    () => ({
      providerId: providerId !== "all" ? providerId : undefined,
      status: payoutStatus !== "all" ? payoutStatus : undefined,
      from: from || undefined,
      to: to || undefined,
      page: payoutsPage,
      pageSize,
    }),
    [providerId, payoutStatus, from, to, payoutsPage]
  );

  const unsettledParams = useMemo(
    () => ({
      from: from || undefined,
      to: to || undefined,
      page: unsettledPage,
      pageSize,
    }),
    [from, to, unsettledPage]
  );

  const balancesQuery = useQuery({
    queryKey: [...BALANCES_KEY, balancesParams],
    queryFn: () => listVendorBalances(balancesParams),
  });

  const ledgerQuery = useQuery({
    queryKey: [...LEDGER_KEY, ledgerParams],
    queryFn: () => listLedgerEntries(ledgerParams),
  });

  const payoutsQuery = useQuery({
    queryKey: [...PAYOUTS_KEY, payoutParams],
    queryFn: () => listPayouts(payoutParams),
  });

  const unsettledQuery = useQuery({
    queryKey: [...UNSETTLED_KEY, unsettledParams],
    queryFn: () => listUnsettledOrders(unsettledParams),
  });

  const createMutation = useMutation({
    mutationFn: createPayout,
    onSuccess: () => {
      toast.success(t("finance.payout_created", "Payout created"));
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: SUMMARY_KEY });
      queryClient.invalidateQueries({ queryKey: BALANCES_KEY });
      queryClient.invalidateQueries({ queryKey: PAYOUTS_KEY });
      queryClient.invalidateQueries({ queryKey: LEDGER_KEY });
    },
    onError: (error) => toast.error(getAdminErrorMessage(error, t)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { status: string; referenceId?: string; failureReason?: string } }) =>
      updatePayout(id, payload),
    onSuccess: () => {
      toast.success(t("finance.payout_updated", "Payout updated"));
      setUpdateOpen(false);
      queryClient.invalidateQueries({ queryKey: SUMMARY_KEY });
      queryClient.invalidateQueries({ queryKey: PAYOUTS_KEY });
      queryClient.invalidateQueries({ queryKey: LEDGER_KEY });
    },
    onError: (error) => toast.error(getAdminErrorMessage(error, t)),
  });

  const runScheduledMutation = useMutation({
    mutationFn: runScheduledPayouts,
    onSuccess: () => {
      toast.success(t("finance.payouts_scheduled", "Scheduled payouts executed"));
      queryClient.invalidateQueries({ queryKey: SUMMARY_KEY });
      queryClient.invalidateQueries({ queryKey: PAYOUTS_KEY });
      queryClient.invalidateQueries({ queryKey: LEDGER_KEY });
    },
    onError: (error) => toast.error(getAdminErrorMessage(error, t)),
  });

  const openCreateDialog = () => {
    setCreateForm((prev) => ({
      ...prev,
      providerId: providerId !== "all" ? providerId : prev.providerId,
    }));
    setCreateOpen(true);
  };

  const handleCreate = () => {
    if (!createForm.providerId) {
      toast.error(t("finance.provider_required", "Select a vendor"));
      return;
    }
    const amountValue = parseAmount(createForm.amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      toast.error(t("finance.amount_required", "Enter a valid amount"));
      return;
    }
    const feeValue = parseAmount(createForm.fee);
    createMutation.mutate({
      providerId: createForm.providerId,
      amountCents: toCents(amountValue),
      feeCents: feeValue ? toCents(feeValue) : 0,
      referenceId: createForm.referenceId || undefined,
    });
  };

  const openUpdateDialog = (payout: PayoutItem) => {
    setSelectedPayout(payout);
    setUpdateForm({
      status: payout.status || "PROCESSING",
      referenceId: payout.referenceId || "",
      failureReason: payout.failureReason || "",
    });
    setUpdateOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedPayout) return;
    updateMutation.mutate({
      id: selectedPayout.id,
      payload: {
        status: updateForm.status,
        referenceId: updateForm.referenceId || undefined,
        failureReason: updateForm.failureReason || undefined,
      },
    });
  };

  const handleStatementExport = async () => {
    if (providerId === "all") {
      toast.error(t("finance.statement_provider", "Select a vendor to export"));
      return;
    }
    const blob = await downloadStatementCsv(providerId, {
      from: from || undefined,
      to: to || undefined,
      type: ledgerType !== "all" ? ledgerType : undefined,
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `statement-${providerId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const balancesTotalPages = Math.max(1, Math.ceil((balancesQuery.data?.total || 0) / pageSize));
  const ledgerTotalPages = Math.max(1, Math.ceil((ledgerQuery.data?.total || 0) / pageSize));
  const payoutsTotalPages = Math.max(1, Math.ceil((payoutsQuery.data?.total || 0) / pageSize));
  const unsettledTotalPages = Math.max(1, Math.ceil((unsettledQuery.data?.total || 0) / pageSize));

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("finance.title", "Finance")}</h1>
        <p className="text-muted-foreground">{t("finance.subtitle", "Monitor balances, settlements, and payouts")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          label={t("finance.platform_revenue", "Platform revenue")}
          value={fmtCurrency(summaryQuery.data?.platformRevenueCents ?? 0, "EGP", i18n.language)}
        />
        <StatCard
          label={t("finance.total_commission", "Total commission")}
          value={fmtCurrency(summaryQuery.data?.totalCommissionCents ?? 0, "EGP", i18n.language)}
        />
        <StatCard
          label={t("finance.available_total", "Available balance")}
          value={fmtCurrency(summaryQuery.data?.totalAvailableCents ?? 0, "EGP", i18n.language)}
        />
        <StatCard
          label={t("finance.pending_total", "Pending balance")}
          value={fmtCurrency(summaryQuery.data?.totalPendingCents ?? 0, "EGP", i18n.language)}
        />
        <StatCard
          label={t("finance.payout_queue", "Payout queue")}
          value={String(summaryQuery.data?.payoutQueueCount ?? 0)}
        />
        <StatCard
          label={t("finance.unsettled_orders", "Unsettled orders")}
          value={String(summaryQuery.data?.unsettledOrdersCount ?? 0)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("finance.filters", "Filters")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-2">
            <Label>{t("finance.vendor", "Vendor")}</Label>
            <Select value={providerId} onValueChange={(value) => { setProviderId(value); setBalancesPage(1); setLedgerPage(1); setPayoutsPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder={t("finance.vendor", "Vendor")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("finance.from", "From")}</Label>
            <Input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setLedgerPage(1); setPayoutsPage(1); setUnsettledPage(1); }} />
          </div>
          <div className="space-y-2">
            <Label>{t("finance.to", "To")}</Label>
            <Input type="date" value={to} onChange={(event) => { setTo(event.target.value); setLedgerPage(1); setPayoutsPage(1); setUnsettledPage(1); }} />
          </div>
          <div className="flex items-end gap-2">
            <Button variant="outline" onClick={() => { setFrom(""); setTo(""); }}>
              {t("finance.clear_dates", "Clear dates")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="balances">{t("finance.balances", "Balances")}</TabsTrigger>
          <TabsTrigger value="ledger">{t("finance.ledger", "Ledger")}</TabsTrigger>
          <TabsTrigger value="payouts">{t("finance.payouts", "Payouts")}</TabsTrigger>
          <TabsTrigger value="unsettled">{t("finance.unsettled", "Unsettled orders")}</TabsTrigger>
        </TabsList>

        <TabsContent value="balances">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("finance.balances", "Balances")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {balancesQuery.isLoading ? (
                <AdminTableSkeleton rows={5} columns={6} />
              ) : balancesQuery.isError ? (
                <ErrorState
                  message={getAdminErrorMessage(balancesQuery.error, t, t("finance.load_failed", "Unable to load balances"))}
                  onRetry={() => balancesQuery.refetch()}
                />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("finance.vendor", "Vendor")}</TableHead>
                        <TableHead>{t("finance.available", "Available")}</TableHead>
                        <TableHead>{t("finance.pending", "Pending")}</TableHead>
                        <TableHead>{t("finance.lifetime_sales", "Lifetime sales")}</TableHead>
                        <TableHead>{t("finance.lifetime_commission", "Lifetime commission")}</TableHead>
                        <TableHead>{t("finance.last_settlement", "Last settlement")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(balancesQuery.data?.items || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <EmptyState title={t("finance.empty_balances", "No balances yet")} />
                          </TableCell>
                        </TableRow>
                      ) : (
                        balancesQuery.data?.items.map((balance) => (
                          <TableRow key={balance.id}>
                            <TableCell>
                              {balance.provider?.name || balance.providerId}
                              <p className="text-xs text-muted-foreground">{balance.provider?.status || ""}</p>
                            </TableCell>
                            <TableCell>{fmtCurrency(balance.availableCents, balance.currency || "EGP", i18n.language)}</TableCell>
                            <TableCell>{fmtCurrency(balance.pendingCents, balance.currency || "EGP", i18n.language)}</TableCell>
                            <TableCell>{fmtCurrency(balance.lifetimeSalesCents, balance.currency || "EGP", i18n.language)}</TableCell>
                            <TableCell>{fmtCurrency(balance.lifetimeCommissionCents, balance.currency || "EGP", i18n.language)}</TableCell>
                            <TableCell>{formatDate(balance.lastSettlementAt)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  <div className="flex items-center justify-between px-4 py-3 text-sm text-muted-foreground border-t">
                    <div>
                      {t("common.pagination.label", { defaultValue: "Page {{page}} of {{count}}", page: balancesPage, count: balancesTotalPages })}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={balancesPage <= 1} onClick={() => setBalancesPage((p) => Math.max(1, p - 1))}>
                        {t("common.prev", "Prev")}
                      </Button>
                      <Button size="sm" variant="outline" disabled={balancesPage >= balancesTotalPages} onClick={() => setBalancesPage((p) => Math.min(balancesTotalPages, p + 1))}>
                        {t("common.next", "Next")}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger">
          <Card className="mb-4">
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-base">{t("finance.ledger", "Ledger")}</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Select value={ledgerType} onValueChange={(value) => { setLedgerType(value); setLedgerPage(1); }}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={t("finance.ledger_type", "Entry type")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                    <SelectItem value="ORDER_SETTLEMENT">ORDER_SETTLEMENT</SelectItem>
                    <SelectItem value="HOLD_RELEASE">HOLD_RELEASE</SelectItem>
                    <SelectItem value="PAYOUT">PAYOUT</SelectItem>
                    <SelectItem value="PAYOUT_FEE">PAYOUT_FEE</SelectItem>
                    <SelectItem value="PAYOUT_REVERSAL">PAYOUT_REVERSAL</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleStatementExport} disabled={providerId === "all"}>
                  {t("finance.export_statement", "Export statement")}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {ledgerQuery.isLoading ? (
                <AdminTableSkeleton rows={5} columns={6} />
              ) : ledgerQuery.isError ? (
                <ErrorState
                  message={getAdminErrorMessage(ledgerQuery.error, t, t("finance.load_failed", "Unable to load ledger"))}
                  onRetry={() => ledgerQuery.refetch()}
                />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("finance.date", "Date")}</TableHead>
                        <TableHead>{t("finance.vendor", "Vendor")}</TableHead>
                        <TableHead>{t("finance.type", "Type")}</TableHead>
                        <TableHead>{t("finance.order", "Order")}</TableHead>
                        <TableHead>{t("finance.payout", "Payout")}</TableHead>
                        <TableHead className="text-right">{t("finance.amount", "Amount")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(ledgerQuery.data?.items || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <EmptyState title={t("finance.empty_ledger", "No ledger entries yet")} />
                          </TableCell>
                        </TableRow>
                      ) : (
                        ledgerQuery.data?.items.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>{formatDate(entry.createdAt)}</TableCell>
                            <TableCell>{entry.provider?.name || entry.providerId}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{entry.type}</Badge>
                            </TableCell>
                            <TableCell>{entry.order?.code || entry.orderId || "--"}</TableCell>
                            <TableCell>{entry.payout?.referenceId || entry.payoutId || "--"}</TableCell>
                            <TableCell className="text-right">
                              {fmtCurrency(entry.amountCents, entry.currency || "EGP", i18n.language)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  <div className="flex items-center justify-between px-4 py-3 text-sm text-muted-foreground border-t">
                    <div>
                      {t("common.pagination.label", { defaultValue: "Page {{page}} of {{count}}", page: ledgerPage, count: ledgerTotalPages })}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={ledgerPage <= 1} onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}>
                        {t("common.prev", "Prev")}
                      </Button>
                      <Button size="sm" variant="outline" disabled={ledgerPage >= ledgerTotalPages} onClick={() => setLedgerPage((p) => Math.min(ledgerTotalPages, p + 1))}>
                        {t("common.next", "Next")}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts">
          <Card className="mb-4">
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-base">{t("finance.payouts", "Payouts")}</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Select value={payoutStatus} onValueChange={(value) => { setPayoutStatus(value); setPayoutsPage(1); }}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder={t("finance.status", "Status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                    <SelectItem value="PENDING">PENDING</SelectItem>
                    <SelectItem value="PROCESSING">PROCESSING</SelectItem>
                    <SelectItem value="PAID">PAID</SelectItem>
                    <SelectItem value="FAILED">FAILED</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => runScheduledMutation.mutate()} disabled={runScheduledMutation.isPending}>
                  {runScheduledMutation.isPending ? t("common.saving", "Saving...") : t("finance.run_scheduled", "Run scheduled")}
                </Button>
                <Button onClick={openCreateDialog}>{t("finance.create_payout", "Create payout")}</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {payoutsQuery.isLoading ? (
                <AdminTableSkeleton rows={5} columns={6} />
              ) : payoutsQuery.isError ? (
                <ErrorState
                  message={getAdminErrorMessage(payoutsQuery.error, t, t("finance.load_failed", "Unable to load payouts"))}
                  onRetry={() => payoutsQuery.refetch()}
                />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("finance.date", "Date")}</TableHead>
                        <TableHead>{t("finance.vendor", "Vendor")}</TableHead>
                        <TableHead>{t("finance.amount", "Amount")}</TableHead>
                        <TableHead>{t("finance.fee", "Fee")}</TableHead>
                        <TableHead>{t("finance.status", "Status")}</TableHead>
                        <TableHead>{t("finance.reference", "Reference")}</TableHead>
                        <TableHead>{t("common.actions", "Actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(payoutsQuery.data?.items || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7}>
                            <EmptyState title={t("finance.empty_payouts", "No payouts yet")} />
                          </TableCell>
                        </TableRow>
                      ) : (
                        payoutsQuery.data?.items.map((payout) => (
                          <TableRow key={payout.id}>
                            <TableCell>{formatDate(payout.createdAt)}</TableCell>
                            <TableCell>{payout.provider?.name || payout.providerId}</TableCell>
                            <TableCell>{fmtCurrency(payout.amountCents, payout.currency || "EGP", i18n.language)}</TableCell>
                            <TableCell>{fmtCurrency(payout.feeCents || 0, payout.currency || "EGP", i18n.language)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{payout.status}</Badge>
                            </TableCell>
                            <TableCell>{payout.referenceId || "--"}</TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline" onClick={() => openUpdateDialog(payout)}>
                                {t("finance.update_payout", "Update")}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  <div className="flex items-center justify-between px-4 py-3 text-sm text-muted-foreground border-t">
                    <div>
                      {t("common.pagination.label", { defaultValue: "Page {{page}} of {{count}}", page: payoutsPage, count: payoutsTotalPages })}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={payoutsPage <= 1} onClick={() => setPayoutsPage((p) => Math.max(1, p - 1))}>
                        {t("common.prev", "Prev")}
                      </Button>
                      <Button size="sm" variant="outline" disabled={payoutsPage >= payoutsTotalPages} onClick={() => setPayoutsPage((p) => Math.min(payoutsTotalPages, p + 1))}>
                        {t("common.next", "Next")}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unsettled">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("finance.unsettled", "Unsettled orders")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {unsettledQuery.isLoading ? (
                <AdminTableSkeleton rows={5} columns={4} />
              ) : unsettledQuery.isError ? (
                <ErrorState
                  message={getAdminErrorMessage(unsettledQuery.error, t, t("finance.load_failed", "Unable to load unsettled orders"))}
                  onRetry={() => unsettledQuery.refetch()}
                />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("finance.date", "Date")}</TableHead>
                        <TableHead>{t("finance.order", "Order")}</TableHead>
                        <TableHead>{t("finance.vendor", "Vendor")}</TableHead>
                        <TableHead className="text-right">{t("finance.amount", "Amount")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(unsettledQuery.data?.items || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4}>
                            <EmptyState title={t("finance.empty_unsettled", "No unsettled orders")} />
                          </TableCell>
                        </TableRow>
                      ) : (
                        unsettledQuery.data?.items.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell>{formatDate(order.createdAt)}</TableCell>
                            <TableCell>{order.code || order.id}</TableCell>
                            <TableCell>{order.providerId || "--"}</TableCell>
                            <TableCell className="text-right">
                              {fmtCurrency(order.totalCents || 0, "EGP", i18n.language)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  <div className="flex items-center justify-between px-4 py-3 text-sm text-muted-foreground border-t">
                    <div>
                      {t("common.pagination.label", { defaultValue: "Page {{page}} of {{count}}", page: unsettledPage, count: unsettledTotalPages })}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={unsettledPage <= 1} onClick={() => setUnsettledPage((p) => Math.max(1, p - 1))}>
                        {t("common.prev", "Prev")}
                      </Button>
                      <Button size="sm" variant="outline" disabled={unsettledPage >= unsettledTotalPages} onClick={() => setUnsettledPage((p) => Math.min(unsettledTotalPages, p + 1))}>
                        {t("common.next", "Next")}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("finance.create_payout", "Create payout")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{t("finance.vendor", "Vendor")}</Label>
              <Select value={createForm.providerId} onValueChange={(value) => setCreateForm((prev) => ({ ...prev, providerId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t("finance.vendor", "Vendor")} />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("finance.amount", "Amount")}</Label>
              <Input
                value={createForm.amount}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, amount: event.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("finance.fee", "Fee")}</Label>
              <Input
                value={createForm.fee}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, fee: event.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("finance.reference", "Reference")}</Label>
              <Input
                value={createForm.referenceId}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, referenceId: event.target.value }))}
                placeholder="TXN-123"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? t("common.saving", "Saving...") : t("finance.create_payout", "Create payout")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("finance.update_payout", "Update payout")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{t("finance.status", "Status")}</Label>
              <Select value={updateForm.status} onValueChange={(value) => setUpdateForm((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t("finance.status", "Status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">PENDING</SelectItem>
                  <SelectItem value="PROCESSING">PROCESSING</SelectItem>
                  <SelectItem value="PAID">PAID</SelectItem>
                  <SelectItem value="FAILED">FAILED</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("finance.reference", "Reference")}</Label>
              <Input
                value={updateForm.referenceId}
                onChange={(event) => setUpdateForm((prev) => ({ ...prev, referenceId: event.target.value }))}
                placeholder="TXN-123"
              />
            </div>
            {updateForm.status === "FAILED" && (
              <div className="space-y-2">
                <Label>{t("finance.failure_reason", "Failure reason")}</Label>
                <Input
                  value={updateForm.failureReason}
                  onChange={(event) => setUpdateForm((prev) => ({ ...prev, failureReason: event.target.value }))}
                  placeholder={t("finance.failure_placeholder", "Bank transfer failed") as string}
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setUpdateOpen(false)}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? t("common.saving", "Saving...") : t("finance.update_payout", "Update payout")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
