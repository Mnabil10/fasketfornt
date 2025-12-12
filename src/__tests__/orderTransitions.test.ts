import { describe, expect, it } from "vitest";
import { collectAllowedTargets, isTransitionAllowed } from "../lib/order-transitions";
import type { OrderTransition } from "../types/order";

describe("order transitions helper", () => {
  it("prefers backend allowed transitions", () => {
    const transitions: OrderTransition[] = [
      { from: "PENDING", to: "PROCESSING" },
      { from: "PROCESSING", to: "OUT_FOR_DELIVERY" },
    ];
    const allowed = collectAllowedTargets(["PROCESSING"], transitions);
    expect(allowed).toContain("OUT_FOR_DELIVERY");
    expect(isTransitionAllowed("DELIVERED", allowed)).toBe(false);
    expect(isTransitionAllowed("PROCESSING", allowed)).toBe(true);
  });
});
