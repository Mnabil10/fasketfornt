import React, { useEffect } from "react";
import { useForm, Controller, type Resolver, type FieldError } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import { Input } from "../../../ui/input";
import { Label } from "../../../ui/label";
import { Switch } from "../../../ui/switch";
import { Button } from "../../../ui/button";
import { VehicleForm } from "./VehicleForm";
import type { DeliveryDriver, UploadableImage } from "../../../../types/delivery";

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_IMAGE_MB = 5;

const imageSchema = z
  .union([
    z.instanceof(File),
    z.instanceof(Blob),
    z.object({ url: z.string().trim().min(1).optional() }),
    z.string().trim().min(1),
  ])
  .nullable();

const requiredImage = (message: string) =>
  imageSchema.refine((val) => {
    if (!val) return false;
    if (val instanceof File || val instanceof Blob) return true;
    if (typeof val === "string") return val.trim().length > 0;
    if (typeof val === "object" && "url" in val) return Boolean((val as any).url && (val as any).url.trim());
    return false;
  }, { message });

const driverSchema = z
  .object({
    fullName: z.string().trim().min(2, { message: "validation.required" }),
    phone: z
      .string()
      .trim()
      .min(1, { message: "validation.required" })
      .regex(/^(\+?\d{8,15})$/, { message: "validation.phone" }),
    nationalId: z.string().trim().min(10, { message: "validation.nationalId" }),
    nationalIdImage: requiredImage("drivers.errors.nationalIdImageRequired"),
    isActive: z.boolean(),
    type: z.enum(["CAR", "BIKE", "SCOOTER", "VAN"], { errorMap: () => ({ message: "drivers.errors.vehicleType" }) }),
    plateNumber: z.string().trim().min(3, { message: "drivers.errors.plateRequired" }),
    color: z.string().trim().min(1, { message: "validation.required" }),
    licenseImageFile: z.union([z.instanceof(File), z.instanceof(Blob)]).nullable().optional(),
    licenseImageUrl: z.string().trim().min(1).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.licenseImageFile && !(value.licenseImageUrl && value.licenseImageUrl.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["licenseImageFile"],
        message: "drivers.errors.licenseImageRequired",
      });
    }
  });

export type DriverFormValues = z.infer<typeof driverSchema>;

type DriverFormProps = {
  mode: "create" | "edit";
  initialData?: DeliveryDriver | null;
  onSubmit: (values: DriverFormValues) => Promise<void> | void;
  onCancel?: () => void;
  isSubmitting?: boolean;
};

function resolveImageValue(value: UploadableImage) {
  if (!value) return null;
  if (typeof value === "string" || value instanceof File || value instanceof Blob) return value;
  if (typeof value === "object" && "url" in value) return value;
  return null;
}

function resolveImageUrl(value: UploadableImage) {
  if (!value) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "object" && "url" in value) return (value as any).url?.trim() || null;
  return null;
}

