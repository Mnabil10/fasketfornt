import { describe, expect, it } from "vitest";
import { collectAllowedTargets, isTransitionAllowed } from "../lib/order-transitions";
import type { OrderTransition } from "../types/order";

describe("order transitions helper", () => {
  it("prefers backend allowed transitions", () => {
    const transitions: OrderTransition[] = [
      { from: "PENDING", to: "CONFIRMED" },
      { from: "CONFIRMED", to: "PREPARING" },
    ];
    const allowed = collectAllowedTargets(["CONFIRMED"], transitions);
    expect(allowed).toContain("PREPARING");
    expect(isTransitionAllowed("DELIVERED", allowed)).toBe(false);
    expect(isTransitionAllowed("CONFIRMED", allowed)).toBe(true);
  });
});
