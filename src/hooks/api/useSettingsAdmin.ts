import { useQuery } from "@tanstack/react-query";
import { getSettings, type SettingsResponse } from "../../services/settings.service";

export const SETTINGS_QUERY_KEY = ["admin-settings"] as const;

export function useSettingsAdmin(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: () => getSettings(),
    enabled: options?.enabled ?? true,
  });
}
