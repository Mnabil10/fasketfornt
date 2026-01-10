import React, { useState } from "react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { AdminTableSkeleton } from "../common/AdminTableSkeleton";
import { EmptyState } from "../common/EmptyState";
import { ErrorState } from "../common/ErrorState";
import { fetchWhatsappLogs, formatWhatsappStatus } from "../../../services/whatsapp.service";
import { getAdminErrorMessage } from "../../../lib/errors";
import { usePermissions } from "../../../auth/permissions";
import { useDebounce } from "../../../hooks/useDebounce";
import { maskPhone } from "../../../lib/pii";
import { redactPhoneNumbers, redactSensitiveText } from "../../../lib/redaction";
import { ClipboardList } from "lucide-react";

const STATUS_BADGE: Record<string, string> = {
  QUEUED: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  READ: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
};

export function WhatsAppLogs() {
  const { t } = useTranslation();
  const perms = usePermissions();
  const [filters, setFilters] = useState({
    status: "all",
    template: "",
    order: "",
    phone: "",
    from: "",
    to: "",
    page: 1,
    pageSize: 25,
  });

  const debouncedOrder = useDebounce(filters.order, 250);
  const debouncedPhone = useDebounce(filters.phone, 250);
  const debouncedTemplate = useDebounce(filters.template, 250);

  const query = useQuery({
    queryKey: ["whatsapp-logs", { ...filters, order: debouncedOrder, phone: debouncedPhone, template: debouncedTemplate }],
    queryFn: () =>
      fetchWhatsappLogs({
        status: filters.status === "all" ? undefined : filters.status,
        template: debouncedTemplate || undefined,
        order: debouncedOrder || undefined,
        phone: debouncedPhone || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        page: filters.page,
        pageSize: filters.pageSize,
      }),
    enabled: perms.canViewSupport,
    keepPreviousData: true,
  });

  const items = query.data?.items || [];
  const total = query.data?.total || 0;
  const pageCount = Math.max(1, Math.ceil(total / filters.pageSize));

  const maskedPhone = (value?: string | null, maskedValue?: string | null) =>
    perms.canViewPII ? value || "" : maskedValue || maskPhone(value || "");
  const sanitizeText = (value: string) => {
    const redacted = redactSensitiveText(value);
    return perms.canViewPII ? redacted : redactPhoneNumbers(redacted);
  };

  if (!perms.canViewSupport) {
    return <ErrorState message={t("support.permission", "You do not have access to support tools.")} />;
  }

  const statusOptions = ["QUEUED", "SENT", "DELIVERED", "READ", "FAILED"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            {t("whatsapp.logs_title", "WhatsApp Logs")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t("whatsapp.logs_subtitle", "Audit WhatsApp delivery and errors")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          {t("common.refresh", "Refresh")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("common.filters", "Filters")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <Input
            placeholder={t("whatsapp.filter_phone", "Phone")}
            value={filters.phone}
            onChange={(e) => setFilters((prev) => ({ ...prev, phone: e.target.value, page: 1 }))}
          />
          <Input
            placeholder={t("whatsapp.filter_order", "Order number")}
            value={filters.order}
            onChange={(e) => setFilters((prev) => ({ ...prev, order: e.target.value, page: 1 }))}
          />
          <Input
            placeholder={t("whatsapp.filter_template", "Template")}
            value={filters.template}
            onChange={(e) => setFilters((prev) => ({ ...prev, template: e.target.value, page: 1 }))}
          />
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value, page: 1 }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("whatsapp.status", "Status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all", "All")}</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {formatWhatsappStatus(status) || status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value, page: 1 }))}
          />
          <Input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value, page: 1 }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="hidden md:grid grid-cols-[1.1fr,0.8fr,1fr,1.1fr,1.2fr,0.9fr,1.4fr] text-xs font-medium text-muted-foreground px-4 py-2 border-b">
            <span>{t("whatsapp.log_date", "Date / Time")}</span>
            <span>{t("whatsapp.log_direction", "Direction")}</span>
            <span>{t("whatsapp.log_phone", "Phone")}</span>
            <span>{t("whatsapp.log_template", "Template / Type")}</span>
            <span>{t("whatsapp.log_related", "Related entity")}</span>
            <span>{t("whatsapp.log_status", "Status")}</span>
            <span>{t("whatsapp.log_error", "Error reason")}</span>
          </div>

          {query.isLoading ? (
            <div className="p-4">
              <AdminTableSkeleton rows={5} columns={7} />
            </div>
          ) : query.isError ? (
            <ErrorState
              message={getAdminErrorMessage(query.error, t, t("whatsapp.logs_error", "Failed to load logs"))}
              onRetry={() => query.refetch()}
            />
          ) : !items.length ? (
            <div className="p-4">
              <EmptyState title={t("whatsapp.logs_empty", "No WhatsApp logs found")} />
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                {items.map((log) => {
                  const statusKey = String(log.status || "QUEUED").toUpperCase();
                  const statusLabel = formatWhatsappStatus(statusKey) || statusKey;
                  const directionLabel = formatWhatsappStatus(log.direction) || log.direction;
                  const typeLabel = log.templateName || log.messageType || "-";
                  const related = log.relatedEntity?.label || "-";
                  const errorText = log.errorMessage ? sanitizeText(log.errorMessage) : "-";
                  return (
                    <div
                      key={log.id}
                      className="grid grid-cols-[1.1fr,0.8fr,1fr,1.1fr,1.2fr,0.9fr,1.4fr] px-4 py-3 border-b text-sm items-center"
                    >
                      <span>{dayjs(log.createdAt).format("DD MMM YYYY HH:mm")}</span>
                      <Badge variant="outline">{directionLabel}</Badge>
                      <span>{maskedPhone(log.phone, log.maskedPhone)}</span>
                      <span className="text-xs text-muted-foreground">{typeLabel}</span>
                      <span className="text-xs text-muted-foreground">{related}</span>
                      <Badge variant="outline" className={STATUS_BADGE[statusKey] || "bg-gray-100 text-gray-700"}>
                        {statusLabel}
                      </Badge>
                      <span className="text-xs text-muted-foreground line-clamp-2" dir="auto">
                        {errorText}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="md:hidden space-y-3 p-4">
                {items.map((log) => {
                  const statusKey = String(log.status || "QUEUED").toUpperCase();
                  const statusLabel = formatWhatsappStatus(statusKey) || statusKey;
                  const directionLabel = formatWhatsappStatus(log.direction) || log.direction;
                  const typeLabel = log.templateName || log.messageType || "-";
                  const related = log.relatedEntity?.label || "-";
                  const errorText = log.errorMessage ? sanitizeText(log.errorMessage) : "-";
                  return (
                    <div key={log.id} className="rounded-lg border bg-card p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm">{typeLabel}</p>
                          <p className="text-xs text-muted-foreground">{dayjs(log.createdAt).format("DD MMM HH:mm")}</p>
                        </div>
                        <Badge variant="outline" className={STATUS_BADGE[statusKey] || "bg-gray-100 text-gray-700"}>
                          {statusLabel}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>{t("whatsapp.log_direction", "Direction")}: {directionLabel}</p>
                        <p>{t("whatsapp.log_phone", "Phone")}: {maskedPhone(log.phone, log.maskedPhone)}</p>
                        <p>{t("whatsapp.log_related", "Related entity")}: {related}</p>
                        <p dir="auto">
                          {t("whatsapp.log_error", "Error reason")}: {errorText}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
                <div>
                  {t("common.pagination.label", {
                    defaultValue: "Page {{page}} of {{count}}",
                    page: filters.page,
                    count: pageCount,
                  })}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={filters.page <= 1}
                    onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  >
                    {t("common.prev", "Prev")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={filters.page >= pageCount}
                    onClick={() => setFilters((prev) => ({ ...prev, page: Math.min(pageCount, prev.page + 1) }))}
                  >
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
