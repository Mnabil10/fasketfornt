import { useQuery } from "@tanstack/react-query";
import { getOrderReceipt, type OrderScope } from "../../services/orders.service";
import type { OrderReceipt } from "../../types/order";

export function useOrderReceipt(
  orderId: string | undefined,
  options?: { enabled?: boolean; scope?: OrderScope }
) {
  return useQuery<OrderReceipt | null>({
    queryKey: ["order-receipt", options?.scope ?? "admin", orderId] as const,
    queryFn: () => (orderId ? getOrderReceipt(orderId, options?.scope ?? "admin") : Promise.resolve(null)),
    enabled: Boolean(orderId) && (options?.enabled ?? true),
  });
}
