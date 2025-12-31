import type { DeliveryZone } from "./zones";

export type GeneralSettings = {
  storeName: string;
  storeDescription?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  storeAddress?: string | null;
  businessHours?: string | null;
};

export type DeliverySettings = {
  deliveryFee?: number;
  deliveryFeeCents?: number;
  freeDeliveryMinimum?: number;
  freeDeliveryMinimumCents?: number;
  deliveryRatePerKm?: number | null;
  deliveryRatePerKmCents?: number | null;
  minDeliveryFee?: number | null;
  minDeliveryFeeCents?: number | null;
  maxDeliveryFee?: number | null;
  maxDeliveryFeeCents?: number | null;
  estimatedDeliveryTime?: number | null;
  maxDeliveryRadius?: number | null;
  deliveryZones?: DeliveryZone[];
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
  timezone?: string | null;
  language?: string | null;
  currency?: string | null;
};

export type LoyaltySettings = {
  loyaltyEnabled?: boolean;
  enabled?: boolean;
  earnPoints?: number;
  earnPerCents?: number;
  earnRate?: number;
  redeemRate?: number;
  redeemUnitCents?: number;
  redeemRateValue?: number;
  minRedeemPoints?: number;
  maxDiscountPercent?: number;
  maxRedeemPerOrder?: number;
  resetThreshold?: number;
};

export type MobileAppConfig = Record<string, any>;

export type SettingsPayload = {
  general?: GeneralSettings;
  delivery?: DeliverySettings;
  loyalty?: LoyaltySettings;
  payment?: PaymentSettings;
  payments?: PaymentSettings; // kept for UI compatibility
  notifications?: NotificationsSettings;
  system?: SystemSettings;
  mobileApp?: MobileAppConfig | null;
};

export type SettingsResponse = SettingsPayload & { updatedAt?: string };
