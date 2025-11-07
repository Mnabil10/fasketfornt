import { api } from "../lib/api";
import type { AxiosError } from "axios";
export type Product = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  // i18n (admin saves both)
  nameAr?: string;
  descriptionAr?: string;
  // merchandising
  isHotOffer?: boolean;
  imageUrl?: string | null;
  images?: string[];
  priceCents: number;
  salePriceCents?: number | null;
  stock: number;
  status: "DRAFT" | "ACTIVE" | "HIDDEN" | "DISCONTINUED";
  categoryId: string;
};
export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

export async function listProducts(params?: {
  q?: string; categoryId?: string; status?: Product["status"];
  minPriceCents?: number; maxPriceCents?: number; inStock?: boolean;
  orderBy?: "createdAt"|"priceCents"|"name"; sort?: "asc"|"desc";
  page?: number; pageSize?: number;
}) {
  const { data } = await api.get<Paged<Product>>("/api/v1/admin/products", { params: { ...params, _ts: Date.now() } });
  return data;
}
// New: List hot offers
export async function listHotOffers(params?: { q?: string; page?: number; pageSize?: number }) {
  const { data } = await api.get<Paged<Product>>(
    "/api/v1/admin/products/hot-offers",
    { params: { ...params, _ts: Date.now() } }
  );
  return data;
}
export async function getProduct(id: string) {
  const { data } = await api.get<Product>(`/api/v1/admin/products/${id}`);
  return data;
}

// Create product using multipart/form-data (supports image file upload)
export async function createProduct(
  body: Partial<Product>,
  imageFile?: File | null
) {
  // If there's a file, mirror the backend example using fetch + FormData
  if (imageFile) {
    const fd = new FormData();
    if (body.name != null) fd.append("name", String(body.name));
    if (body.slug != null) fd.append("slug", String(body.slug));
    if (body.description != null) fd.append("description", String(body.description ?? ""));
    if (body.nameAr != null) fd.append("nameAr", String(body.nameAr ?? ""));
    if (body.descriptionAr != null) fd.append("descriptionAr", String(body.descriptionAr ?? ""));
    if (body.isHotOffer != null) fd.append("isHotOffer", String(!!body.isHotOffer));
    if (body.priceCents != null) fd.append("priceCents", String(Math.trunc(Number(body.priceCents))));
    if (body.salePriceCents != null) fd.append("salePriceCents", String(Math.trunc(Number(body.salePriceCents))));
    if (body.stock != null) fd.append("stock", String(Math.trunc(Number(body.stock))));
    if (body.status != null) fd.append("status", String(body.status));
    if (body.categoryId != null) fd.append("categoryId", String(body.categoryId));
    fd.append("image", imageFile, imageFile.name || "image");

    const token = localStorage.getItem("fasket_admin_token") || "";
    const res = await fetch(`${api.defaults.baseURL}/api/v1/admin/products`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: fd, // do not set Content-Type
    });
    const data = await res.json();
    if (!res.ok) throw { response: { status: res.status, data } };
    return data as Product;
  }
  // No file: JSON is fine
  const { data } = await api.post<Product>("/api/v1/admin/products", body);
  return data;
}

// Update product; if an image file is provided, send multipart/form-data, else JSON
export async function updateProduct(
  id: string,
  body: Partial<Product>,
  imageFile?: File | null
) {
  if (imageFile) {
    const fd = new FormData();
    if (body.name != null) fd.append("name", String(body.name));
    if (body.slug != null) fd.append("slug", String(body.slug));
    if (body.description != null) fd.append("description", String(body.description ?? ""));
    if (body.nameAr != null) fd.append("nameAr", String(body.nameAr ?? ""));
    if (body.descriptionAr != null) fd.append("descriptionAr", String(body.descriptionAr ?? ""));
    if (body.isHotOffer != null) fd.append("isHotOffer", String(!!body.isHotOffer));
    if (body.priceCents != null) fd.append("priceCents", String(Math.trunc(Number(body.priceCents))));
    if (body.salePriceCents != null) fd.append("salePriceCents", String(Math.trunc(Number(body.salePriceCents))));
    if (body.stock != null) fd.append("stock", String(Math.trunc(Number(body.stock))));
    if (body.status != null) fd.append("status", String(body.status));
    if (body.categoryId != null) fd.append("categoryId", String(body.categoryId));
    fd.append("image", imageFile, imageFile.name || "image");

    const token = localStorage.getItem("fasket_admin_token") || "";
    const res = await fetch(`${api.defaults.baseURL}/api/v1/admin/products/${id}`, {
      method: "PATCH",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw { response: { status: res.status, data } };
    return data as Product;
  }
  const { data } = await api.patch<Product>(`/api/v1/admin/products/${id}`, body);
  return data;
}
export async function deleteProduct(id: string) {
  const { data } = await api.delete<{ ok: true }>(`/api/v1/admin/products/${id}`);
  return data;
}
