import { useQuery } from "@tanstack/react-query";
import { getSettings } from "../../services/settings.service";
import type { SettingsResponse } from "../../types/settings";

export const SETTINGS_QUERY_KEY = ["admin-settings"] as const;

export function useSettingsAdmin(options?: { enabled?: boolean }) {
  return useQuery<SettingsResponse>({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: () => getSettings(),
    enabled: options?.enabled ?? true,
  });
}
