import type { DeliveryDriver } from "./delivery";
import type { DeliveryZone } from "./zones";
import type { PaginatedResponse, PaginatedQuery } from "./common";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "OUT_FOR_DELIVERY"
  | "DELIVERY_FAILED"
  | "DELIVERED"
  | "CANCELED"
  | (string & {});

export type DeliveryFailureReason =
  | "NO_ANSWER"
  | "WRONG_ADDRESS"
  | "UNSAFE_LOCATION"
  | "CUSTOMER_REQUESTED_RESCHEDULE";

export type OrderCustomer = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
};

export type OrderAddress = {
  id?: string;
  line1?: string;
  line2?: string | null;
  building?: string | null;
  apartment?: string | null;
  city?: string | null;
  region?: string | null;
  zoneName?: string | null;
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  imageUrl?: string | null;
  sku?: string | null;
};

export type Order = {
  id: string;
  code: string;
  orderGroupId?: string | null;
  totalCents: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt?: string;
  deliveryFailedAt?: string | null;
  deliveryFailedReason?: DeliveryFailureReason | null;
  deliveryFailedNote?: string | null;
  customer: OrderCustomer;
  driver?: DeliveryDriver | null;
  deliveryZone?: DeliveryZone | null;
  paymentMethod?: string | null;
  currency?: string;
};

export type OrderSummary = Order;

export type OrderDetail = Order & {
  items: OrderItem[];
  subtotalCents: number;
  couponDiscountCents?: number | null;
  loyaltyDiscountCents?: number | null;
  shippingFeeCents?: number | null;
  address?: OrderAddress | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
  currency?: string;
  allowedTransitions?: OrderStatus[];
  estimatedDeliveryTime?: string | null;
  deliveryEtaMinutes?: number | null;
  deliveryDistanceKm?: number | null;
  deliveryRatePerKmCents?: number | null;
};

export type OrderFilters = PaginatedQuery & {
  status?: OrderStatus;
  from?: string;
  to?: string;
  customer?: string;
  q?: string;
  search?: string;
  minTotalCents?: number;
  maxTotalCents?: number;
  driverId?: string;
  hasDriver?: boolean;
  providerId?: string;
  orderGroupId?: string;
};

export type OrderStatusPayload = {
  to: OrderStatus;
  note?: string;
  actorId?: string;
};

export type OrdersPaged<T = OrderSummary> = PaginatedResponse<T>;

export type OrderHistoryEntry = {
  id: string;
  at: string;
  from?: OrderStatus;
  to: OrderStatus;
  actor?: string | null;
  note?: string | null;
};

export type OrderTransition = {
  from: OrderStatus;
  to: OrderStatus;
  label?: string;
  reason?: string;
};

export type OrderReceiptCustomer = {
  id: string;
  name: string;
  phone: string;
};

export type OrderReceiptAddress = {
  street?: string;
  building?: string;
  city?: string;
  region?: string;
  notes?: string;
  apartment?: string;
  label?: string;
  zoneId?: string | null;
};

export type OrderReceiptItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
};

export type OrderReceiptDriver = {
  id: string;
  fullName: string;
  phone: string;
  vehicleType?: string;
  plateNumber?: string;
};

export type OrderReceiptZone = {
  id: string;
  nameEn: string;
  nameAr: string;
  fee: number;
  feeCents: number;
  etaMinutes?: number;
  isActive: boolean;
};

export type OrderReceipt = {
  id: string;
  code: string;
  status: OrderStatus | string;
  createdAt: string;
  customer: OrderReceiptCustomer;
  address: OrderReceiptAddress;
  deliveryZone?: OrderReceiptZone | null;
  driver?: OrderReceiptDriver | null;
  items: OrderReceiptItem[];
  subtotalCents: number;
  couponDiscountCents: number;
  loyaltyDiscountCents: number;
  shippingFeeCents: number;
  totalCents: number;
  loyaltyPointsRedeemed?: number;
  loyaltyPointsEarned?: number;
  currency: string;
};