export function DriverForm({ mode, initialData, onSubmit, onCancel, isSubmitting }: DriverFormProps) {
  const { t, i18n } = useTranslation();
  const form = useForm<DriverFormValues>({
    resolver: zodResolver(driverSchema) as Resolver<DriverFormValues>,
    defaultValues: {
      fullName: "",
      phone: "",
      nationalId: "",
      nationalIdImage: null,
      isActive: true,
      type: "CAR",
      plateNumber: "",
      color: "",
      licenseImageFile: null,
      licenseImageUrl: null,
    },
  });

  useEffect(() => {
    form.register("licenseImageUrl");
  }, [form]);

  useEffect(() => {
    if (!initialData) return;
    form.reset({
      fullName: initialData.fullName || "",
      phone: initialData.phone || "",
      nationalId: initialData.nationalId || "",
      nationalIdImage: resolveImageValue(initialData.nationalIdImage ?? null),
      isActive: initialData.isActive ?? true,
      type: initialData.vehicle?.type ?? "CAR",
      plateNumber: initialData.vehicle?.plateNumber || "",
      color: initialData.vehicle?.color || "",
      licenseImageFile: null,
      licenseImageUrl: resolveImageUrl(initialData.vehicle?.licenseImage ?? initialData.vehicle?.licenseImageUrl ?? null),
    });
  }, [initialData, form]);

  const submit = form.handleSubmit(async (values) => {
    await onSubmit(values);
  });

  const dirClass = i18n.language === "ar" ? "text-right" : "text-left";
  const requiredMark = <span className="text-rose-500">*</span>;

  const renderError = (error?: FieldError) => {
    if (!error?.message) return null;
    const sizeParams = error.message === "validation.imageSize" ? { size: MAX_IMAGE_MB } : undefined;
    const message = t(error.message as string, { defaultValue: error.message as string, ...(sizeParams || {}) });
    return <p className="text-sm text-red-500">{message}</p>;
  };

  const handleFileChange = (field: "nationalIdImage" | "licenseImageFile", file: File | null) => {
    if (!file) {
      form.setValue(field, null as any, { shouldValidate: true });
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      form.setError(field, { type: "validate", message: "validation.imageType" });
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      form.setError(field, { type: "validate", message: "validation.imageSize" });
      return;
    }
    form.clearErrors(field);
    form.setValue(field, file as any, { shouldValidate: true });
    if (field === "licenseImageFile") {
      form.setValue("licenseImageUrl", null as any, { shouldValidate: true });
    }
  };

  const renderFilePreview = (value: UploadableImage, label: string) => {
    if (!value) return null;
    if (typeof value === "string") {
      return (
        <a className="text-xs text-blue-600 underline" href={value} target="_blank" rel="noreferrer">
          {label}
        </a>
      );
    }
    if (value instanceof File) {
      return <p className="text-xs text-muted-foreground">{value.name}</p>;
    }
    if (typeof value === "object" && "url" in value && value.url) {
      return (
        <a className="text-xs text-blue-600 underline" href={value.url} target="_blank" rel="noreferrer">
          {label}
        </a>
      );
    }
    return null;
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            {mode === "create" ? t("drivers.createTitle", "Add Delivery Driver") : t("drivers.editTitle", "Edit Driver")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className={dirClass}>
                {t("drivers.fullName", "Full name")} {requiredMark}
              </Label>
              <Input placeholder={t("drivers.fullNamePlaceholder", "Driver name")} {...form.register("fullName")} />
              {renderError(form.formState.errors.fullName)}
            </div>
            <div className="space-y-2">
              <Label className={dirClass}>
                {t("drivers.phone", "Phone number")} {requiredMark}
              </Label>
              <Input placeholder="05XXXXXXXX" inputMode="tel" {...form.register("phone")} />
              <p className="text-xs text-muted-foreground">{t("validation.phone")}</p>
              {renderError(form.formState.errors.phone)}
            </div>
            <div className="space-y-2">
              <Label className={dirClass}>
                {t("drivers.nationalId", "National ID")} {requiredMark}
              </Label>
              <Input placeholder={t("drivers.nationalIdPlaceholder", "ID number")} {...form.register("nationalId")} />
              {renderError(form.formState.errors.nationalId)}
            </div>
            <div className="space-y-2">
              <Label className={dirClass}>
                {t("drivers.nationalIdImage", "National ID image")} {requiredMark}
              </Label>
              <Controller
                control={form.control}
                name="nationalIdImage"
                render={({ field }) => (
                  <div className="space-y-1">
                    <Input
                      type="file"
                      accept={ALLOWED_IMAGE_TYPES.join(",")}
                      name={field.name}
                      onChange={(event) => handleFileChange("nationalIdImage", event.target.files?.[0] || null)}
                      ref={field.ref}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("validation.imageType", "Use PNG, JPG, or WEBP (max {{size}}MB)", { size: MAX_IMAGE_MB })}
                    </p>
                    {renderFilePreview(field.value as UploadableImage, t("drivers.nationalIdImage", "National ID image"))}
                  </div>
                )}
              />
              {renderError(form.formState.errors.nationalIdImage as FieldError)}
            </div>
            <div className="flex items-center justify-between md:col-span-2 border rounded-lg p-3">
              <div>
                <Label className={dirClass}>{t("drivers.active", "Active")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("drivers.activeHint", "Active drivers will appear in assignment and orders")}
                </p>
              </div>
              <Switch checked={form.watch("isActive")} onCheckedChange={(checked) => form.setValue("isActive", checked)} />
            </div>
          </div>

          <div>
            <Label className={dirClass}>{t("drivers.vehicleTitle", "Vehicle details")}</Label>
            <VehicleForm
              control={form.control}
              errors={form.formState.errors}
              dirClass={dirClass}
              renderError={renderError}
              onLicenseChange={(file) => handleFileChange("licenseImageFile", file)}
              maxImageMb={MAX_IMAGE_MB}
            />
          </div>

          <div className="flex flex-wrap gap-3 justify-end">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                {t("common.cancel", "Cancel")}
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("common.saving", "Saving...") : t("common.save", "Save")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
