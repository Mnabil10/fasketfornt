import type { PaginatedQuery, PaginatedResponse } from "./common";

export type UploadableImage = string | { url?: string | null } | File | Blob | null;

export type DriverVehicle = {
  id?: string;
  type?: string;
  plateNumber?: string;
  color?: string | null;
  licenseImageUrl?: string | null;
  licenseImage?: UploadableImage;
};

export type DeliveryDriver = {
  id: string;
  fullName: string;
  phone: string;
  nationalId?: string | null;
  nationalIdImage?: UploadableImage;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  vehicle?: DriverVehicle | null;
};

export type DeliveryDriverFilters = PaginatedQuery & {
  search?: string;
  isActive?: boolean;
};

export type DeliveryDriverPayload = {
  fullName: string;
  phone: string;
  nationalId?: string | null;
  nationalIdImage?: UploadableImage;
  isActive?: boolean;
  vehicle?: DriverVehicle | null;
};

export type DriverVehiclePayload = DriverVehicle & {
  licenseImageFile?: File | Blob | null;
};

export type VehicleFormValues = {
  type: string;
  plateNumber: string;
  color: string;
  licenseImageFile?: File | null;
  licenseImageUrl?: string | null;
};

export type DriversPaged = PaginatedResponse<DeliveryDriver>;
