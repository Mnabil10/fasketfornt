import { api } from "../lib/api";

export type OrdersStuckWatcherStatus = {
  enabled: boolean;
  thresholds?: Array<{ status: string; minutes: number }>;
  intervalMs?: number;
  lastRunAt?: string | null;
};

export type OpsWatchersResponse = {
  watchers: {
    ordersStuck: OrdersStuckWatcherStatus;
  };
};

export async function fetchOpsWatchers(): Promise<OpsWatchersResponse> {
  const { data } = await api.get<OpsWatchersResponse>("/api/v1/admin/ops/watchers");
  const raw = (data as any)?.watchers?.ordersStuck ?? {};
  const thresholds = Array.isArray(raw?.thresholds)
    ? raw.thresholds.map((t: any) => ({
        status: String(t?.status ?? t?.name ?? "").toUpperCase(),
        minutes: Number(t?.minutes ?? t?.threshold ?? 0),
      }))
    : [];
  return {
    watchers: {
      ordersStuck: {
        enabled: Boolean(raw?.enabled),
        thresholds,
        intervalMs: Number(raw?.intervalMs ?? raw?.interval_ms ?? raw?.interval_ms ?? undefined),
        lastRunAt: raw?.lastRunAt ?? raw?.last_run_at ?? null,
      },
    },
  };
}
