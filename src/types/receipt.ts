import type { DeliveryDriver } from "./delivery";
import type { DeliveryZone } from "./zones";

export type ReceiptItem = {
  id?: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
};

export type OrderReceipt = {
  orderId: string;
  code: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  address: string;
  zone?: DeliveryZone | null;
  items: ReceiptItem[];
  subtotalCents: number;
  couponDiscountCents?: number | null;
  loyaltyDiscountCents?: number | null;
  shippingFeeCents?: number | null;
  totalCents: number;
  driver?: DeliveryDriver | null;
  loyalty?: {
    usedPoints?: number;
    earnedPoints?: number;
  };
};
