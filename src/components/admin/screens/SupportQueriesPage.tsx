import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { AdminTableSkeleton } from "../common/AdminTableSkeleton";
import { ErrorState } from "../common/ErrorState";
import { EmptyState } from "../common/EmptyState";
import { fetchSupportQueries } from "../../../services/support.service";
import { getAdminErrorMessage } from "../../../lib/errors";
import { maskPhone } from "../../../lib/pii";
import { usePermissions } from "../../../auth/permissions";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge } from "../../ui/badge";
import { AlertTriangle } from "lucide-react";
import { WhatsAppInbox } from "./WhatsAppInbox";
import { WhatsAppLogs } from "./WhatsAppLogs";

export function SupportQueriesPage() {
  const { t } = useTranslation();
  const perms = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();

  if (!perms.canViewSupport) {
    return (
      <div className="p-6">
        <ErrorState message={t("support.permission", "You do not have access to support queries.")} />
      </div>
    );
  }

  const activeTab = useMemo(() => {
    const segments = location.pathname.split("/").filter(Boolean);
    const section = segments[1];
    if (section === "whatsapp") return "whatsapp-inbox";
    if (section === "whatsapp-logs") return "whatsapp-logs";
    return "queries";
  }, [location.pathname]);

  const handleTabChange = (value: string) => {
    if (value === "queries") {
      navigate("/support");
      return;
    }
    if (value === "whatsapp-inbox") {
      navigate("/support/whatsapp");
      return;
    }
    if (value === "whatsapp-logs") {
      navigate("/support/whatsapp-logs");
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{t("support.center_title", "Support Center")}</h1>
        <p className="text-muted-foreground">
          {t("support.center_subtitle", "Manage support queries and WhatsApp operations")}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="queries">{t("support.title", "Support Queries")}</TabsTrigger>
          <TabsTrigger value="whatsapp-inbox">{t("whatsapp.inbox_title", "WhatsApp Inbox")}</TabsTrigger>
          <TabsTrigger value="whatsapp-logs">{t("whatsapp.logs_title", "WhatsApp Logs")}</TabsTrigger>
        </TabsList>
        <TabsContent value="queries" className="mt-4">
          <SupportQueriesTab />
        </TabsContent>
        <TabsContent value="whatsapp-inbox" className="mt-4">
          <WhatsAppInbox />
        </TabsContent>
        <TabsContent value="whatsapp-logs" className="mt-4">
          <WhatsAppLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SupportQueriesTab() {
  const { t } = useTranslation();
  const perms = usePermissions();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const query = useQuery({
    queryKey: ["support-queries", { phone, code, page }],
    queryFn: () => fetchSupportQueries({ phone: phone || undefined, code: code || undefined, page, pageSize }),
    enabled: perms.canViewSupport,
    keepPreviousData: true,
  });

  const items = query.data?.items || [];
  const total = query.data?.total || 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const unlinkedCount = items.filter((row) => !row.orderCode).length;
  const showBackfillHint = items.length >= 5 && unlinkedCount / Math.max(items.length, 1) >= 0.3;

  const masked = (value?: string | null) => (perms.canViewPII ? value || "" : maskPhone(value || ""));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("common.search", "Search")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input placeholder={t("support.phone_placeholder", "Phone")} value={phone} onChange={(e) => { setPhone(e.target.value); setPage(1); }} />
          <Input placeholder={t("support.code_placeholder", "Order code")} value={code} onChange={(e) => { setCode(e.target.value); setPage(1); }} />
          <Button variant="outline" onClick={() => query.refetch()}>{t("common.refresh", "Refresh")}</Button>
          <Button variant="outline" onClick={() => { setPhone(""); setCode(""); setPage(1); }}>{t("common.resetFilters", "Reset filters")}</Button>
        </CardContent>
      </Card>

      {showBackfillHint && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4 text-sm text-orange-800 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 mt-0.5" />
            <div>
              <p className="font-semibold">{t("support.backfill_needed", "Many entries are unlinked to orders")}</p>
              <p>
                {t(
                  "support.backfill_hint",
                  "Suggest running support backfill: POST /api/v1/admin/support/backfill to restore masked phone + order code."
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="hidden md:grid grid-cols-[1fr,1fr,1fr,1fr,1fr,0.8fr] text-xs font-medium text-muted-foreground px-4 py-2 border-b">
            <span>{t("support.date", "Date")}</span>
            <span>{t("support.phone", "Phone")}</span>
            <span>{t("support.intent", "Intent")}</span>
            <span>{t("support.order", "Order code")}</span>
            <span>{t("support.response", "Response")}</span>
            <span>{t("support.status", "Status")}</span>
          </div>
          {query.isLoading ? (
            <div className="p-4">
              <AdminTableSkeleton rows={5} columns={6} />
            </div>
          ) : query.isError ? (
            <ErrorState message={getAdminErrorMessage(query.error, t)} onRetry={() => query.refetch()} />
          ) : !items.length ? (
            <div className="p-4">
              <EmptyState title={t("support.empty", "No support queries found")} />
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                {items.map((row) => (
                  <div key={row.id} className="grid grid-cols-[1fr,1fr,1fr,1fr,1fr,0.8fr] px-4 py-3 border-b text-sm items-center">
                    <span>{dayjs(row.createdAt).format("DD MMM YYYY HH:mm")}</span>
                    <span>{row.phone || row.maskedPhone ? masked(row.phone || row.maskedPhone) : t("support.unavailable", "Unavailable")}</span>
                    <span>{row.intent || "-"}</span>
                    <span className={row.orderCode ? "underline cursor-pointer" : ""} onClick={() => row.orderCode && navigate(`/orders/${row.orderCode}`)}>
                      {row.orderCode || t("support.unlinked", "Unlinked query")}
                    </span>
                    <span className="text-xs text-muted-foreground line-clamp-2">{row.responseSnippet || "-"}</span>
                    <Badge variant="outline">{row.status || "-"}</Badge>
                  </div>
                ))}
              </div>

              <div className="md:hidden space-y-3 p-4">
                {items.map((row) => (
                  <div key={row.id} className="rounded-lg border bg-card p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{row.intent || "-"}</p>
                        <p className="text-xs text-muted-foreground">{dayjs(row.createdAt).format("DD MMM HH:mm")}</p>
                      </div>
                      <Badge variant="outline">{row.status || "-"}</Badge>
                    </div>
                    <p className="text-sm">
                      {t("support.phone", "Phone")}: {row.phone || row.maskedPhone ? masked(row.phone || row.maskedPhone) : t("support.unavailable", "Unavailable")}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{row.responseSnippet || "-"}</p>
                    {row.orderCode ? (
                      <Button variant="outline" size="sm" onClick={() => navigate(`/orders/${row.orderCode}`)} className="w-full">
                        {t("support.open_order", "Open order")}
                      </Button>
                    ) : (
                    <p className="text-xs text-muted-foreground">{t("support.no_order", "Order code unavailable")}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
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
        </CardContent>
      </Card>
    </div>
  );
}
