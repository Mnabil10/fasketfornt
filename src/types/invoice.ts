import type { PaginatedQuery, PagedResponse, Timestamped } from "./common";
import type { SubscriptionPlanSummary } from "./subscription";
import type { ProviderSummary } from "./subscription";
import type { SubscriptionStatus } from "./subscription";

export type InvoiceStatus = "DRAFT" | "OPEN" | "PAID" | "VOID";
export type InvoiceItemType = "SUBSCRIPTION" | "COMMISSION" | "ADJUSTMENT";

export type InvoiceItem = Timestamped & {
  id: string;
  invoiceId: string;
  type: InvoiceItemType;
  description?: string | null;
  amountCents: number;
};

export type ProviderLedgerEntry = Timestamped & {
  id: string;
  providerId: string;
  orderId?: string | null;
  orderGroupId?: string | null;
  invoiceId?: string | null;
  type: InvoiceItemType;
  amountCents: number;
  currency: string;
};

export type InvoiceSubscriptionSummary = {
  id: string;
  status: SubscriptionStatus;
  plan?: Pick<SubscriptionPlanSummary, "id" | "name" | "code" | "billingInterval"> | null;
};

export type Invoice = Timestamped & {
  id: string;
  providerId: string;
  subscriptionId?: string | null;
  number: string;
  status: InvoiceStatus;
  currency: string;
  amountDueCents: number;
  amountPaidCents: number;
  dueAt?: string | null;
  paidAt?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  provider?: ProviderSummary | null;
  subscription?: InvoiceSubscriptionSummary | null;
  items?: InvoiceItem[];
  ledgerEntries?: ProviderLedgerEntry[];
  _count?: { items: number };
};

export type InvoiceFilters = PaginatedQuery & {
  providerId?: string;
  status?: InvoiceStatus;
  from?: string;
  to?: string;
};

export type InvoiceListResponse = PagedResponse<Invoice>;
