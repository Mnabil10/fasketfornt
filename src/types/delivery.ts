import type { Timestamped, PagedResponse, PaginatedQuery, FileResource } from "./common";

export type VehicleType = "CAR" | "BIKE" | "SCOOTER";

export type DriverVehicle = {
  type: VehicleType;
  plateNumber: string;
  color?: string | null;
  licenseImage?: string | null;
};

export type DeliveryDriver = Timestamped & {
  id: string;
  fullName: string;
  phone: string;
  nationalId?: string | null;
  nationalIdImage?: string | null | FileResource;
  isActive: boolean;
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
  nationalIdImage?: string | null;
  isActive?: boolean;
};

export type DriverVehiclePayload = DriverVehicle;

export type DriversPaged = PagedResponse<DeliveryDriver>;

export type DriverAssignmentPayload = {
  driverId: string;
};
