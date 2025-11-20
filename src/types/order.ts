import type { DeliveryDriver } from "./delivery";
import type { DeliveryZone } from "./zones";
import type { PagedResponse, PaginatedQuery, Timestamped } from "./common";

export type OrderStatus = "PENDING" | "PROCESSING" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELED";

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
  totalCents: number;
  imageUrl?: string | null;
  sku?: string | null;
};

export type OrderSummary = Timestamped & {
  id: string;
  code?: string;
  totalCents: number;
  status: OrderStatus;
  createdAt: string;
  customer: OrderCustomer;
  driver?: DeliveryDriver | null;
  zone?: DeliveryZone | null;
  paymentMethod?: string | null;
};

export type OrderDetail = OrderSummary & {
  items: OrderItem[];
  subtotalCents: number;
  couponDiscountCents?: number | null;
  loyaltyDiscountCents?: number | null;
  shippingFeeCents?: number | null;
  address?: OrderAddress | null;
  notes?: string | null;
  metadata?: Record<string, any>;
};

export type OrderFilters = PaginatedQuery & {
  status?: OrderStatus;
  from?: string;
  to?: string;
  customer?: string;
  minTotalCents?: number;
  maxTotalCents?: number;
  driverId?: string;
};

export type OrderStatusPayload = {
  to: OrderStatus;
  note?: string;
  actorId?: string;
};

export type OrdersPaged = PagedResponse<OrderSummary>;
