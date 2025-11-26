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
import type { DeliveryZone } from "../types/zones";

const SETTINGS_BASE = "/api/v1/admin/settings";

type DeliveryZoneDto = {
  id: string;
  nameEn?: string;
  nameAr?: string;
  fee?: number;
  feeCents?: number;
  etaMinutes?: number | null;
  isActive?: boolean;
  city?: string | null;
  region?: string | null;
  freeDeliveryThresholdCents?: number | null;
  minOrderAmountCents?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

function normalizeDeliveryZone(dto: DeliveryZoneDto): DeliveryZone {
  const feeCents = dto.feeCents ?? (dto.fee != null ? Math.round(dto.fee * 100) : 0);
  const fee = dto.fee ?? feeCents / 100;
  return {
    id: dto.id,
    nameEn: dto.nameEn ?? "",
    nameAr: dto.nameAr ?? "",
    fee,
    feeCents,
    etaMinutes: dto.etaMinutes ?? null,
    isActive: dto.isActive ?? true,
    city: dto.city ?? null,
    region: dto.region ?? null,
    freeDeliveryThresholdCents: dto.freeDeliveryThresholdCents ?? null,
    minOrderAmountCents: dto.minOrderAmountCents ?? null,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

function normalizeDeliverySettings(delivery?: DeliverySettings & { deliveryZones?: DeliveryZoneDto[] }): DeliverySettings {
  const zones = Array.isArray(delivery?.deliveryZones)
    ? delivery?.deliveryZones.map((zone) => normalizeDeliveryZone(zone))
    : undefined;

  return {
    deliveryFee: delivery?.deliveryFee,
    deliveryFeeCents: delivery?.deliveryFeeCents ?? (delivery?.deliveryFee != null ? Math.round(delivery.deliveryFee * 100) : undefined),
    freeDeliveryMinimum: delivery?.freeDeliveryMinimum,
    freeDeliveryMinimumCents:
      delivery?.freeDeliveryMinimumCents ??
      (delivery?.freeDeliveryMinimum != null ? Math.round(delivery.freeDeliveryMinimum * 100) : undefined),
    estimatedDeliveryTime: delivery?.estimatedDeliveryTime ?? null,
    maxDeliveryRadius: delivery?.maxDeliveryRadius ?? null,
    deliveryZones: zones,
  };
}

function mapSettingsFromApi(data: SettingsResponse & { payment?: PaymentSettings }) {
  const loyalty =
    data.loyalty && typeof data.loyalty === "object"
      ? {
          ...data.loyalty,
          enabled:
            (data.loyalty as any).enabled ??
            (data.loyalty as any).loyaltyEnabled ??
            (data.loyalty as any).enabled === undefined
              ? (data.loyalty as any).loyaltyEnabled
              : (data.loyalty as any).enabled,
          loyaltyEnabled:
            (data.loyalty as any).loyaltyEnabled ?? (data.loyalty as any).enabled,
        }
      : data.loyalty;

  return {
    ...data,
    payments: (data as any).payments ?? data.payment,
    loyalty,
    delivery: normalizeDeliverySettings(data.delivery),
  };
}

function mapSectionToApi(section: keyof SettingsPayload): string {
  if (section === "payments") return "payment";
  if (section === "payment") return "payment";
  return section;
}

export async function getSettings() {
  const { data } = await api.get<SettingsResponse & { payment?: PaymentSettings }>(SETTINGS_BASE);
  return mapSettingsFromApi(data);
}

export async function getDeliverySettings() {
  const { data } = await api.get<DeliverySettings>(`${SETTINGS_BASE}/delivery`);
  return normalizeDeliverySettings(data);
}

export async function updateSettings(payload: SettingsPayload) {
  const { data } = await api.patch<SettingsResponse>(SETTINGS_BASE, payload);
  return mapSettingsFromApi(data as SettingsResponse & { payment?: PaymentSettings });
}

export async function updateSettingsSection<T extends keyof SettingsPayload>(section: T, payload: SettingsPayload[T]) {
  const apiSection = mapSectionToApi(section);
  const { data } = await api.patch<SettingsResponse>(`${SETTINGS_BASE}/${apiSection}`, payload);
  return mapSettingsFromApi(data as SettingsResponse & { payment?: PaymentSettings });
}

export async function updateGeneralSettings(payload: GeneralSettings) {
  return updateSettingsSection("general", payload);
}

export async function updateDeliverySettings(payload: DeliverySettings) {
  return updateSettingsSection("delivery", payload);
}

export async function updatePaymentSettings(payload: PaymentSettings) {
  return updateSettingsSection("payment", payload);
}

export async function updateNotificationSettings(payload: NotificationsSettings) {
  return updateSettingsSection("notifications", payload);
}

export async function updateSystemSettings(payload: SystemSettings) {
  return updateSettingsSection("system", payload);
}

export async function updateLoyaltySettings(payload: SettingsPayload["loyalty"]) {
  return updateSettingsSection("loyalty", payload);
}
