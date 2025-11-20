import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createDeliveryDriver,
  getDeliveryDriver,
  listDeliveryDrivers,
  saveDeliveryDriverVehicle,
  updateDeliveryDriver,
  updateDeliveryDriverStatus,
} from "../../services/deliveryDrivers.service";
import type { DeliveryDriverFilters, DeliveryDriverPayload, DriverVehiclePayload } from "../../types/delivery";

export const DELIVERY_DRIVERS_QUERY_KEY = ["delivery-drivers"] as const;

export function useDeliveryDrivers(filters: DeliveryDriverFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...DELIVERY_DRIVERS_QUERY_KEY, filters] as const,
    queryFn: () => listDeliveryDrivers(filters),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}

export function useDeliveryDriver(id: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...DELIVERY_DRIVERS_QUERY_KEY, "detail", id] as const,
    queryFn: () => (id ? getDeliveryDriver(id) : Promise.resolve(null)),
    enabled: Boolean(id) && (options?.enabled ?? true),
  });
}

export function useCreateDeliveryDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DeliveryDriverPayload) => createDeliveryDriver(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DELIVERY_DRIVERS_QUERY_KEY }),
  });
}

export function useUpdateDeliveryDriver(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DeliveryDriverPayload) => updateDeliveryDriver(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DELIVERY_DRIVERS_QUERY_KEY }),
  });
}

export function useUpdateDeliveryDriverStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isActive: boolean) => updateDeliveryDriverStatus(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DELIVERY_DRIVERS_QUERY_KEY }),
  });
}

export function useSaveDriverVehicle(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DriverVehiclePayload) => saveDeliveryDriverVehicle(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DELIVERY_DRIVERS_QUERY_KEY }),
  });
}
