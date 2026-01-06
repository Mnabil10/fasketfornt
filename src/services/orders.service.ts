import type { AxiosError } from "axios";
import { api } from "../lib/api";
import { buildQueryParams } from "../lib/query";
import type { DeliveryDriver } from "../types/delivery";
import type { DeliveryZone } from "../types/zones";
import type {
  Order,
  OrderDetail,
  OrderFilters,
  OrderItem,
  OrderReceipt,
  OrderReceiptDriver,
  OrderReceiptZone,
  OrderStatus,
  OrderStatusPayload,
  OrdersPaged,
} from "../types/order";

type DeliveryDriverDto = {
  id: string;
  fullName?: string;
  name?: string;
  phone?: string;
  nationalId?: string | null;
  nationalIdImage?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  vehicle?: {
    id?: string;
    type?: string;
    plateNumber?: string;
    color?: string | null;
    licenseImage?: string | null;
    licenseImageUrl?: string | null;
  } | null;
};

type DeliveryZoneDto = {
  id: string;
  nameEn?: string;
  nameAr?: string;
  city?: string | null;
  region?: string | null;
  fee?: number;
  feeCents?: number;
  etaMinutes?: number | null;
  freeDeliveryThresholdCents?: number | null;
  minOrderAmountCents?: number | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type OrderItemDto = {
  id?: string;
  productId: string;
  productNameSnapshot?: string;
  productName?: string;
  qty?: number;
  quantity?: number;
  priceSnapshotCents?: number;
  unitPriceCents?: number;
  lineTotalCents?: number;
  totalCents?: number;
  imageUrl?: string | null;
  sku?: string | null;
};

type OrderDto = {
  id: string;
  code?: string;
  createdAt: string;
  updatedAt?: string;
  status: OrderStatus | string;
  totalCents?: number;
  customer?: Order["customer"];
  user?: Order["customer"];
  guestName?: string | null;
  guestPhone?: string | null;
  guestAddress?: Record<string, any> | null;
  deliveryZone?: DeliveryZoneDto | null;
  zone?: DeliveryZoneDto | null;
  driver?: DeliveryDriverDto | null;
  paymentMethod?: string | null;
  items?: OrderItemDto[];
  subtotalCents?: number;
  couponDiscountCents?: number | null;
  discountCents?: number | null;
  loyaltyDiscountCents?: number | null;
  shippingFeeCents?: number | null;
  address?: OrderDetail["address"];
  note?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
  currency?: string;
  allowedTransitions?: OrderStatus[];
};

type OrderReceiptDto = {
  id?: string;
  orderId?: string;
  code?: string;
  status?: OrderStatus | string;
  createdAt?: string;
  currency?: string;
  customer?: Order["customer"];
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  address?: Partial<OrderReceipt["address"]>;
  deliveryZone?: (DeliveryZoneDto & { name?: string }) | null;
  driver?: (DeliveryDriverDto & { vehicleType?: string | null; plateNumber?: string | null }) | null;
  items?: Array<{
    productId: string;
    productName: string;
    quantity?: number;
    unitPriceCents?: number;
    lineTotalCents?: number;
    totalCents?: number;
  }>;
  subtotalCents?: number;
  couponDiscountCents?: number;
  discountCents?: number;
  loyaltyDiscountCents?: number;
  shippingFeeCents?: number;
  totalCents?: number;
  loyaltyPointsRedeemed?: number;
  loyaltyPointsUsed?: number;
  loyaltyPointsEarned?: number;
};

function normalizeZone(zone?: DeliveryZoneDto | null): DeliveryZone | null {
  if (!zone) return null;
  const feeCents = zone.feeCents ?? (zone.fee != null ? Math.round(zone.fee * 100) : 0);
  const fee = zone.fee ?? feeCents / 100;
  return {
    id: zone.id,
    nameEn: zone.nameEn ?? "",
    nameAr: zone.nameAr ?? "",
    city: zone.city ?? null,
    region: zone.region ?? null,
    fee,
    feeCents,
    etaMinutes: zone.etaMinutes ?? null,
    freeDeliveryThresholdCents: zone.freeDeliveryThresholdCents ?? null,
    minOrderAmountCents: zone.minOrderAmountCents ?? null,
    isActive: zone.isActive ?? true,
    createdAt: zone.createdAt,
    updatedAt: zone.updatedAt,
  };
}

function normalizeDriver(driver?: DeliveryDriverDto | null): DeliveryDriver | null {
  if (!driver) return null;
  return {
    id: driver.id,
    fullName: driver.fullName ?? driver.name ?? "",
    phone: driver.phone ?? "",
    nationalId: driver.nationalId ?? null,
    nationalIdImage: driver.nationalIdImage ?? null,
    isActive: driver.isActive ?? true,
    createdAt: driver.createdAt,
    updatedAt: driver.updatedAt ?? driver.createdAt,
    vehicle: driver.vehicle
      ? {
          id: driver.vehicle.id,
          type: driver.vehicle.type,
          plateNumber: driver.vehicle.plateNumber,
          color: driver.vehicle.color ?? null,
          licenseImageUrl: driver.vehicle.licenseImageUrl ?? driver.vehicle.licenseImage ?? null,
          licenseImage: driver.vehicle.licenseImage ?? driver.vehicle.licenseImageUrl ?? null,
        }
      : null,
  };
}

function normalizeOrderItem(item: OrderItemDto): OrderItem {
  const quantity = item.quantity ?? item.qty ?? 0;
  const unitPriceCents = item.priceSnapshotCents ?? item.unitPriceCents ?? 0;
  const lineTotalCents = item.lineTotalCents ?? item.totalCents ?? unitPriceCents * quantity;
  return {
    id: item.id ?? item.productId,
    productId: item.productId,
    productName: item.productNameSnapshot ?? item.productName ?? "",
    quantity,
    unitPriceCents,
    lineTotalCents,
    imageUrl: item.imageUrl,
    sku: item.sku,
  };
}

function normalizeOrderSummary(order: OrderDto): Order {
  const customer =
    order.customer ??
    order.user ??
    (order.guestName || order.guestPhone
      ? { id: order.id, name: order.guestName ?? "Guest", phone: order.guestPhone ?? "" }
      : { id: "", name: "", phone: "" });
  return {
    id: order.id,
    code: order.code || order.id,
    totalCents: order.totalCents ?? 0,
    status: (order.status as OrderStatus) ?? "PENDING",
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    customer,
    deliveryZone: normalizeZone(order.deliveryZone ?? order.zone ?? null),
    driver: normalizeDriver(order.driver),
    paymentMethod: order.paymentMethod ?? null,
    currency: order.currency,
  };
}

function normalizeOrderDetail(order: OrderDto): OrderDetail {
  const guestAddress = order.guestAddress ?? null;
  const address =
    order.address ??
    (guestAddress
      ? {
          line1: guestAddress.fullAddress ?? guestAddress.street ?? "",
          line2: guestAddress.street ?? null,
          building: guestAddress.building ?? null,
          apartment: guestAddress.apartment ?? null,
          city: guestAddress.city ?? null,
          region: guestAddress.region ?? null,
          notes: guestAddress.notes ?? null,
        }
      : null);
  return {
    ...normalizeOrderSummary(order),
    items: Array.isArray(order.items) ? order.items.map(normalizeOrderItem) : [],
    subtotalCents: order.subtotalCents ?? 0,
    couponDiscountCents: order.couponDiscountCents ?? order.discountCents ?? 0,
    loyaltyDiscountCents: order.loyaltyDiscountCents ?? 0,
    shippingFeeCents: order.shippingFeeCents ?? 0,
    address,
    notes: order.note ?? order.notes ?? null,
    metadata: order.metadata,
    currency: order.currency,
    allowedTransitions: order.allowedTransitions,
  };
}

function normalizeReceiptZone(zone?: (DeliveryZoneDto & { name?: string }) | null): OrderReceiptZone | null {
  if (!zone) return null;
  const feeCents = zone.feeCents ?? (zone.fee != null ? Math.round(zone.fee * 100) : 0);
  return {
    id: zone.id,
    nameEn: zone.nameEn ?? zone.name ?? "",
    nameAr: zone.nameAr ?? zone.name ?? "",
    fee: zone.fee ?? feeCents / 100,
    feeCents,
    etaMinutes: zone.etaMinutes ?? undefined,
    isActive: zone.isActive ?? true,
  };
}

function normalizeReceiptDriver(
  driver?: (DeliveryDriverDto & { vehicleType?: string | null; plateNumber?: string | null }) | null
): OrderReceiptDriver | null {
  if (!driver) return null;
  const normalized = normalizeDriver(driver);
  return {
    id: driver.id,
    fullName: normalized?.fullName ?? "",
    phone: normalized?.phone ?? "",
    vehicleType: driver.vehicleType ?? normalized?.vehicle?.type,
    plateNumber: driver.plateNumber ?? normalized?.vehicle?.plateNumber,
  };
}

function normalizeOrderReceipt(dto: OrderReceiptDto): OrderReceipt {
  const items = Array.isArray(dto.items)
    ? dto.items.map((item) => {
        const quantity = item.quantity ?? 0;
        const unitPriceCents = item.unitPriceCents ?? 0;
        return {
          productId: item.productId,
          productName: item.productName,
          quantity,
          unitPriceCents,
          lineTotalCents: item.lineTotalCents ?? item.totalCents ?? unitPriceCents * quantity,
        };
      })
    : [];

  const customer =
    dto.customer ??
    (dto.customerId || dto.customerName || dto.customerPhone
      ? { id: dto.customerId ?? "", name: dto.customerName ?? "", phone: dto.customerPhone ?? "" }
      : { id: "", name: "", phone: "" });

  const address = dto.address ?? {};

  return {
    id: dto.id ?? dto.orderId ?? "",
    code: dto.code ?? dto.id ?? dto.orderId ?? "",
    createdAt: dto.createdAt ?? "",
    status: dto.status ?? "PENDING",
    customer,
    address: {
      street: address.street,
      building: address.building,
      city: address.city,
      region: address.region,
      notes: address.notes,
      apartment: address.apartment,
      label: address.label,
      zoneId: address.zoneId ?? null,
    },
    deliveryZone: normalizeReceiptZone(dto.deliveryZone ?? null),
    driver: normalizeReceiptDriver(dto.driver),
    items,
    subtotalCents: dto.subtotalCents ?? 0,
    couponDiscountCents: dto.couponDiscountCents ?? dto.discountCents ?? 0,
    loyaltyDiscountCents: dto.loyaltyDiscountCents ?? 0,
    shippingFeeCents: dto.shippingFeeCents ?? 0,
    totalCents: dto.totalCents ?? 0,
    loyaltyPointsRedeemed: dto.loyaltyPointsRedeemed ?? dto.loyaltyPointsUsed ?? 0,
    loyaltyPointsEarned: dto.loyaltyPointsEarned ?? 0,
    currency: dto.currency ?? "AED",
  };
}

export async function listOrders(params?: OrderFilters): Promise<OrdersPaged> {
  const query = buildQueryParams(params) ?? {};
  const search = params?.customer?.trim();
  if (search && search.length >= 3) {
    query.customer = search;
  }

  try {
    const { data } = await api.get<OrdersPaged<OrderDto>>("/api/v1/admin/orders", { params: query });
    const items = (data.items || []).map((order) => normalizeOrderSummary(order));
    return { ...data, items };
  } catch (error) {
    if (shouldRetryWithoutFilters(error, ["status"]) && query.status) {
      const fallbackQuery = { ...query };
      delete (fallbackQuery as any).status;
      const { data } = await api.get<OrdersPaged<OrderDto>>("/api/v1/admin/orders", { params: fallbackQuery });
      const items = (data.items || []).map((order) => normalizeOrderSummary(order));
      return { ...data, items };
    }
    throw error;
  }
}

export async function getOrder(id: string): Promise<OrderDetail> {
  const { data } = await api.get<OrderDto>(`/api/v1/admin/orders/${id}`);
  return normalizeOrderDetail(data);
}

export async function updateOrderStatus(id: string, body: OrderStatusPayload) {
  const payload = body.note ? { note: body.note } : {};
  const status = body.to;
  const actionMap: Record<string, string> = {
    CONFIRMED: "confirm",
    PREPARING: "prepare",
    OUT_FOR_DELIVERY: "out-for-delivery",
    DELIVERED: "deliver",
    CANCELED: "cancel",
  };
  const action = actionMap[status];
  if (action) {
    const { data } = await api.post<{ ok: true }>(`/api/v1/admin/orders/${id}/${action}`, payload);
    return data;
  }
  const { data } = await api.patch<{ ok: true }>(`/api/v1/admin/orders/${id}/status`, body);
  return data;
}

export async function assignDriverToOrder(id: string, driverId: string) {
  const { data } = await api.patch(`/api/v1/admin/orders/${id}/assign-driver`, { driverId });
  return data;
}

export async function cancelOrder(id: string, note?: string) {
  const { data } = await api.post(`/api/v1/admin/orders/${id}/cancel`, note ? { note } : {});
  return data;
}

export async function getOrderHistory(id: string) {
  const { data } = await api.get<{ items: Array<{ id: string; at: string; from?: string; to: string; actor?: string; note?: string }> }>(
    `/api/v1/admin/orders/${id}/history`
  );
  return (data?.items || []).map((entry) => ({
    id: entry.id,
    at: entry.at,
    from: entry.from as OrderStatus | undefined,
    to: entry.to as OrderStatus,
    actor: entry.actor,
    note: entry.note,
  }));
}

export async function getOrderTransitions(id: string) {
  const { data } = await api.get<Array<{ from: string; to: string; label?: string; reason?: string }>>(
    `/api/v1/admin/orders/${id}/transitions`
  );
  return (data || []).map((entry) => ({
    from: entry.from as OrderStatus,
    to: entry.to as OrderStatus,
    label: entry.label,
    reason: entry.reason,
  }));
}

export async function getOrderDriverLocation(orderId: string) {
  const { data } = await api.get<{
    driverId: string;
    lat: number;
    lng: number;
    accuracy?: number | null;
    heading?: number | null;
    speed?: number | null;
    recordedAt: string;
  } | null>(`/api/v1/admin/orders/${orderId}/driver-location`);
  return data;
}

export async function lookupOrder(params: { code?: string; phone?: string }) {
  const query = buildQueryParams(params);
  const { data } = await api.get<OrderDto | null>("/api/v1/admin/orders/lookup", { params: query });
  return data ? normalizeOrderDetail(data) : null;
}

export async function getOrderReceipt(orderId: string): Promise<OrderReceipt> {
  const { data } = await api.get<OrderReceiptDto>(`/api/v1/admin/orders/${orderId}/receipt`);
  return normalizeOrderReceipt(data);
}

function shouldRetryWithoutFilters(error: unknown, forbiddenKeys: string[]) {
  const axiosError = error as AxiosError;
  if (!axiosError?.response?.data) return false;
  const errors = (axiosError.response.data as any)?.details?.errors;
  if (!Array.isArray(errors)) return false;
  return errors.some(
    (msg) => typeof msg === "string" && forbiddenKeys.some((key) => msg.includes(key) && msg.includes("should not exist"))
  );
}
