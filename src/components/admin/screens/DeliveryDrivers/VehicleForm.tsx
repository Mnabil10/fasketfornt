import React from "react";
import { Controller, type Control, type FieldError, type FieldErrors, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Input } from "../../../ui/input";
import { Label } from "../../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select";
import type { DriverFormValues } from "./DriverForm";

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

type VehicleFormProps = {
  control: Control<DriverFormValues>;
  errors: FieldErrors<DriverFormValues>;
  dirClass: string;
  renderError: (error?: FieldError) => React.ReactNode;
  onLicenseChange: (file: File | null) => void;
  maxImageMb: number;
};

function renderPreview(file: File | null | undefined, url: string | null | undefined, label: string) {
  if (file) {
    return <p className="text-xs text-muted-foreground">{file.name}</p>;
  }
  if (url) {
    return (
      <a className="text-xs text-blue-600 underline" href={url} target="_blank" rel="noreferrer">
        {label}
      </a>
    );
  }
  return null;
}

export function VehicleForm({ control, errors, dirClass, renderError, onLicenseChange, maxImageMb }: VehicleFormProps) {
  const { t, i18n } = useTranslation();
  const labelDir = dirClass || (i18n.language === "ar" ? "text-right" : "text-left");
  const requiredMark = <span className="text-rose-500">*</span>;
  const licenseImageUrl = useWatch({ control, name: "licenseImageUrl" }) as string | null | undefined;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
      <div className="space-y-2">
        <Label className={labelDir}>
          {t("drivers.vehicle.type", "Type")} {requiredMark}
        </Label>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <Select value={field.value || "CAR"} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder={t("drivers.vehicleType", "Vehicle type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CAR">{t("drivers.vehicle.types.car", "Car")}</SelectItem>
                <SelectItem value="BIKE">{t("drivers.vehicle.types.bike", "Bike")}</SelectItem>
                <SelectItem value="SCOOTER">{t("drivers.vehicle.types.scooter", "Scooter")}</SelectItem>
                <SelectItem value="VAN">{t("drivers.vehicle.types.van", "Van")}</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {renderError(errors.type as FieldError)}
      </div>

      <div className="space-y-2">
        <Label className={labelDir}>
          {t("drivers.vehicle.plateNumber", "Plate number")} {requiredMark}
        </Label>
        <Controller control={control} name="plateNumber" render={({ field }) => <Input placeholder="123-ABC" {...field} />} />
        {renderError(errors.plateNumber as FieldError)}
      </div>

      <div className="space-y-2">
        <Label className={labelDir}>
          {t("drivers.vehicle.color", "Color")} {requiredMark}
        </Label>
        <Controller control={control} name="color" render={({ field }) => <Input placeholder="Black" {...field} />} />
        {renderError(errors.color as FieldError)}
      </div>

      <div className="space-y-2">
        <Label className={labelDir}>
          {t("drivers.vehicle.licenseImage", "Car license image")} {requiredMark}
        </Label>
        <Controller
          control={control}
          name="licenseImageFile"
          render={({ field }) => (
            <div className="space-y-1">
              <Input
                type="file"
                accept={ALLOWED_IMAGE_TYPES.join(",")}
                name={field.name}
                onChange={(event) => onLicenseChange(event.target.files?.[0] || null)}
                ref={field.ref}
              />
              <p className="text-xs text-muted-foreground">
                {t("validation.imageType", "Use PNG, JPG, or WEBP (max {{size}}MB)", { size: maxImageMb })}
              </p>
              {renderPreview(field.value as File | null, licenseImageUrl, t("drivers.vehicle.licenseImage", "Car license image"))}
            </div>
          )}
        />
        {renderError((errors.licenseImageFile as FieldError) ?? (errors.licenseImageUrl as FieldError))}
      </div>
    </div>
  );
}
