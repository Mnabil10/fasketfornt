import { api } from "../lib/api";
import { buildQueryParams } from "../lib/query";
import type { ProductFilters } from "../types/product";

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

type ProductPayload = Partial<Omit<Product, "images">> & {
  images?: Array<string | { url?: string | null }>;
  imageUrl?: string | null;
  sku?: string | null;
};

function resolveImageUrl(image: string | { url?: string | null } | null | undefined) {
  if (!image) return null;
  if (typeof image === "string") {
    const trimmed = image.trim();
    return trimmed || null;
  }
  if (typeof image === "object" && typeof image.url === "string") {
    const trimmed = image.url.trim();
    return trimmed || null;
  }
  return null;
}

function appendImages(fd: FormData, images?: Array<string | { url?: string | null }> | null) {
  if (!Array.isArray(images)) return;
  images.forEach((image) => {
    const url = resolveImageUrl(image);
    if (url) {
      fd.append("images[]", url);
    }
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
    const urls = body.images
      .map((image) => resolveImageUrl(image))
      .filter((url): url is string => typeof url === "string" && url.length > 0);
    if (urls.length) {
      payload.images = urls;
    } else {
      delete payload.images;
    }
  }
  return payload;
}

export async function listProducts(params?: ProductFilters) {
  const { isHotOffer, ...rest } = params ?? {};
  const query = buildQueryParams(rest);

  if (isHotOffer) {
    // Backend auto-filters isHotOffer on this endpoint and rejects an explicit isHotOffer query param
    const { data } = await api.get<Paged<Product>>("/api/v1/admin/products/hot-offers", { params: query });
    return data;
  }

  const { data } = await api.get<Paged<Product>>("/api/v1/admin/products", { params: query });
  return data;
}
// New: List hot offers
export async function listHotOffers(params?: ProductFilters) {
  const { isHotOffer, ...rest } = params ?? {};
  const query = buildQueryParams(rest);
  const { data } = await api.get<Paged<Product>>("/api/v1/admin/products/hot-offers", { params: query });
  return data;
}
export async function getProduct(id: string): Promise<Product> {
  const { data } = await api.get<Product | null>(`/api/v1/admin/products/${id}`);
  if (!data) {
    throw new Error("Product not found");
  }
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

export type DownloadedFile = {
  blob: Blob;
  filename?: string;
  contentType?: string;
  size?: number;
};

export async function downloadProductsBulkTemplate(): Promise<DownloadedFile> {
  const response = await api.get<Blob>("/api/v1/admin/products/bulk-template", {
    responseType: "blob",
  });
  return normalizeStreamableResponse(response.data, response.headers);
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

type StreamableFilePayload = {
  options?: { disposition?: string; type?: string; length?: number };
  stream?: unknown;
  data?: unknown;
};

async function normalizeStreamableResponse(data: Blob, headers?: unknown): Promise<DownloadedFile> {
  if (!(data instanceof Blob)) {
    return buildFileFromPayload(data);
  }

  const shouldParseJson = !data.type || data.type.includes("json");

  if (shouldParseJson) {
    const payloadText = await data.text();
    try {
      const parsed = JSON.parse(payloadText);
      if (parsed?.success === false) {
        throw new Error(parsed?.error?.message || "Failed to download template");
      }
      const payload = parsed?.data ?? parsed;
      return buildFileFromPayload(payload);
    } catch (error) {
      if (error instanceof SyntaxError) {
        return {
          blob: data,
          filename: getFilenameFromHeaders(headers),
          contentType: data.type,
          size: data.size,
        };
      }
      throw error;
    }
  }

  return {
    blob: data,
    filename: getFilenameFromHeaders(headers),
    contentType: data.type,
    size: data.size,
  };
}

function buildFileFromPayload(payload: unknown): DownloadedFile {
  if (payload instanceof Blob) {
    return { blob: payload, contentType: payload.type, size: payload.size };
  }
  if (payload instanceof ArrayBuffer) {
    const blob = new Blob([payload]);
    return { blob, contentType: blob.type, size: blob.size };
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid template payload");
  }

  const streamPayload = payload as StreamableFilePayload;
  const bytes = extractStreamBytes(streamPayload.stream) || extractStreamBytes((streamPayload as any).data);

  if (!bytes) {
    throw new Error("Template response did not include stream data");
  }

  const contentType = streamPayload.options?.type || "application/octet-stream";
  const buffer = new Uint8Array(bytes).buffer;
  const blob = new Blob([buffer], { type: contentType });
  return {
    blob,
    filename: extractFilename(streamPayload.options?.disposition),
    contentType,
    size: bytes.length,
  };
}

function extractStreamBytes(source: unknown): Uint8Array | null {
  if (!source) return null;

  if (source instanceof ArrayBuffer) {
    return new Uint8Array(source);
  }

  if (ArrayBuffer.isView(source)) {
    const view = source as ArrayBufferView;
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  }

  if (isBufferLike(source)) {
    return new Uint8Array(source.data);
  }

  const chunks: number[][] = [];
  collectBufferChunks(source, chunks, new Set());
  if (!chunks.length) {
    return null;
  }

  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const bytes = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i += 1) {
      bytes[offset++] = chunk[i] & 0xff;
    }
  }
  return bytes;
}

function collectBufferChunks(value: unknown, acc: number[][], visited: Set<unknown>) {
  if (value == null) return;

  if (isNumberArray(value)) {
    acc.push(value);
    return;
  }

  if (ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView;
    const arr = Array.from(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
    acc.push(arr);
    return;
  }

  if (isBufferLike(value)) {
    acc.push(value.data);
    return;
  }

  if (Array.isArray(value)) {
    if (visited.has(value)) return;
    visited.add(value);
    value.forEach((item) => collectBufferChunks(item, acc, visited));
    return;
  }

  if (typeof value === "object") {
    if (visited.has(value)) return;
    visited.add(value);
    Object.values(value as Record<string, unknown>).forEach((child) => {
      collectBufferChunks(child, acc, visited);
    });
  }
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === "number");
}

function isBufferLike(value: unknown): value is { type: string; data: number[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as any).type === "Buffer" &&
    isNumberArray((value as any).data)
  );
}

function extractFilename(disposition?: string): string | undefined {
  if (!disposition) return undefined;
  const filenameMatch = disposition.match(/filename\*?=(.+?)(?:;|$)/i);
  if (!filenameMatch) return undefined;
  const raw = filenameMatch[1].trim().replace(/^UTF-8''/i, "");
  const unquoted = raw.replace(/^"+|"+$/g, "");
  try {
    return decodeURIComponent(unquoted);
  } catch {
    return unquoted;
  }
}

function getFilenameFromHeaders(headers?: unknown): string | undefined {
  if (!headers || typeof headers !== "object") return undefined;
  const record =
    typeof (headers as any).toJSON === "function"
      ? (headers as any).toJSON()
      : (headers as Record<string, unknown>);
  if (!record) return undefined;
  const key = Object.keys(record).find((header) => header.toLowerCase() === "content-disposition");
  if (!key) return undefined;
  const value = record[key];
  return typeof value === "string" ? extractFilename(value) : undefined;
}
