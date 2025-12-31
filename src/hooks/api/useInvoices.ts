import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listInvoices } from "../../services/invoices.service";
import type { InvoiceFilters, InvoiceListResponse } from "../../types/invoice";

export const INVOICES_QUERY_KEY = ["admin-invoices"] as const;

export function useInvoices(filters: InvoiceFilters, options?: { enabled?: boolean }) {
  return useQuery<InvoiceListResponse>({
    queryKey: [...INVOICES_QUERY_KEY, filters] as const,
    queryFn: () => listInvoices(filters),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}
