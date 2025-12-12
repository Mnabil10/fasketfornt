import type { OrderStatus, OrderTransition } from "../types/order";

export function collectAllowedTargets(explicit?: OrderStatus[] | null, transitions?: OrderTransition[] | null) {
  const set = new Set<OrderStatus>();
  (explicit || []).forEach((s) => set.add(s));
  (transitions || []).forEach((t) => set.add(t.to));
  return Array.from(set);
}

export function isTransitionAllowed(target: OrderStatus, allowedTargets: OrderStatus[]) {
  if (!allowedTargets.length) return true;
  return allowedTargets.includes(target);
}
