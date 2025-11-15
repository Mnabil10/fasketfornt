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

type CategoryPayload = Partial<Category> & { imageUrl?: string | null };

function buildCategoryFormData(body: CategoryPayload, imageFile?: File | null) {
  const fd = new FormData();
  if (body.name != null) fd.append("name", String(body.name));
  if (body.nameAr != null) fd.append("nameAr", String(body.nameAr ?? ""));
  if (body.slug != null) fd.append("slug", String(body.slug));
  if (body.isActive != null) fd.append("isActive", body.isActive ? "true" : "false");
  if (body.sortOrder != null && Number.isFinite(Number(body.sortOrder))) {
    fd.append("sortOrder", String(Math.trunc(Number(body.sortOrder))));
  }
  if (body.parentId !== undefined) {
    const parent = body.parentId === null ? "" : String(body.parentId);
    fd.append("parentId", parent);
  }
  if (body.imageUrl) fd.append("imageUrl", body.imageUrl);
  if (imageFile) fd.append("image", imageFile, imageFile.name || "image");
  return fd;
}

export async function listCategories(params?: {
  q?: string;
  parentId?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
  sort?: string;
}) {
  const { data } = await api.get<Paged<Category>>("/api/v1/admin/categories", { params });
  return data;
}
export async function getCategory(id: string) {
  const { data } = await api.get<Category>(`/api/v1/admin/categories/${id}`);
  return data;
}

// Create category using multipart/form-data (supports image file upload or remote URL)
export async function createCategory(body: CategoryPayload, imageFile?: File | null) {
  const fd = buildCategoryFormData(body, imageFile);
  const { data } = await api.post<Category>("/api/v1/admin/categories", fd);
  return data;
}

// Update category; if an image file is provided, send multipart/form-data, else JSON
export async function updateCategory(id: string, body: CategoryPayload, imageFile?: File | null) {
  if (imageFile) {
    const fd = buildCategoryFormData(body, imageFile);
    const { data } = await api.patch<Category>(`/api/v1/admin/categories/${id}`, fd);
    return data;
  }
  const payload: CategoryPayload = { ...body };
  if (payload.sortOrder != null && Number.isFinite(Number(payload.sortOrder))) {
    payload.sortOrder = Math.trunc(Number(payload.sortOrder));
  }
  const { data } = await api.patch<Category>(`/api/v1/admin/categories/${id}`, payload);
  return data;
}

export async function reorderCategories(order: Array<{ id: string; sortOrder: number }>) {
  try {
    const { data } = await api.post<{ ok: boolean }>(`/api/v1/admin/categories/reorder`, { order });
    return data;
  } catch (error) {
    const axiosError = error as AxiosError;
    if (axiosError?.response?.status === 404) {
      // Backend may not implement bulk reorder; fallback to sequential updates
      await Promise.all(order.map((entry) => updateCategory(entry.id, { sortOrder: entry.sortOrder })));
      return { ok: true };
    }
    throw error;
  }
}

export async function deleteCategory(id: string) {
  const { data } = await api.delete<{ ok: true }>(`/api/v1/admin/categories/${id}`);
  return data;
}
