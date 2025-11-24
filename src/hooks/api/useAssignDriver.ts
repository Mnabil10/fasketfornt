import { useMutation, useQueryClient } from "@tanstack/react-query";
import { assignDriverToOrder } from "../../services/orders.service";
import { ORDERS_QUERY_KEY } from "./useOrdersAdmin";

export function useAssignDriver(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (driverId: string) => assignDriverToOrder(orderId, driverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...ORDERS_QUERY_KEY, "detail", orderId] });
    },
  });
}
