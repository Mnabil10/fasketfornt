import { useQuery } from "@tanstack/react-query";
import {
  fetchDashboard,
  fetchDashboardTimeseries,
  type DashboardSummary,
} from "../../services/dashboard.service";

export type UseDashboardRange = { from?: string; to?: string };
export type UseDashboardGranularity = "day" | "week" | "month";

export const DASHBOARD_SUMMARY_KEY = ["admin-dashboard-summary"] as const;
export const DASHBOARD_SERIES_KEY = ["admin-dashboard-series"] as const;

export function useDashboardAdmin(range: UseDashboardRange, granularity: UseDashboardGranularity) {
  const summaryQuery = useQuery({
    queryKey: [...DASHBOARD_SUMMARY_KEY, range] as const,
    queryFn: () => fetchDashboard(range),
  });

  const seriesQuery = useQuery({
    queryKey: [...DASHBOARD_SERIES_KEY, { range, granularity }] as const,
    queryFn: () => fetchDashboardTimeseries({ ...range, granularity }),
  });

  return { summaryQuery, seriesQuery };
}
