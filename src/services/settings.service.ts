// src/services/settings.service.ts
import { api } from "../lib/api";

// --- Types that match your backend payloads ---
export type SettingsResponse = {
  general: {
    storeName: string;
    storeDescription: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    storeAddress: string | null;
    businessHours: Record<string, { open: string; close: string; enabled: boolean }>;
  };
  delivery: {
    deliveryFee: number;              // float in UI
    freeDeliveryMinimum: number;      // float in UI
    estimatedDeliveryTime: string;
    maxDeliveryRadius: number;
    deliveryZones: Array<{ name: string; fee: number; enabled: boolean }>;
  };
  payment: {
    cashOnDelivery?: { enabled: boolean; maxAmount?: number };
    creditCards?: { enabled: boolean; acceptedCards?: string[] };
    digitalWallets?: {
      paypal?: { enabled: boolean; merchantId?: string };
      applePay?: { enabled: boolean; merchantId?: string };
      googlePay?: { enabled: boolean; merchantId?: string };
    };
    stripe?: { enabled?: boolean; publicKey?: string; secretKey?: string; webhookSecret?: string };
  };
  notifications: {
    orderNotifications?: { email?: boolean; sms?: boolean; push?: boolean };
    marketingEmails?: { enabled?: boolean; frequency?: string };
    adminAlerts?: {
      lowStock?: { enabled?: boolean; threshold?: number };
      newOrders?: { enabled?: boolean };
      systemUpdates?: { enabled?: boolean };
    };
  };
  system: {
    maintenanceMode: boolean;
    allowRegistrations: boolean;
    requireEmailVerification: boolean;
    sessionTimeout: number;
    maxLoginAttempts: number;
    dataRetentionDays: number;
    backupFrequency: string;
    timezone: string;
    language: string;
    currency: string;
  };
  updatedAt: string;
};

// --- Helpers ---
// --- Required by your component imports ---
export async function getSettings() {
  const { data } = await api.get<SettingsResponse>("/api/v1/admin/settings");
  return data;
}

export async function updateGeneral(general: SettingsResponse["general"]) {
  const { data } = await api.patch("/api/v1/admin/settings/general", general);
  return data;
}

export async function updateDelivery(delivery: SettingsResponse["delivery"]) {
  const { data } = await api.patch("/api/v1/admin/settings/delivery", delivery);
  return data;
}

export async function updatePayment(payment: SettingsResponse["payment"]) {
  const { data } = await api.patch("/api/v1/admin/settings/payment", payment);
  return data;
}

export async function updateNotifications(notifications: SettingsResponse["notifications"]) {
  const { data } = await api.patch("/api/v1/admin/settings/notifications", notifications);
  return data;
}

export async function updateSystem(system: SettingsResponse["system"]) {
  const { data } = await api.patch("/api/v1/admin/settings/system", system);
  return data;
}

// (Optional) full merge endpoint if you ever need it:
export async function patchSettings(body: Partial<SettingsResponse>) {
  const { data } = await api.patch("/api/v1/admin/settings", body);
  return data;
}
