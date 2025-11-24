import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createDeliveryZone,
  deleteDeliveryZone,
  getDeliveryZone,
  listDeliveryZones,
  updateDeliveryZone,
} from "../../services/deliveryZones.service";
import type { DeliveryZone, DeliveryZoneFilters, DeliveryZonePayload, DeliveryZonesPaged } from "../../types/zones";

export const DELIVERY_ZONES_QUERY_KEY = ["delivery-zones"] as const;

export function useDeliveryZones(filters: DeliveryZoneFilters, options?: { enabled?: boolean }) {
  return useQuery<DeliveryZonesPaged>({
    queryKey: [...DELIVERY_ZONES_QUERY_KEY, filters] as const,
    queryFn: () => listDeliveryZones(filters),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}

export function useDeliveryZone(id: string | undefined, options?: { enabled?: boolean }) {
  return useQuery<DeliveryZone | null>({
    queryKey: [...DELIVERY_ZONES_QUERY_KEY, "detail", id] as const,
    queryFn: () => (id ? getDeliveryZone(id) : Promise.resolve(null)),
    enabled: Boolean(id) && (options?.enabled ?? true),
  });
}

export function useCreateZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DeliveryZonePayload) => createDeliveryZone(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DELIVERY_ZONES_QUERY_KEY }),
  });
}

export function useUpdateZone(zoneId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DeliveryZonePayload) => updateDeliveryZone(zoneId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DELIVERY_ZONES_QUERY_KEY }),
  });
}

export function useDeleteZone(zoneId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteDeliveryZone(zoneId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DELIVERY_ZONES_QUERY_KEY }),
  });
}
