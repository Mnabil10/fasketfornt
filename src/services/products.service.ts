import { api } from "../lib/api";

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
  createdAt?: string;
  stock: number;
  status: "DRAFT" | "ACTIVE" | "HIDDEN" | "DISCONTINUED";
  categoryId: string;
  sku?: string | null;
};
export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

export type BulkUploadRow = {
  rowNumber?: number | string;
  row?: number | string;
  status: string;
  productId?: string;
  name?: string;
  errorMessage?: string;
  errorCode?: string;
  message?: string;
  dryRun?: boolean;
};
export type BulkUploadError = { row: number | string; code?: string; message: string };
export type BulkUploadResult = {
  created: number;
  updated: number;
  skipped: number;
  dryRun: boolean;
  rows: BulkUploadRow[];
  errors: BulkUploadError[];
};

type ProductPayload = Partial<Product> & {
  images?: string[];
  imageUrl?: string | null;
  sku?: string | null;
};

function appendImages(fd: FormData, images?: string[] | null) {
  if (!Array.isArray(images)) return;
  images.filter(Boolean).forEach((image) => {
    const payload = typeof image === "string" ? { url: image } : image;
    fd.append("images[]", JSON.stringify(payload));
  });
}

function buildProductFormData(body: ProductPayload, imageFile?: File | null) {
  const fd = new FormData();
  if (body.name != null) fd.append("name", String(body.name));
  if (body.slug != null) fd.append("slug", String(body.slug));
  if (body.description != null) fd.append("description", String(body.description ?? ""));
  if (body.nameAr != null) fd.append("nameAr", String(body.nameAr ?? ""));
  if (body.descriptionAr != null) fd.append("descriptionAr", String(body.descriptionAr ?? ""));
  if (body.isHotOffer != null) fd.append("isHotOffer", body.isHotOffer ? "true" : "false");
  if (body.priceCents != null) fd.append("priceCents", String(Math.trunc(Number(body.priceCents))));
  if (body.salePriceCents != null) fd.append("salePriceCents", String(Math.trunc(Number(body.salePriceCents))));
  if (body.stock != null) fd.append("stock", String(Math.trunc(Number(body.stock))));
  if (body.status != null) fd.append("status", String(body.status));
  if (body.categoryId != null) fd.append("categoryId", String(body.categoryId));
  if (body.imageUrl) fd.append("imageUrl", body.imageUrl);
  if (body.sku) fd.append("sku", String(body.sku));
  appendImages(fd, body.images);
  if (imageFile) fd.append("image", imageFile, imageFile.name || "image");
  return fd;
}

function normalizeJsonPayload(body: ProductPayload) {
  const payload: Record<string, any> = { ...body };
  if (Array.isArray(body.images)) {
    payload.images = body.images.filter(Boolean).map((image) => {
      if (typeof image === "string") return { url: image };
      return image;
    });
  }
  return payload;
}

export async function listProducts(params?: {
  q?: string;
  categoryId?: string;
  status?: Product["status"];
  minPriceCents?: number;
  maxPriceCents?: number;
  inStock?: boolean;
  isHotOffer?: boolean;
  orderBy?: "createdAt" | "priceCents" | "name" | "stock";
  sortDirection?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}) {
  const { data } = await api.get<Paged<Product>>("/api/v1/admin/products", { params });
  return data;
}
// New: List hot offers
export async function listHotOffers(params?: { q?: string; page?: number; pageSize?: number }) {
  const { data } = await api.get<Paged<Product>>("/api/v1/admin/products/hot-offers", { params });
  return data;
}
export async function getProduct(id: string) {
  const { data } = await api.get<Product>(`/api/v1/admin/products/${id}`);
  return data;
}

// Create product using multipart/form-data (supports image file upload)
export async function createProduct(body: ProductPayload, imageFile?: File | null) {
  if (imageFile) {
    const fd = buildProductFormData(body, imageFile);
    const { data } = await api.post<Product>("/api/v1/admin/products", fd);
    return data;
  }
  const payload = normalizeJsonPayload(body);
  const { data } = await api.post<Product>("/api/v1/admin/products", payload);
  return data;
}

// Update product; if an image file is provided, send multipart/form-data, else JSON
export async function updateProduct(id: string, body: ProductPayload, imageFile?: File | null) {
  if (imageFile) {
    const fd = buildProductFormData(body, imageFile);
    const { data } = await api.patch<Product>(`/api/v1/admin/products/${id}`, fd);
    return data;
  }
  const payload = normalizeJsonPayload(body);
  const { data } = await api.patch<Product>(`/api/v1/admin/products/${id}`, payload);
  return data;
}
export async function deleteProduct(id: string) {
  const { data } = await api.delete<{ ok: true }>(`/api/v1/admin/products/${id}`);
  return data;
}

export async function downloadProductsBulkTemplate() {
  const { data } = await api.get<Blob>("/api/v1/admin/products/bulk-template", {
    responseType: "blob",
  });
  return data;
}

export async function uploadProductsBulk(file: File, options?: { dryRun?: boolean }) {
  const formData = new FormData();
  formData.append("file", file, file.name || "products-upload.xlsx");
  const params = options?.dryRun ? { dryRun: "true" } : undefined;
  const { data } = await api.post<BulkUploadResult>("/api/v1/admin/products/bulk-upload", formData, { params });
  return {
    created: data?.created ?? 0,
    updated: data?.updated ?? 0,
    skipped: data?.skipped ?? 0,
    dryRun: !!data?.dryRun,
    rows: Array.isArray(data?.rows) ? data.rows : [],
    errors: Array.isArray(data?.errors) ? data.errors : [],
  };
}
