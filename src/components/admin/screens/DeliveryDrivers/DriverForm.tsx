import React, { useEffect } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import { Input } from "../../../ui/input";
import { Label } from "../../../ui/label";
import { Switch } from "../../../ui/switch";
import { Button } from "../../../ui/button";
import { VehicleForm } from "./VehicleForm";
import type { DeliveryDriver } from "../../../../types/delivery";

const vehicleSchema = z.object({
  type: z.enum(["CAR", "BIKE", "SCOOTER"]).optional(),
  plateNumber: z.string().optional(),
  color: z.string().optional(),
  licenseImage: z.string().optional(),
});

const driverSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(5),
  nationalId: z.string().optional(),
  nationalIdImage: z.string().nullable().optional(),
  isActive: z.boolean(),
  vehicle: vehicleSchema.optional(),
});

export type DriverFormValues = z.infer<typeof driverSchema>;

type DriverFormProps = {
  mode: "create" | "edit";
  initialData?: DeliveryDriver | null;
  onSubmit: (values: DriverFormValues) => Promise<void> | void;
  onCancel?: () => void;
  isSubmitting?: boolean;
};

export function DriverForm({ mode, initialData, onSubmit, onCancel, isSubmitting }: DriverFormProps) {
  const { t, i18n } = useTranslation();
  const form = useForm<DriverFormValues>({
    resolver: zodResolver(driverSchema) as Resolver<DriverFormValues>,
    defaultValues: {
      fullName: "",
      phone: "",
      nationalId: "",
      nationalIdImage: "",
      isActive: true,
      vehicle: {
        type: "CAR",
        plateNumber: "",
        color: "",
        licenseImage: "",
      },
    },
  });

  useEffect(() => {
    if (!initialData) return;
    form.reset({
      fullName: initialData.fullName || "",
      phone: initialData.phone || "",
      nationalId: initialData.nationalId || "",
      nationalIdImage:
        initialData.nationalIdImage && typeof initialData.nationalIdImage === "object"
          ? initialData.nationalIdImage.url || ""
          : initialData.nationalIdImage ?? "",
      isActive: initialData.isActive ?? true,
      vehicle: initialData.vehicle
        ? {
            type: initialData.vehicle.type,
            plateNumber: initialData.vehicle.plateNumber || "",
            color: initialData.vehicle.color || "",
            licenseImage: initialData.vehicle.licenseImage || "",
          }
        : {
            type: "CAR",
            plateNumber: "",
            color: "",
            licenseImage: "",
          },
    });
  }, [initialData, form]);

  const submit = form.handleSubmit(async (values) => {
    await onSubmit(values);
  });

  const dirClass = i18n.language === "ar" ? "text-right" : "text-left";

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
              <Label className={dirClass}>{t("drivers.fullName", "Full name")}</Label>
              <Input placeholder={t("drivers.fullNamePlaceholder", "Driver name")} {...form.register("fullName")} />
              {form.formState.errors.fullName && (
                <p className="text-sm text-red-500">{form.formState.errors.fullName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className={dirClass}>{t("drivers.phone", "Phone number")}</Label>
              <Input placeholder="+971" {...form.register("phone")} />
              {form.formState.errors.phone && (
                <p className="text-sm text-red-500">{form.formState.errors.phone.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className={dirClass}>{t("drivers.nationalId", "National ID")}</Label>
              <Input placeholder={t("drivers.nationalIdPlaceholder", "ID number")} {...form.register("nationalId")} />
            </div>
            <div className="space-y-2">
              <Label className={dirClass}>{t("drivers.nationalIdImage", "National ID image URL")}</Label>
              <Input placeholder="https://" {...form.register("nationalIdImage")} />
            </div>
            <div className="flex items-center justify-between md:col-span-2">
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
            <VehicleForm control={form.control} errors={form.formState.errors} />
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
