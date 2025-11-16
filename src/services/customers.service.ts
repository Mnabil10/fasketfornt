import { api } from "../lib/api";
import { buildQueryParams } from "../lib/query";
export type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: 'CUSTOMER' | 'ADMIN' | 'STAFF' | string;
  createdAt: string;
  ordersCount?: number;
  totalSpentCents?: number;
  loyaltyTier?: string;
};
export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

export async function listCustomers(params?: { q?: string; page?: number; pageSize?: number }) {
  const query = buildQueryParams(params);
  const { data } = await api.get<Paged<Customer>>("/api/v1/admin/customers", { params: query });
  return data;
}
export async function getCustomer(id: string) {
  const { data } = await api.get(`/api/v1/admin/customers/${id}`);
  return data as any;
}

export async function setCustomerRole(id: string, role: 'CUSTOMER' | 'ADMIN' | 'STAFF') {
  const { data } = await api.patch<{ ok: true }>(`/api/v1/admin/customers/${id}/role`, { role });
  return data;
}

export async function resetCustomerPassword(id: string, newPassword: string) {
  const { data } = await api.patch<{ ok: true }>(
    `/api/v1/admin/customers/${id}/password`,
    { newPassword }
  );
  return data;
}
