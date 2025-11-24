import { api } from "../lib/api";

type UploadResponse = {
  url: string;
};

const MAX_UPLOAD_MB = 2;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

export async function uploadAdminFile(file: File | Blob): Promise<UploadResponse> {
  const size = (file as File).size ?? (file as Blob).size;
  if (typeof size === "number" && size > MAX_UPLOAD_BYTES) {
    throw new Error(`File is too large. Max ${MAX_UPLOAD_MB}MB`);
  }

  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post<UploadResponse>("/api/v1/admin/uploads", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data;
}
