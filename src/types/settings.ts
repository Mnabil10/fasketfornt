import type { DeliveryZone } from "./zones";

export type GeneralSettings = {
  storeName: string;
  storeDescription?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  storeAddress?: string | null;
  timezone?: string | null;
  language?: string | null;
  currency?: string | null;
};

export type DeliverySettings = {
  deliveryEnabled: boolean;
  defaultDeliveryFeeCents: number;
  freeDeliveryThresholdCents: number;
  perZoneOverrides?: Array<{
    zoneId: string;
    deliveryFeeCents: number;
    freeDeliveryThresholdCents?: number | null;
  }>;
};

export type PaymentSettings = {
  cashOnDelivery?: { enabled: boolean; maxAmount?: number | null };
  creditCards?: { enabled?: boolean; acceptedCards?: string[] };
  digitalWallets?: {
    paypal?: { enabled?: boolean; merchantId?: string | null };
    applePay?: { enabled?: boolean; merchantId?: string | null };
    googlePay?: { enabled?: boolean; merchantId?: string | null };
  };
  stripe?: { enabled?: boolean; publicKey?: string | null; secretKey?: string | null; webhookSecret?: string | null };
};

export type NotificationsSettings = {
  orderNotifications?: { email?: boolean; sms?: boolean; push?: boolean };
  marketingEmails?: { enabled?: boolean; frequency?: string | null };
  adminAlerts?: {
    lowStock?: { enabled?: boolean; threshold?: number | null };
    newOrders?: { enabled?: boolean };
    systemUpdates?: { enabled?: boolean };
  };
};

export type SystemSettings = {
  maintenanceMode?: boolean;
  allowRegistrations?: boolean;
  requireEmailVerification?: boolean;
  sessionTimeout?: number;
  maxLoginAttempts?: number;
  dataRetentionDays?: number;
  backupFrequency?: string | null;
};

export type SettingsPayload = {
  general?: GeneralSettings;
  delivery?: DeliverySettings;
  deliveryZones?: DeliveryZone[];
  payments?: PaymentSettings;
  notifications?: NotificationsSettings;
  system?: SystemSettings;
};

export type SettingsResponse = SettingsPayload & { updatedAt?: string };
