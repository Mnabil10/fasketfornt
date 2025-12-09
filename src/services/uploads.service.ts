import { api } from "../lib/api";

type UploadResponse = {
  url: string;
  warnings?: string[];
};

type SignedUploadTarget = {
  uploadUrl: string | null;
  publicUrl: string;
  driver?: "s3" | "local" | "inline";
  warnings?: string[];
};

type ResizeOptions = {
  maxDimension?: number; // max width/height
  quality?: number; // 0-1 for JPEG/WebP
  maxBytes?: number; // optional tighter cap
};

// Backend allows up to 10MB by default (UPLOAD_MAX_BYTES); mirror that client-side
const MAX_UPLOAD_MB = 10;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

export async function uploadAdminFile(file: File | Blob, options?: { resize?: ResizeOptions }): Promise<UploadResponse> {
  const size = (file as File).size ?? (file as Blob).size;
  if (typeof size === "number" && size > MAX_UPLOAD_BYTES) {
    throw new Error(`File is too large. Max ${MAX_UPLOAD_MB}MB`);
  }

  const maybeResized = await resizeImageIfNeeded(file, {
    ...options?.resize,
    maxBytes: options?.resize?.maxBytes ?? MAX_UPLOAD_BYTES,
  });

  const uploadUrl = await tryDirectUpload(maybeResized as File);
  if (uploadUrl) {
    return uploadUrl;
  }

  const formData = new FormData();
  formData.append("file", maybeResized);

  // Let the browser set the multipart boundary automatically
  const { data } = await api.post<UploadResponse>("/api/v1/admin/uploads", formData);

  return data;
}

async function resizeImageIfNeeded(file: File | Blob, options?: ResizeOptions): Promise<File | Blob> {
  if (typeof window === "undefined") return file; // server/SSR safeguard
  const type = (file as File).type || "application/octet-stream";
  if (!type.startsWith("image/")) return file;

  const maxDimension = options?.maxDimension ?? 1600;
  const maxBytes = options?.maxBytes ?? MAX_UPLOAD_BYTES;
  let quality = options?.quality ?? 0.85;

  const arrayBuffer = await file.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type });
  const dataUrl = await blobToDataURL(blob);
  const img = await loadImage(dataUrl);

  const { width, height } = img;
  const largerSide = Math.max(width, height);
  if (!largerSide || largerSide <= maxDimension) {
    // Even if dimensions are small, respect maxBytes by trying lightweight re-encode
    const encoded = await encodeImage(img, { width, height, quality, type });
    if (encoded.size <= maxBytes) return file;
  }

  let targetDimension = Math.min(maxDimension, largerSide);
  let attempt = 0;
  while (attempt < 6) {
    const scale = targetDimension / largerSide;
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const outputType = type === "image/png" ? "image/jpeg" : type;
    const resizedBlob = await encodeImage(img, { width: targetWidth, height: targetHeight, quality, type: outputType });

    if (resizedBlob.size <= maxBytes) {
      return file instanceof File ? new File([resizedBlob], file.name, { type: outputType }) : resizedBlob;
    }

    // Adjust for next iteration
    if (quality > 0.5) {
      quality = Math.max(0.45, quality - 0.15);
    } else {
      targetDimension = Math.round(targetDimension * 0.8);
    }
    attempt += 1;
  }

  throw new Error(`File is too large even after compression. Max ${Math.round(maxBytes / (1024 * 1024))}MB`);
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function dataURLToBlob(dataUrl: string, type: string): Blob {
  const base64 = dataUrl.split(",")[1] || "";
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type });
}

async function encodeImage(
  img: HTMLImageElement,
  opts: { width: number; height: number; quality: number; type: string }
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = opts.width;
  canvas.height = opts.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(img, 0, 0, opts.width, opts.height);

  const dataUrl = canvas.toDataURL(opts.type, opts.quality);
  return dataURLToBlob(dataUrl, opts.type);
}

async function tryDirectUpload(file: File): Promise<UploadResponse | null> {
  const contentType = file.type || "application/octet-stream";
  try {
    const { data } = await api.get<SignedUploadTarget>("/api/v1/admin/uploads/signed-url", {
      params: { filename: file.name || "upload", contentType },
    });
    if (!data?.uploadUrl) return null;
    await fetch(data.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: file,
    });
    return { url: data.publicUrl, warnings: data.warnings };
  } catch {
    return null;
  }
}
