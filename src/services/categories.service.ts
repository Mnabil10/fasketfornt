import { api } from "../lib/api";
import type { AxiosError } from "axios";

export type Category = {
  id: string;
  name: string;
  // i18n
  nameAr?: string;
  slug: string;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  parentId: string | null;
};
export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

export async function listCategories(params?: {
  q?: string; parentId?: string; isActive?: boolean; page?: number; pageSize?: number;
}) {
  const { data } = await api.get<Paged<Category>>("/api/v1/admin/categories", { params: { ...params, _ts: Date.now() } });
  return data;
}
export async function getCategory(id: string) {
  const { data } = await api.get<Category>(`/api/v1/admin/categories/${id}`);
  return data;
}

// Create category using multipart/form-data (supports image file upload)
export async function createCategory(
  body: Partial<Category>,
  imageFile?: File | null
) {
  // Use fetch + FormData to mirror backend curl example
  const fd = new FormData();
  if (body.name != null) fd.append("name", String(body.name));
  if (body.nameAr != null) fd.append("nameAr", String(body.nameAr ?? ""));
  if (body.slug != null) fd.append("slug", String(body.slug));
  if (body.isActive != null) fd.append("isActive", String(!!body.isActive));
  if (body.sortOrder != null) fd.append("sortOrder", String(Math.trunc(Number(body.sortOrder))));
  if (body.parentId != null) fd.append("parentId", body.parentId ? String(body.parentId) : "");
  if (imageFile) fd.append("image", imageFile, imageFile.name || "image");

  const token = localStorage.getItem("fasket_admin_token") || "";
  const res = await fetch(`${api.defaults.baseURL}/api/v1/admin/categories`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
  });
  const data = await res.json();
  if (!res.ok) throw { response: { status: res.status, data } };
  return data as Category;
}

// Update category; if an image file is provided, send multipart/form-data, else JSON
export async function updateCategory(
  id: string,
  body: Partial<Category>,
  imageFile?: File | null
) {
  if (imageFile) {
    const fd = new FormData();
    if (body.name != null) fd.append("name", String(body.name));
    if (body.nameAr != null) fd.append("nameAr", String(body.nameAr ?? ""));
    if (body.slug != null) fd.append("slug", String(body.slug));
    if (body.isActive != null) fd.append("isActive", String(!!body.isActive));
    if (body.sortOrder != null) fd.append("sortOrder", String(Math.trunc(Number(body.sortOrder))));
    if (body.parentId != null) fd.append("parentId", body.parentId ? String(body.parentId) : "");
    fd.append("image", imageFile, imageFile.name || "image");

    const token = localStorage.getItem("fasket_admin_token") || "";
    const res = await fetch(`${api.defaults.baseURL}/api/v1/admin/categories/${id}`, {
      method: "PATCH",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw { response: { status: res.status, data } };
    return data as Category;
  }
  const { data } = await api.patch<Category>(`/api/v1/admin/categories/${id}`, body);
  return data;
}
export async function deleteCategory(id: string) {
  const { data } = await api.delete<{ ok: true }>(`/api/v1/admin/categories/${id}`);
  return data;
}
