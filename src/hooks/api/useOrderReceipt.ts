import { useQuery } from "@tanstack/react-query";
import { getOrderReceipt } from "../../services/orders.service";

export function useOrderReceipt(orderId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["order-receipt", orderId] as const,
    queryFn: () => (orderId ? getOrderReceipt(orderId) : Promise.resolve(null)),
    enabled: Boolean(orderId) && (options?.enabled ?? true),
  });
}
