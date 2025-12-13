import { api } from "../lib/api";
import { buildQueryParams } from "../lib/query";

export type ProfitKPI = {
  salesCents: number;
  discountsCents: number;
  deliveryFeesCents: number;
  netRevenueCents: number;
  cogsCents: number;
  grossProfitCents: number;
  marginPercent: number;
  missingCostCount?: number;
  currency?: string;
};

export type ProfitDay = ProfitKPI & {
  date: string;
};

export type ProfitRangeResponse = {
  from: string;
  to: string;
  currency?: string;
  totals: ProfitKPI;
  days: ProfitDay[];
};

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeProfitKpi(source: any): ProfitKPI {
  const salesCents = toNumber(source?.salesCents ?? source?.sales);
  const discountsCents = toNumber(source?.discountsCents ?? source?.discountCents ?? source?.discounts);
  const deliveryFeesCents = toNumber(source?.deliveryFeesCents ?? source?.deliveryFeeCents ?? source?.deliveryFees);
  const netRevenueCents =
    source?.netRevenueCents !== undefined
      ? toNumber(source?.netRevenueCents)
      : Math.max(0, salesCents - discountsCents) + deliveryFeesCents;
  const cogsCents = toNumber(source?.cogsCents ?? source?.costOfGoodsCents ?? source?.cogs);
  const grossProfitCents =
    source?.grossProfitCents !== undefined ? toNumber(source?.grossProfitCents) : netRevenueCents - cogsCents;
  const margin =
    source?.marginPercent ??
    source?.grossMarginPct ??
    (netRevenueCents > 0 ? (grossProfitCents / netRevenueCents) * 100 : 0);

  return {
    salesCents,
    discountsCents,
    deliveryFeesCents,
    netRevenueCents,
    cogsCents,
    grossProfitCents,
    marginPercent: typeof margin === "number" && Number.isFinite(margin) ? margin : 0,
    missingCostCount: toNumber(source?.missingCostCount),
    currency: source?.currency,
  };
}

function normalizeProfitRange(raw: any, range?: { from?: string; to?: string }): ProfitRangeResponse {
  const totals = raw?.totals ? normalizeProfitKpi(raw.totals) : normalizeProfitKpi(raw ?? {});
  const rawDays = Array.isArray(raw?.days) ? raw.days : null;
  const days: ProfitDay[] =
    rawDays && rawDays.length
      ? rawDays.map((d: any) => ({
          ...normalizeProfitKpi(d),
          date: d?.date ?? d?.day ?? range?.from ?? "",
        }))
      : [
          {
            ...totals,
            date: raw?.date ?? range?.from ?? range?.to ?? new Date().toISOString().slice(0, 10),
          },
        ];

  const currency = raw?.currency ?? totals.currency ?? days[0]?.currency ?? "EGP";
  const withCurrency = (kpi: ProfitKPI) => ({ ...kpi, currency });

  return {
    from: raw?.from ?? range?.from ?? days[0]?.date ?? "",
    to: raw?.to ?? range?.to ?? days[days.length - 1]?.date ?? "",
    currency,
    totals: withCurrency(totals),
    days: days.map((d) => ({ ...withCurrency(d), date: d.date })),
  };
}

export async function fetchProfitRange(params: { from: string; to: string }) {
  const query = buildQueryParams(params);
  const { data } = await api.get<ProfitRangeResponse>("/api/v1/admin/reports/profit/range", { params: query });
  return normalizeProfitRange(data, params);
}

export async function fetchProfitDaily(date: string) {
  const { data } = await api.get<ProfitDay>("/api/v1/admin/reports/profit/daily", { params: { date } });
  return normalizeProfitRange(data, { from: date, to: date }).days[0];
}

export async function exportProfit(params: { from: string; to: string; format: "csv" | "xlsx" }) {
  const query = buildQueryParams(params);
  const response = await api.get("/api/v1/admin/reports/profit/export", {
    params: query,
    responseType: "blob",
  });
  const contentType =
    (response.headers?.["content-type"] as string | undefined) ??
    (response.headers?.["Content-Type"] as string | undefined) ??
    "";

  // If backend returns plain text (csv) instead of blob, convert.
  if (contentType.toLowerCase().includes("text/") && typeof response.data === "string") {
    return new Blob([response.data], { type: contentType });
  }

  // Some backends return JSON with a URL
  if (contentType.toLowerCase().includes("application/json") && typeof (response.data as any)?.text === "function") {
    try {
      const text = await (response.data as any).text();
      const parsed = JSON.parse(text);
      const url = parsed?.url ?? parsed?.data?.url;
      if (url && typeof url === "string") {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to download export");
        return await res.blob();
      }
    } catch {
      /* ignore and fall through */
    }
  }

  return response.data as Blob;
}
