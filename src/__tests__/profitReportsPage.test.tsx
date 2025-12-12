import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProfitReportsPage } from "../components/admin/screens/ProfitReportsPage";

vi.mock("../services/reports.service", () => ({
  fetchProfitRange: vi.fn().mockResolvedValue({
    from: "2024-01-01",
    to: "2024-01-07",
    currency: "EGP",
    totals: {
      salesCents: 100000,
      discountsCents: 5000,
      deliveryFeesCents: 10000,
      netRevenueCents: 105000,
      cogsCents: 40000,
      grossProfitCents: 65000,
      marginPercent: 61.9,
      missingCostCount: 3,
    },
    days: [
      { date: "2024-01-01", netRevenueCents: 10000, cogsCents: 4000, grossProfitCents: 6000, marginPercent: 60 },
    ],
  }),
  exportProfit: vi.fn(),
}));

vi.mock("../auth/permissions", () => ({
  usePermissions: () => ({
    canViewProfit: true,
  }),
}));

vi.mock("recharts", () => {
  const React = require("react");
  const Mock = ({ children }: { children?: React.ReactNode }) => <div data-mock="chart">{children}</div>;
  return {
    ResponsiveContainer: Mock,
    LineChart: Mock,
    Line: Mock,
    XAxis: Mock,
    CartesianGrid: Mock,
    Tooltip: Mock,
  };
});

vi.mock("react-i18next", async () => {
  const actual = await vi.importActual<any>("react-i18next");
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key }),
  };
});

describe("ProfitReportsPage", () => {
  it("shows missing cost banner when missingCostCount > 0", async () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <ProfitReportsPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("reports.missing_costs_title")).toBeInTheDocument();
    });
  });
});
