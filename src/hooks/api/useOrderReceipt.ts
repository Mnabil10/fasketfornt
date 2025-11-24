import { useQuery } from "@tanstack/react-query";
import { getOrderReceipt } from "../../services/orders.service";
import type { OrderReceipt } from "../../types/order";

export function useOrderReceipt(orderId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery<OrderReceipt | null>({
    queryKey: ["order-receipt", orderId] as const,
    queryFn: () => (orderId ? getOrderReceipt(orderId) : Promise.resolve(null)),
    enabled: Boolean(orderId) && (options?.enabled ?? true),
  });
}
