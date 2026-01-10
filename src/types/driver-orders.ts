import type { PaginatedQuery, PaginatedResponse } from "./common";
import type { DeliveryFailureReason, OrderStatus } from "./order";

export type DriverOrderAddress = {
  label?: string | null;
  city?: string | null;
  street?: string | null;
  building?: string | null;
  apartment?: string | null;
  notes?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export type DriverOrderItem = {
  id: string;
  name?: string | null;
  qty?: number | null;
  priceSnapshotCents?: number | null;
};

export type DriverOrderCustomer = {
  id: string;
  name: string;
  phone: string;
};

export type DriverOrder = {
  id: string;
  code: string;
  status: OrderStatus;
  createdAt: string;
  deliveryFailedAt?: string | null;
  deliveryFailedReason?: DeliveryFailureReason | null;
  deliveryFailedNote?: string | null;
  totalCents?: number | null;
  paymentMethod?: string | null;
  customer: DriverOrderCustomer;
  address?: DriverOrderAddress | null;
  items?: DriverOrderItem[];
};

export type DriverOrderFilters = PaginatedQuery & {
  status?: OrderStatus;
};

export type DriverOrdersPaged = PaginatedResponse<DriverOrder>;

export type DriverOrderStatusPayload = {
  to: OrderStatus;
  reason?: DeliveryFailureReason;
  note?: string;
};
