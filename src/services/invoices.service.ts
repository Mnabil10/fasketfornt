import { api } from "../lib/api";
import { buildQueryParams } from "../lib/query";
import type { Invoice, InvoiceFilters, InvoiceListResponse } from "../types/invoice";

const BASE = "/api/v1/admin/invoices";

export async function listInvoices(filters?: InvoiceFilters) {
  const params = buildQueryParams(filters);
  const { data } = await api.get<InvoiceListResponse>(BASE, { params });
  return data;
}

export async function getInvoice(id: string) {
  const { data } = await api.get<Invoice>(`${BASE}/${id}`);
  return data;
}
