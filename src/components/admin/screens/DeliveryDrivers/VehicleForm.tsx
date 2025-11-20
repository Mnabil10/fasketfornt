import React from "react";
import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Input } from "../../../ui/input";
import { Label } from "../../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select";
import type { DriverFormValues } from "./DriverForm";

type VehicleFormProps = {
  control: Control<DriverFormValues>;
  errors: FieldErrors<DriverFormValues>;
};

export function VehicleForm({ control, errors }: VehicleFormProps) {
  const { t, i18n } = useTranslation();
  const dirClass = i18n.language === "ar" ? "text-right" : "text-left";
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
      <div className="space-y-2">
        <Label className={dirClass}>{t("drivers.vehicle.type", "Type")}</Label>
        <Controller
          control={control}
          name="vehicle.type"
          render={({ field }) => (
            <Select value={field.value || "CAR"} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder={t("drivers.vehicleType", "Vehicle type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CAR">{t("drivers.vehicle.types.car", "Car")}</SelectItem>
                <SelectItem value="BIKE">{t("drivers.vehicle.types.bike", "Bike")}</SelectItem>
                <SelectItem value="SCOOTER">{t("drivers.vehicle.types.scooter", "Scooter")}</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-2">
        <Label className={dirClass}>{t("drivers.vehicle.plateNumber", "Plate number")}</Label>
        <Controller
          control={control}
          name="vehicle.plateNumber"
          render={({ field }) => <Input placeholder="123-ABC" {...field} />}
        />
        {errors.vehicle?.plateNumber && (
          <p className="text-sm text-red-500">{errors.vehicle.plateNumber.message as string}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label className={dirClass}>{t("drivers.vehicle.color", "Color")}</Label>
        <Controller control={control} name="vehicle.color" render={({ field }) => <Input placeholder="Black" {...field} />} />
      </div>

      <div className="space-y-2">
        <Label className={dirClass}>{t("drivers.vehicle.licenseImage", "License image URL")}</Label>
        <Controller
          control={control}
          name="vehicle.licenseImage"
          render={({ field }) => <Input placeholder="https://" {...field} />}
        />
      </div>
    </div>
  );
}
