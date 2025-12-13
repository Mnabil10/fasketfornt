import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AutomationOutboxPage } from "../components/admin/screens/AutomationOutboxPage";

const replayMock = vi.fn();

vi.mock("../services/automation.service", () => ({
  fetchAutomationEvents: vi.fn().mockResolvedValue({
    items: [
      {
        id: "1",
        createdAt: "2024-01-01T00:00:00Z",
        type: "order.status",
        status: "FAILED",
        attempts: 2,
        lastErrorSnippet: "timeout",
        correlationId: "abc",
        dedupeKey: "d1",
      },
    ],
    total: 1,
    page: 1,
    pageSize: 25,
  }),
  replayAutomationEvent: (...args: any[]) => replayMock(...args),
  replayAutomation: vi.fn(),
}));

vi.mock("../services/ops.service", () => ({
  fetchOpsWatchers: vi.fn().mockResolvedValue({
    watchers: {
      ordersStuck: { enabled: true, thresholds: [], intervalMs: 300000, lastRunAt: "2024-01-01T00:05:00Z" },
    },
  }),
}));

vi.mock("../auth/permissions", () => ({
  usePermissions: () => ({
    canReplayAutomation: true,
    canViewAutomation: true,
  }),
}));

vi.mock("react-i18next", async () => {
  const actual = await vi.importActual<any>("react-i18next");
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key }),
  };
});

describe("AutomationOutboxPage", () => {
  beforeEach(() => {
    replayMock.mockClear();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("allows replaying a single event", async () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <AutomationOutboxPage />
      </QueryClientProvider>
    );

    const rows = await screen.findAllByTestId("automation-row");
    const row = rows[0];
    const replayBtn = within(row).getByRole("button", { name: "automation.replay" });
    fireEvent.click(replayBtn);
    await waitFor(() => expect(replayMock).toHaveBeenCalledWith("1"));
  });
});
