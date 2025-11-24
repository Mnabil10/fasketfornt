import { api } from "../lib/api";
import { buildQueryParams } from "../lib/query";
import { uploadAdminFile } from "./uploads.service";
import type {
  DeliveryDriver,
  DeliveryDriverFilters,
  DeliveryDriverPayload,
  DriverVehiclePayload,
  DriversPaged,
  UploadableImage,
} from "../types/delivery";

const BASE = "/api/v1/admin/delivery-drivers";

function isFileLike(value: unknown): value is File | Blob {
  return (typeof File !== "undefined" && value instanceof File) || (typeof Blob !== "undefined" && value instanceof Blob);
}

function resolveImageValue(value: UploadableImage) {
  if (!value) return null;
  if (isFileLike(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === "object" && "url" in value) {
    const url = (value as any).url;
    return typeof url === "string" && url.trim() ? url.trim() : null;
  }
  return null;
}

function resolveImageUrl(value: UploadableImage) {
  if (!value) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === "object" && "url" in value) {
    const url = (value as any).url;
    return typeof url === "string" && url.trim() ? url.trim() : null;
  }
  return null;
}

function getVehiclePayload(payload: DeliveryDriverPayload | DriverVehiclePayload) {
  return "vehicle" in payload ? payload.vehicle : payload;
}

function shouldUseFormData(payload: DeliveryDriverPayload | DriverVehiclePayload) {
  const vehicle = getVehiclePayload(payload);
  return (
    isFileLike((payload as DeliveryDriverPayload).nationalIdImage) ||
    isFileLike(vehicle?.licenseImage) ||
    isFileLike((vehicle as DriverVehiclePayload | undefined)?.licenseImageFile ?? null)
  );
}

function buildDriverFormData(payload: DeliveryDriverPayload | DriverVehiclePayload) {
  const fd = new FormData();
  if ("fullName" in payload && payload.fullName !== undefined) fd.append("fullName", String(payload.fullName));
  if ("phone" in payload && payload.phone !== undefined) fd.append("phone", String(payload.phone));
  if ("nationalId" in payload && payload.nationalId !== undefined) fd.append("nationalId", payload.nationalId ?? "");
  if ("isActive" in payload && payload.isActive !== undefined) fd.append("isActive", payload.isActive ? "true" : "false");

  const nationalIdImage = "nationalIdImage" in payload ? resolveImageValue(payload.nationalIdImage) : null;
  if (nationalIdImage) {
    if (isFileLike(nationalIdImage)) {
      fd.append("nationalIdImage", nationalIdImage);
    } else {
      fd.append("nationalIdImage", nationalIdImage);
    }
  }

  const vehicle = getVehiclePayload(payload);
  if (vehicle) {
    if (vehicle.type) fd.append("vehicle.type", vehicle.type);
    if (vehicle.plateNumber) fd.append("vehicle.plateNumber", vehicle.plateNumber);
    if (vehicle.color) fd.append("vehicle.color", vehicle.color);
    const licenseUrl = vehicle.licenseImageUrl ?? resolveImageUrl(vehicle.licenseImage ?? null);
    if (licenseUrl) fd.append("vehicle.licenseImageUrl", licenseUrl);
  }

  return fd;
}

function normalizeDriverBody(payload: DeliveryDriverPayload) {
  const body: DeliveryDriverPayload = { ...payload };
  const normalizedIdImage = resolveImageValue(payload.nationalIdImage);
  body.nationalIdImage = normalizedIdImage && !isFileLike(normalizedIdImage) ? normalizedIdImage : null;
  if (payload.vehicle) {
    const normalizedVehicle: DriverVehiclePayload = { ...payload.vehicle };
    const licenseUrl = payload.vehicle.licenseImageUrl ?? resolveImageUrl(payload.vehicle.licenseImage ?? null);
    normalizedVehicle.licenseImageUrl = licenseUrl || null;
    if ("licenseImage" in normalizedVehicle) delete (normalizedVehicle as any).licenseImage;
    if ("licenseImageFile" in normalizedVehicle) delete (normalizedVehicle as any).licenseImageFile;
    body.vehicle = normalizedVehicle;
  }
  return body;
}

export async function listDeliveryDrivers(filters?: DeliveryDriverFilters) {
  const params = buildQueryParams(filters);
  const { data } = await api.get<DriversPaged>(BASE, { params });
  return data;
}

export async function getDeliveryDriver(id: string) {
  const { data } = await api.get<DeliveryDriver>(`${BASE}/${id}`);
  return data;
}

export async function createDeliveryDriver(payload: DeliveryDriverPayload) {
  const useFormData = shouldUseFormData(payload);
  const body = useFormData ? buildDriverFormData(payload) : normalizeDriverBody(payload);
  const { data } = await api.post<DeliveryDriver>(BASE, body);
  return data;
}

export async function updateDeliveryDriver(id: string, payload: DeliveryDriverPayload) {
  const useFormData = shouldUseFormData(payload);
  const body = useFormData ? buildDriverFormData(payload) : normalizeDriverBody(payload);
  const { data } = await api.put<DeliveryDriver>(`${BASE}/${id}`, body);
  return data;
}

export async function updateDeliveryDriverStatus(id: string, isActive: boolean) {
  const { data } = await api.patch<DeliveryDriver>(`${BASE}/${id}/status`, { isActive });
  return data;
}

export async function saveDeliveryDriverVehicle(id: string, payload: DriverVehiclePayload) {
  const licenseImageFile =
    payload.licenseImageFile && isFileLike(payload.licenseImageFile)
      ? payload.licenseImageFile
      : isFileLike(payload.licenseImage) ? (payload.licenseImage as File | Blob) : null;
  let licenseImageUrl =
    payload.licenseImageUrl?.trim() || resolveImageUrl(payload.licenseImage ?? null) || null;

  if (licenseImageFile) {
    const { url } = await uploadAdminFile(licenseImageFile);
    licenseImageUrl = url;
  }

  const type = payload.type?.toString().trim();
  const plateNumber = payload.plateNumber?.toString().trim();
  const color = payload.color?.toString().trim() || undefined;

  const body = {
    type,
    plateNumber,
    color,
    licenseImageUrl: licenseImageUrl || undefined,
  };

  const { data } = await api.patch<DeliveryDriver>(`${BASE}/${id}/vehicle`, body);
  return data;
}
