import { api } from "../lib/api";
import type {
  DeliverySettings,
  GeneralSettings,
  NotificationsSettings,
  PaymentSettings,
  SettingsPayload,
  SettingsResponse,
  SystemSettings,
} from "../types/settings";

const SETTINGS_BASE = "/admin/settings";

export async function getSettings() {
  const { data } = await api.get<SettingsResponse>(SETTINGS_BASE);
  return data;
}

export async function getDeliverySettings() {
  const { data } = await api.get<DeliverySettings>(`${SETTINGS_BASE}/delivery`);
  return data;
}

export async function updateSettingsSection<T extends keyof SettingsPayload>(section: T, payload: SettingsPayload[T]) {
  const { data } = await api.patch<SettingsResponse>(`${SETTINGS_BASE}/${section}`, payload);
  return data;
}

export async function updateGeneralSettings(payload: GeneralSettings) {
  return updateSettingsSection("general", payload);
}

export async function updateDeliverySettings(payload: DeliverySettings) {
  return updateSettingsSection("delivery", payload);
}

export async function updatePaymentSettings(payload: PaymentSettings) {
  return updateSettingsSection("payments", payload);
}

export async function updateNotificationSettings(payload: NotificationsSettings) {
  return updateSettingsSection("notifications", payload);
}

export async function updateSystemSettings(payload: SystemSettings) {
  return updateSettingsSection("system", payload);
}
