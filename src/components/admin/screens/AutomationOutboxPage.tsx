import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { AdminTableSkeleton } from "../common/AdminTableSkeleton";
import { ErrorState } from "../common/ErrorState";
import { EmptyState } from "../common/EmptyState";
import { fetchAutomationEvents, replayAutomation, replayAutomationEvent, type AutomationStatus, type AutomationEvent } from "../../../services/automation.service";
import { fetchOpsWatchers } from "../../../services/ops.service";
import { getAdminErrorMessage } from "../../../lib/errors";
import { usePermissions } from "../../../auth/permissions";
import { useDebounce } from "../../../hooks/useDebounce";
import { toast } from "sonner";

type Filters = {
  status?: AutomationStatus | string;
  type?: string;
  from?: string;
  to?: string;
  q?: string;
  page: number;
  pageSize: number;
};

const STATUS_TONE: Record<string, "success" | "secondary" | "destructive" | "default"> = {
  SENT: "success",
  FAILED: "destructive",
  DEAD: "destructive",
  PENDING: "secondary",
};

export function AutomationOutboxPage() {
  const { t } = useTranslation();
  const perms = usePermissions();
  const qc = useQueryClient();
  const [filters, setFilters] = useState<Filters>({ status: undefined, type: undefined, from: undefined, to: undefined, q: "", page: 1, pageSize: 25 });
  const debouncedQ = useDebounce(filters.q || "", 250);
  const query = useQuery({
    queryKey: ["automation-events", { ...filters, q: debouncedQ }],
    queryFn: () =>
      fetchAutomationEvents({
        status: filters.status,
        type: filters.type,
        from: filters.from,
        to: filters.to,
        page: filters.page,
        pageSize: filters.pageSize,
        q: debouncedQ || undefined,
      }),
    keepPreviousData: true,
  });

  const replayOne = useMutation({
    mutationFn: (id: string) => replayAutomationEvent(id),
    onSuccess: () => {
      toast.success(t("automation.replayed", "Replay triggered"));
      qc.invalidateQueries({ queryKey: ["automation-events"] });
    },
    onError: (error) => toast.error(getAdminErrorMessage(error, t)),
  });

  const replayBulk = useMutation({
    mutationFn: (status: AutomationStatus | string) => replayAutomation({ status, from: filters.from, to: filters.to, limit: 100 }),
    onSuccess: (res) => {
      toast.success(
        t("automation.bulk_replay_started", "Replay started for {{count}} events", {
          count: (res as any)?.replayed ?? 0,
        })
      );
      qc.invalidateQueries({ queryKey: ["automation-events"] });
    },
    onError: (error) => toast.error(getAdminErrorMessage(error, t)),
  });

  const opsWatcherQuery = useQuery({
    queryKey: ["ops-watchers"],
    queryFn: () => fetchOpsWatchers(),
    enabled: perms.canViewAutomation,
    staleTime: 60_000,
  });

  const counts = useMemo(() => {
    const base = query.data?.counts || {};
    return {
      pending: base.PENDING || 0,
      failed: base.FAILED || 0,
      dead: base.DEAD || 0,
    };
  }, [query.data?.counts]);

  const dynamicTypes = useMemo(() => {
    const items = query.data?.items || [];
    const set = new Set<string>();
    items.forEach((evt: AutomationEvent) => {
      if (evt.type) set.add(evt.type);
    });
    return Array.from(set).sort();
  }, [query.data?.items]);

  const items = query.data?.items || [];
  const total = query.data?.total || 0;
  const pageCount = Math.max(1, Math.ceil(total / filters.pageSize));
  const activeFilters = useMemo(() => {
    const list: string[] = [];
    if (filters.status) list.push(`${t("automation.status", "Status")}: ${filters.status}`);
    if (filters.type) list.push(`${t("automation.type", "Type")}: ${filters.type}`);
    if (filters.from) list.push(`${t("common.from", "From")}: ${filters.from}`);
    if (filters.to) list.push(`${t("common.to", "To")}: ${filters.to}`);
    if (filters.q) list.push(`${t("automation.search", "Search")}: ${filters.q}`);
    return list;
  }, [filters.status, filters.type, filters.from, filters.to, filters.q, t]);
  const watcher = opsWatcherQuery.data?.watchers?.ordersStuck;

  const handleReplayBulk = (status: AutomationStatus | string) => {
    if (!perms.canReplayAutomation) {
      toast.error(t("automation.permission", "You are not allowed to replay automation events"));
      return;
    }
    if (!window.confirm(t("automation.replay_confirm", "Replay {{status}} events?", { status }))) return;
    replayBulk.mutate(status);
  };

  if (!perms.canViewAutomation) {
    return (
      <div className="p-6">
        <ErrorState message={t("automation.permission", "You are not allowed to view automation events")} />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("automation.title", "Automation Outbox")}</h1>
          <p className="text-muted-foreground">{t("automation.subtitle", "Monitor and replay notification events")}</p>
          {activeFilters.length > 0 && (
            <p className="text-xs text-muted-foreground">{t("automation.active_filters", "Active filters")}: {activeFilters.join(" | ")}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!perms.canReplayAutomation || replayBulk.isPending}
            onClick={() => handleReplayBulk("FAILED")}
            title={!perms.canReplayAutomation ? t("automation.permission") || undefined : undefined}
          >
            {t("automation.replay_failed", "Replay failed")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!perms.canReplayAutomation || replayBulk.isPending}
            onClick={() => handleReplayBulk("DEAD")}
            title={!perms.canReplayAutomation ? t("automation.permission") || undefined : undefined}
          >
            {t("automation.replay_dead", "Replay dead")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t("automation.pending", "Pending")}</p>
            <p className="text-2xl font-semibold">{counts.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t("automation.failed", "Failed")}</p>
            <p className="text-2xl font-semibold text-red-600">{counts.failed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t("automation.dead", "Dead")}</p>
            <p className="text-2xl font-semibold text-red-600">{counts.dead}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">{t("automation.ops_watcher", "Ops watcher status")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {opsWatcherQuery.isLoading ? (
            <AdminTableSkeleton rows={1} columns={2} />
          ) : opsWatcherQuery.isError ? (
            <ErrorState message={getAdminErrorMessage(opsWatcherQuery.error, t)} onRetry={() => opsWatcherQuery.refetch()} />
          ) : watcher ? (
            <>
              <div className="flex items-center justify-between">
                <span>{t("automation.orders_stuck_watcher", "Stuck orders watcher")}</span>
                <Badge variant="outline" className={watcher.enabled ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                  {watcher.enabled ? t("common.enabled", "Enabled") : t("common.disabled", "Disabled")}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("automation.interval", "Scan interval")}:{" "}
                {watcher.intervalMs ? `${Math.round(watcher.intervalMs / 60000)}m` : t("common.not_available", "N/A")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("automation.thresholds", "Thresholds")}:{" "}
                {watcher.thresholds?.length
                  ? watcher.thresholds.map((th) => `${th.status || ""}>${th.minutes}m`).join(" • ")
                  : t("automation.thresholds_missing", "No thresholds configured")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("automation.last_run", "Last run")}:{" "}
                {watcher.lastRunAt ? dayjs(watcher.lastRunAt).format("DD MMM YYYY HH:mm") : t("automation.never", "Never")}
              </p>
              {!watcher.enabled && (
                <p className="text-xs text-red-700">
                  {t("automation.watcher_disabled_hint", "Watcher disabled—stuck orders alerts will not fire.")}
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">{t("automation.ops_unknown", "Watcher status unavailable")}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">{t("common.filters", "Filters")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <Input
            placeholder={t("automation.search_placeholder", "Correlation, order code, phone")}
            value={filters.q}
            onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value, page: 1 }))}
          />
          <Select
            value={filters.status || "all"}
            onValueChange={(val) => setFilters((prev) => ({ ...prev, status: val === "all" ? undefined : val, page: 1 }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("automation.status", "Status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all", "All")}</SelectItem>
              {["PENDING", "SENT", "FAILED", "DEAD"].map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.type || "all"}
            onValueChange={(val) => setFilters((prev) => ({ ...prev, type: val === "all" ? undefined : val, page: 1 }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("automation.type", "Type")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all", "All")}</SelectItem>
              {(dynamicTypes.length ? dynamicTypes : ["order.created", "order.status_changed", "order.delivered", "auth.otp.requested", "auth.otp.verified"]).map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
              {!dynamicTypes.length && (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  {t("automation.type_hint", "No events loaded yet; showing common types")}
                </div>
              )}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={filters.from || ""}
            onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value || undefined, page: 1 }))}
          />
          <Input
            type="date"
            value={filters.to || ""}
            onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value || undefined, page: 1 }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="hidden md:grid grid-cols-[1.3fr,1fr,0.8fr,0.6fr,0.8fr,1.3fr,1fr,1fr] text-xs font-medium text-muted-foreground px-4 py-2 border-b">
            <span>{t("automation.created_at", "Created")}</span>
            <span>{t("automation.type", "Type")}</span>
            <span>{t("automation.status", "Status")}</span>
            <span>{t("automation.attempts", "Attempts")}</span>
            <span>{t("automation.http_status", "HTTP")}</span>
            <span>{t("automation.error", "Last error")}</span>
            <span>{t("automation.correlation", "Correlation")}</span>
            <span>{t("automation.dedupe", "Dedupe")}</span>
          </div>
          {query.isLoading ? (
            <div className="p-4">
              <AdminTableSkeleton rows={5} columns={7} />
            </div>
          ) : query.isError ? (
            <ErrorState
              message={getAdminErrorMessage(query.error, t, t("automation.load_error", "Unable to load automation outbox"))}
              onRetry={() => query.refetch()}
            />
          ) : !items.length ? (
            <div className="p-4">
              <EmptyState
                title={t("automation.empty", "No automation events found")}
                description={t("automation.try_filters", "Try clearing filters or waiting for new events")}
              />
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                {items.map((evt) => (
                  <div
                    key={evt.id}
                    data-testid="automation-row"
                    className="grid grid-cols-[1.3fr,1fr,0.8fr,0.6fr,0.8fr,1.3fr,1fr,1fr] px-4 py-3 border-b text-sm items-center"
                  >
                    <span>{dayjs(evt.createdAt).format("DD MMM YYYY HH:mm")}</span>
                    <span>{evt.type}</span>
                    <span>
                      <Badge variant={STATUS_TONE[evt.status] || "outline"}>{evt.status}</Badge>
                    </span>
                    <span>{evt.attempts}</span>
                    <span className="text-muted-foreground">
                      {evt.lastHttpStatus ?? "-"}
                      {evt.lastResponseSnippet ? (
                        <span className="block text-xs text-muted-foreground line-clamp-2">{evt.lastResponseSnippet}</span>
                      ) : null}
                    </span>
                    <span className="text-muted-foreground line-clamp-2">{evt.lastErrorSnippet || "-"}</span>
                    <span className="text-xs break-all">{evt.correlationId || "-"}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs break-all">{evt.dedupeKey || "-"}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!perms.canReplayAutomation || replayOne.isPending}
                      onClick={() => replayOne.mutate(evt.id)}
                      title={!perms.canReplayAutomation ? t("automation.permission") || undefined : undefined}
                    >
                      {t("automation.replay", "Replay")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

              <div className="md:hidden space-y-3 p-4">
                {items.map((evt) => (
                  <div key={evt.id} data-testid="automation-row" className="rounded-lg border bg-card p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{evt.type}</p>
                        <p className="text-xs text-muted-foreground">{dayjs(evt.createdAt).format("DD MMM HH:mm")}</p>
                      </div>
                      <Badge variant={STATUS_TONE[evt.status] || "outline"}>{evt.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>{t("automation.http_status", "HTTP")}: {evt.lastHttpStatus ?? "-"}</p>
                      {evt.lastResponseSnippet ? <p className="line-clamp-2">{evt.lastResponseSnippet}</p> : null}
                      <p>{t("automation.error", "Last error")}: {evt.lastErrorSnippet || "-"}</p>
                      <p>{t("automation.correlation", "Correlation")}: {evt.correlationId || "-"}</p>
                      <p>{t("automation.dedupe", "Dedupe")}: {evt.dedupeKey || "-"}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!perms.canReplayAutomation || replayOne.isPending}
                      onClick={() => replayOne.mutate(evt.id)}
                      className="w-full"
                    >
                      {t("automation.replay", "Replay")}
                    </Button>
                  </div>
                ))}
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
