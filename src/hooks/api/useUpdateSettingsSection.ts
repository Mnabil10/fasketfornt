import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateSettingsSection } from "../../services/settings.service";
import type { SettingsPayload } from "../../types/settings";
import { SETTINGS_QUERY_KEY } from "./useSettingsAdmin";

export function useUpdateSettingsSection<T extends keyof SettingsPayload>(section: T) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SettingsPayload[T]) => updateSettingsSection(section, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY }),
  });
}
