import { useMutation, useQueryClient } from "@tanstack/react-query";
import { assignDriverToOrder } from "../../services/orders.service";
import { ORDERS_QUERY_KEY } from "./useOrdersAdmin";

type AssignDriverInput = string | { orderId?: string; driverId: string };

export function useAssignDriver(orderId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignDriverInput) => {
      const driverId = typeof input === "string" ? input : input.driverId;
      const targetOrderId = typeof input === "string" ? orderId : input.orderId ?? orderId;
      if (!targetOrderId) {
        throw new Error("Order ID is required to assign a driver");
      }
      return assignDriverToOrder(targetOrderId, driverId);
    },
    onSuccess: (_data, variables) => {
      const targetOrderId = typeof variables === "string" ? orderId : variables.orderId ?? orderId;
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
      if (targetOrderId) {
        queryClient.invalidateQueries({ queryKey: [...ORDERS_QUERY_KEY, "detail", targetOrderId] });
      }
    },
  });
}
