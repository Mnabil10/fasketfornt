import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Switch } from "../../ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Label } from "../../ui/label";
import { toast } from "sonner";
import { useSettingsAdmin, SETTINGS_QUERY_KEY } from "../../../hooks/api/useSettingsAdmin";
import {
  updateGeneral,
  updateDelivery,
  updatePayment,
  updateNotifications,
  updateSystem,
  type SettingsResponse,
} from "../../../services/settings.service";
import { getApiErrorMessage } from "../../../lib/errors";
import { EmptyState } from "../../admin/common/EmptyState";
import { ErrorState } from "../../admin/common/ErrorState";
import { Skeleton } from "../../ui/skeleton";

const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
type DayKey = (typeof days)[number];

const optionalEmail = z.union([z.string().email(), z.literal(""), z.undefined()]);
const optionalPhone = z.union([z.string().min(5), z.literal(""), z.undefined()]);

const daySchema = z.object({
  open: z.string().min(1),
  close: z.string().min(1),
  enabled: z.boolean(),
});

const generalSchema = z.object({
  storeName: z.string().min(2),
  storeDescription: z.string().optional(),
  contactEmail: optionalEmail,
  contactPhone: optionalPhone,
  storeAddress: z.string().optional(),
  businessHours: z.record(daySchema).optional(),
});

const deliveryZoneSchema = z.object({
  name: z.string().min(1),
  fee: z.coerce.number().min(0),
  enabled: z.boolean(),
});

const deliverySchema = z.object({
  deliveryFee: z.coerce.number().min(0),
  freeDeliveryMinimum: z.coerce.number().min(0),
  estimatedDeliveryTime: z.string().min(2),
  maxDeliveryRadius: z.coerce.number().min(0),
  deliveryZones: z.array(deliveryZoneSchema).default([]),
});

const numberOrUndefined = (schema: z.ZodTypeAny) =>
  z.preprocess((value) => {
    if (value === "" || value === null || typeof value === "undefined") return undefined;
    return value;
  }, schema);

const paymentSchema = z.object({
  cashOnDeliveryEnabled: z.boolean(),
  cashOnDeliveryMaxAmount: numberOrUndefined(z.coerce.number().min(0).optional()),
  creditCardsEnabled: z.boolean(),
  acceptedCards: z.string().optional(),
  paypalEnabled: z.boolean(),
  applePayEnabled: z.boolean(),
  googlePayEnabled: z.boolean(),
  stripeEnabled: z.boolean(),
  stripePublicKey: z.string().optional(),
  stripeSecretKey: z.string().optional(),
  stripeWebhookSecret: z.string().optional(),
});

const notificationsSchema = z.object({
  notifyEmail: z.boolean(),
  notifySms: z.boolean(),
  notifyPush: z.boolean(),
  marketingEnabled: z.boolean(),
  marketingFrequency: z.string().optional(),
  lowStockEnabled: z.boolean(),
  lowStockThreshold: numberOrUndefined(z.coerce.number().min(0).optional()),
  newOrdersEnabled: z.boolean(),
  systemUpdatesEnabled: z.boolean(),
});

const systemSchema = z.object({
  maintenanceMode: z.boolean(),
  allowRegistrations: z.boolean(),
  requireEmailVerification: z.boolean(),
  sessionTimeout: z.coerce.number().min(5),
  maxLoginAttempts: z.coerce.number().min(1),
  dataRetentionDays: z.coerce.number().min(1),
  backupFrequency: z.string().min(2),
  timezone: z.string().min(2),
  language: z.string().min(2),
  currency: z.string().min(2),
});

type GeneralFormValues = z.infer<typeof generalSchema>;
type DeliveryFormValues = z.infer<typeof deliverySchema>;
type DeliveryZoneFormValue = z.infer<typeof deliveryZoneSchema>;
type PaymentFormValues = z.infer<typeof paymentSchema>;
type NotificationsFormValues = z.infer<typeof notificationsSchema>;
type SystemFormValues = z.infer<typeof systemSchema>;

const defaultBusinessHours: Record<DayKey, z.infer<typeof daySchema>> = days.reduce(
  (acc, day) => {
    acc[day] = { open: "09:00", close: "18:00", enabled: true };
    return acc;
  },
  {} as Record<DayKey, z.infer<typeof daySchema>>
);

const defaultGeneralValues: GeneralFormValues = {
  storeName: "",
  storeDescription: "",
  contactEmail: "",
  contactPhone: "",
  storeAddress: "",
  businessHours: defaultBusinessHours,
};

const defaultDeliveryValues: DeliveryFormValues = {
  deliveryFee: 0,
  freeDeliveryMinimum: 0,
  estimatedDeliveryTime: "",
  maxDeliveryRadius: 0,
  deliveryZones: [],
};

const defaultPaymentValues: PaymentFormValues = {
  cashOnDeliveryEnabled: true,
  cashOnDeliveryMaxAmount: undefined,
  creditCardsEnabled: true,
  acceptedCards: "",
  paypalEnabled: false,
  applePayEnabled: false,
  googlePayEnabled: false,
  stripeEnabled: false,
  stripePublicKey: "",
  stripeSecretKey: "",
  stripeWebhookSecret: "",
};

const defaultNotificationsValues: NotificationsFormValues = {
  notifyEmail: true,
  notifySms: false,
  notifyPush: true,
  marketingEnabled: false,
  marketingFrequency: "",
  lowStockEnabled: true,
  lowStockThreshold: undefined,
  newOrdersEnabled: true,
  systemUpdatesEnabled: true,
};

const defaultSystemValues: SystemFormValues = {
  maintenanceMode: false,
  allowRegistrations: true,
  requireEmailVerification: true,
  sessionTimeout: 30,
  maxLoginAttempts: 5,
  dataRetentionDays: 365,
  backupFrequency: "daily",
  timezone: "Africa/Cairo",
  language: "ar",
  currency: "EGP",
};
function mergeBusinessHours(source?: SettingsResponse["general"]["businessHours"]) {
  const merged: Record<string, z.infer<typeof daySchema>> = { ...defaultBusinessHours };
  if (source) {
    for (const key of Object.keys(source)) {
      const day = key as DayKey;
      merged[day] = {
        open: source[key]?.open || merged[day]?.open || "09:00",
        close: source[key]?.close || merged[day]?.close || "18:00",
        enabled: typeof source[key]?.enabled === "boolean" ? !!source[key]?.enabled : true,
      };
    }
  }
  return merged;
}

function buildGeneralValues(source?: SettingsResponse["general"]): GeneralFormValues {
  return {
    storeName: source?.storeName || "",
    storeDescription: source?.storeDescription || "",
    contactEmail: source?.contactEmail || "",
    contactPhone: source?.contactPhone || "",
    storeAddress: source?.storeAddress || "",
    businessHours: mergeBusinessHours(source?.businessHours),
  };
}

function buildDeliveryValues(source?: SettingsResponse["delivery"]): DeliveryFormValues {
  return {
    deliveryFee: source?.deliveryFee ?? 0,
    freeDeliveryMinimum: source?.freeDeliveryMinimum ?? 0,
    estimatedDeliveryTime: source?.estimatedDeliveryTime || "",
    maxDeliveryRadius: source?.maxDeliveryRadius ?? 0,
    deliveryZones:
      source?.deliveryZones?.map((zone) => ({
        name: zone.name,
        fee: zone.fee,
        enabled: zone.enabled ?? true,
      })) || [],
  };
}

function buildPaymentValues(source?: SettingsResponse["payment"]): PaymentFormValues {
  return {
    cashOnDeliveryEnabled: !!source?.cashOnDelivery?.enabled,
    cashOnDeliveryMaxAmount: source?.cashOnDelivery?.maxAmount ?? undefined,
    creditCardsEnabled: !!source?.creditCards?.enabled,
    acceptedCards: source?.creditCards?.acceptedCards?.join(", ") || "",
    paypalEnabled: !!source?.digitalWallets?.paypal?.enabled,
    applePayEnabled: !!source?.digitalWallets?.applePay?.enabled,
    googlePayEnabled: !!source?.digitalWallets?.googlePay?.enabled,
    stripeEnabled: !!source?.stripe?.enabled,
    stripePublicKey: source?.stripe?.publicKey || "",
    stripeSecretKey: source?.stripe?.secretKey || "",
    stripeWebhookSecret: source?.stripe?.webhookSecret || "",
  };
}

function buildNotificationsValues(source?: SettingsResponse["notifications"]): NotificationsFormValues {
  return {
    notifyEmail: !!source?.orderNotifications?.email,
    notifySms: !!source?.orderNotifications?.sms,
    notifyPush: !!source?.orderNotifications?.push,
    marketingEnabled: !!source?.marketingEmails?.enabled,
    marketingFrequency: source?.marketingEmails?.frequency || "",
    lowStockEnabled: !!source?.adminAlerts?.lowStock?.enabled,
    lowStockThreshold: source?.adminAlerts?.lowStock?.threshold ?? undefined,
    newOrdersEnabled: !!source?.adminAlerts?.newOrders?.enabled,
    systemUpdatesEnabled: !!source?.adminAlerts?.systemUpdates?.enabled,
  };
}

function buildSystemValues(source?: SettingsResponse["system"]): SystemFormValues {
  return {
    maintenanceMode: !!source?.maintenanceMode,
    allowRegistrations: !!source?.allowRegistrations,
    requireEmailVerification: !!source?.requireEmailVerification,
    sessionTimeout: source?.sessionTimeout ?? 30,
    maxLoginAttempts: source?.maxLoginAttempts ?? 5,
    dataRetentionDays: source?.dataRetentionDays ?? 365,
    backupFrequency: source?.backupFrequency || "daily",
    timezone: source?.timezone || "Africa/Cairo",
    language: source?.language || "ar",
    currency: source?.currency || "EGP",
  };
}

function toGeneralPayload(values: GeneralFormValues): SettingsResponse["general"] {
  const businessHours: Record<string, z.infer<typeof daySchema>> = {};
  if (values.businessHours) {
    for (const day of Object.keys(values.businessHours)) {
      businessHours[day] = values.businessHours[day];
    }
  }
  return {
    storeName: values.storeName,
    storeDescription: values.storeDescription || "",
    contactEmail: values.contactEmail || "",
    contactPhone: values.contactPhone || "",
    storeAddress: values.storeAddress || "",
    businessHours,
  };
}

function toDeliveryPayload(values: DeliveryFormValues): SettingsResponse["delivery"] {
  return {
    deliveryFee: values.deliveryFee,
    freeDeliveryMinimum: values.freeDeliveryMinimum,
    estimatedDeliveryTime: values.estimatedDeliveryTime,
    maxDeliveryRadius: values.maxDeliveryRadius,
    deliveryZones: values.deliveryZones?.map((zone) => ({
      name: zone.name,
      fee: zone.fee,
      enabled: zone.enabled,
    })) || [],
  };
}

function toPaymentPayload(values: PaymentFormValues): SettingsResponse["payment"] {
  return {
    cashOnDelivery: {
      enabled: values.cashOnDeliveryEnabled,
      maxAmount: values.cashOnDeliveryMaxAmount,
    },
    creditCards: {
      enabled: values.creditCardsEnabled,
      acceptedCards: values.acceptedCards
        ? values.acceptedCards
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean)
        : [],
    },
    digitalWallets: {
      paypal: { enabled: values.paypalEnabled },
      applePay: { enabled: values.applePayEnabled },
      googlePay: { enabled: values.googlePayEnabled },
    },
    stripe: {
      enabled: values.stripeEnabled,
      publicKey: values.stripePublicKey || undefined,
      secretKey: values.stripeSecretKey || undefined,
      webhookSecret: values.stripeWebhookSecret || undefined,
    },
  };
}

function toNotificationsPayload(values: NotificationsFormValues): SettingsResponse["notifications"] {
  return {
    orderNotifications: {
      email: values.notifyEmail,
      sms: values.notifySms,
      push: values.notifyPush,
    },
    marketingEmails: {
      enabled: values.marketingEnabled,
      frequency: values.marketingFrequency || undefined,
    },
    adminAlerts: {
      lowStock: { enabled: values.lowStockEnabled, threshold: values.lowStockThreshold },
      newOrders: { enabled: values.newOrdersEnabled },
      systemUpdates: { enabled: values.systemUpdatesEnabled },
    },
  };
}

function toSystemPayload(values: SystemFormValues): SettingsResponse["system"] {
  return { ...values };
}

type SettingsTab = "general" | "delivery" | "payment" | "notifications" | "system";
export function SettingsManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: settings, isLoading, isError, refetch } = useSettingsAdmin();
  const [tab, setTab] = useState<SettingsTab>("general");

  const generalForm = useForm<GeneralFormValues>({
    resolver: zodResolver(generalSchema),
    defaultValues: defaultGeneralValues,
  });
  const deliveryForm = useForm<DeliveryFormValues>({
    resolver: zodResolver(deliverySchema),
    defaultValues: defaultDeliveryValues,
  });
  const paymentForm = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: defaultPaymentValues,
  });
  const notificationsForm = useForm<NotificationsFormValues>({
    resolver: zodResolver(notificationsSchema),
    defaultValues: defaultNotificationsValues,
  });
  const systemForm = useForm<SystemFormValues>({
    resolver: zodResolver(systemSchema),
    defaultValues: defaultSystemValues,
  });

  const {
    fields: zoneFields,
    append: appendZone,
    remove: removeZone,
  } = useFieldArray({
    control: deliveryForm.control,
    name: "deliveryZones",
  });

  useEffect(() => {
    if (!settings) return;
    generalForm.reset(buildGeneralValues(settings.general));
    deliveryForm.reset(buildDeliveryValues(settings.delivery));
    paymentForm.reset(buildPaymentValues(settings.payment));
    notificationsForm.reset(buildNotificationsValues(settings.notifications));
    systemForm.reset(buildSystemValues(settings.system));
  }, [settings, generalForm, deliveryForm, paymentForm, notificationsForm, systemForm]);

  const onSuccess = (message: string) => {
    toast.success(message);
    queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
  };

  const handleError = (error: unknown) => {
    toast.error(getApiErrorMessage(error, t("settings.saveError") || "Unable to save settings"));
  };

  const generalMutation = useMutation({
    mutationFn: (values: GeneralFormValues) => updateGeneral(toGeneralPayload(values)),
    onSuccess: () => onSuccess(t("settings.generalSaved") || "General settings saved"),
    onError: handleError,
  });

  const deliveryMutation = useMutation({
    mutationFn: (values: DeliveryFormValues) => updateDelivery(toDeliveryPayload(values)),
    onSuccess: () => onSuccess(t("settings.deliverySaved") || "Delivery settings saved"),
    onError: handleError,
  });

  const paymentMutation = useMutation({
    mutationFn: (values: PaymentFormValues) => updatePayment(toPaymentPayload(values)),
    onSuccess: () => onSuccess(t("settings.paymentSaved") || "Payment settings saved"),
    onError: handleError,
  });

  const notificationsMutation = useMutation({
    mutationFn: (values: NotificationsFormValues) => updateNotifications(toNotificationsPayload(values)),
    onSuccess: () => onSuccess(t("settings.notificationsSaved") || "Notifications saved"),
    onError: handleError,
  });

  const systemMutation = useMutation({
    mutationFn: (values: SystemFormValues) => updateSystem(toSystemPayload(values)),
    onSuccess: () => onSuccess(t("settings.systemSaved") || "System settings saved"),
    onError: handleError,
  });

  if (isLoading) {
    return <SettingsSkeleton />;
  }

  if (isError) {
    return (
      <div className="p-6">
        <ErrorState message={t("settings.loadError") || "Failed to load settings"} onRetry={refetch} />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6">
        <EmptyState
          title={t("settings.emptyTitle") || "No settings available"}
          description={t("settings.emptyDescription") || "Configure the store to get started."}
          action={<Button onClick={() => refetch()}>{t("app.actions.retry") || "Retry"}</Button>}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">{t("settings.title") || "Settings"}</h1>
        <p className="text-muted-foreground">
          {t("settings.subtitle") || "Manage every part of the admin experience"}
        </p>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as SettingsTab)} className="space-y-6">
        <TabsList className="w-full grid grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="general">{t("settings.general")}</TabsTrigger>
          <TabsTrigger value="delivery">{t("settings.delivery")}</TabsTrigger>
          <TabsTrigger value="payment">{t("settings.payment")}</TabsTrigger>
          <TabsTrigger value="notifications">{t("settings.notifications")}</TabsTrigger>
          <TabsTrigger value="system">{t("settings.system")}</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.general")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                className="space-y-6"
                onSubmit={generalForm.handleSubmit((values) => generalMutation.mutate(values))}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="storeName">{t("settings.generalFields.storeName")}</Label>
                    <Input id="storeName" {...generalForm.register("storeName")} />
                    {generalForm.formState.errors.storeName && (
                      <p className="text-sm text-rose-500">{generalForm.formState.errors.storeName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">{t("settings.generalFields.contactEmail")}</Label>
                    <Input id="contactEmail" type="email" {...generalForm.register("contactEmail")} />
                    {generalForm.formState.errors.contactEmail && (
                      <p className="text-sm text-rose-500">{generalForm.formState.errors.contactEmail.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="storeDescription">{t("settings.generalFields.storeDescription")}</Label>
                  <Textarea id="storeDescription" rows={3} {...generalForm.register("storeDescription")} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">{t("settings.generalFields.contactPhone")}</Label>
                    <Input id="contactPhone" {...generalForm.register("contactPhone")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storeAddress">{t("settings.generalFields.storeAddress")}</Label>
                    <Input id="storeAddress" {...generalForm.register("storeAddress")} />
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold">{t("settings.generalFields.businessHours")}</h3>
                  {days.map((day) => (
                    <div key={day} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <Controller
                          control={generalForm.control}
                          name={`businessHours.${day}.enabled`}
                          render={({ field }) => (
                            <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
                          )}
                        />
                        <span className="capitalize">{t(`weekdays.${day}`, day)}</span>
                      </div>
                      {generalForm.watch(`businessHours.${day}.enabled`) !== false && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            className="w-28"
                            {...generalForm.register(`businessHours.${day}.open`)}
                          />
                          <span>-</span>
                          <Input
                            type="time"
                            className="w-28"
                            {...generalForm.register(`businessHours.${day}.close`)}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button type="submit" disabled={generalMutation.isPending}>
                    {generalMutation.isPending ? t("app.saving") || "Saving..." : t("app.actions.save")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => generalForm.reset(buildGeneralValues(settings.general))}
                  >
                    {t("app.actions.reset")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="delivery">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.delivery")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-6"
                onSubmit={deliveryForm.handleSubmit((values) => deliveryMutation.mutate(values))}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="deliveryFee">{t("settings.deliveryFields.deliveryFee")}</Label>
                    <Input id="deliveryFee" type="number" step="0.01" {...deliveryForm.register("deliveryFee", { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="freeDeliveryMinimum">{t("settings.deliveryFields.freeDeliveryMinimum")}</Label>
                    <Input id="freeDeliveryMinimum" type="number" step="0.01" {...deliveryForm.register("freeDeliveryMinimum", { valueAsNumber: true })} />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="estimatedDeliveryTime">{t("settings.deliveryFields.estimatedDeliveryTime")}</Label>
                    <Input id="estimatedDeliveryTime" {...deliveryForm.register("estimatedDeliveryTime")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxDeliveryRadius">{t("settings.deliveryFields.maxDeliveryRadius")}</Label>
                    <Input id="maxDeliveryRadius" type="number" step="0.1" {...deliveryForm.register("maxDeliveryRadius", { valueAsNumber: true })} />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{t("settings.deliveryFields.deliveryZones")}</h3>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => appendZone({ name: "", fee: 0, enabled: true } as DeliveryZoneFormValue)}
                    >
                      {t("app.actions.add")}
                    </Button>
                  </div>
                  {zoneFields.length === 0 && (
                    <p className="text-sm text-muted-foreground">{t("settings.deliveryFields.noZones")}</p>
                  )}
                  <div className="space-y-3">
                    {zoneFields.map((field, index) => (
                      <div key={field.id} className="grid gap-3 border rounded-lg p-3 md:grid-cols-4">
                        <Input
                          placeholder={t("settings.deliveryFields.zoneName") || "Zone name"}
                          {...deliveryForm.register(`deliveryZones.${index}.name` as const)}
                        />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder={t("settings.deliveryFields.zoneFee") || "Fee"}
                          {...deliveryForm.register(`deliveryZones.${index}.fee` as const, {
                            valueAsNumber: true,
                          })}
                        />
                        <div className="flex items-center gap-2">
                          <Controller
                            control={deliveryForm.control}
                            name={`deliveryZones.${index}.enabled` as const}
                            render={({ field }) => (
                              <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
                            )}
                          />
                          <span>{t("settings.deliveryFields.zoneEnabled") || "Active"}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          className="justify-start text-rose-500"
                          onClick={() => removeZone(index)}
                        >
                          {t("app.actions.remove")}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button type="submit" disabled={deliveryMutation.isPending}>
                    {deliveryMutation.isPending ? t("app.saving") || "Saving..." : t("app.actions.save")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => deliveryForm.reset(buildDeliveryValues(settings.delivery))}
                  >
                    {t("app.actions.reset")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.payment")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-6"
                onSubmit={paymentForm.handleSubmit((values) => paymentMutation.mutate(values))}
              >
                <section className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 border rounded-lg p-3">
                    <Label>{t("settings.paymentFields.cashOnDelivery")}</Label>
                    <Controller
                      control={paymentForm.control}
                      name="cashOnDeliveryEnabled"
                      render={({ field }) => (
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder={t("settings.paymentFields.maxAmount") || "Max amount"}
                      {...paymentForm.register("cashOnDeliveryMaxAmount", { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2 border rounded-lg p-3">
                    <Label>{t("settings.paymentFields.creditCards")}</Label>
                    <Controller
                      control={paymentForm.control}
                      name="creditCardsEnabled"
                      render={({ field }) => (
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                    <Input
                      placeholder={t("settings.paymentFields.acceptedCards") || "Visa, Mastercard"}
                      {...paymentForm.register("acceptedCards")}
                    />
                  </div>
                </section>

                <section className="grid gap-4 md:grid-cols-3">
                  {(["paypalEnabled", "applePayEnabled", "googlePayEnabled"] as const).map((wallet) => (
                    <div key={wallet} className="flex items-center justify-between border rounded-lg p-3">
                      <span className="font-medium">{t(`settings.paymentFields.${wallet}`, wallet)}</span>
                      <Controller
                        control={paymentForm.control}
                        name={wallet}
                        render={({ field }) => (
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        )}
                      />
                    </div>
                  ))}
                </section>

                <section className="space-y-3 border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <Label>{t("settings.paymentFields.stripe")}</Label>
                    <Controller
                      control={paymentForm.control}
                      name="stripeEnabled"
                      render={({ field }) => (
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                  </div>
                  <Input placeholder="pk_live_..." {...paymentForm.register("stripePublicKey")} />
                  <Input placeholder="sk_live_..." {...paymentForm.register("stripeSecretKey")} />
                  <Input placeholder="whsec_..." {...paymentForm.register("stripeWebhookSecret")} />
                </section>

                <div className="flex gap-3">
                  <Button type="submit" disabled={paymentMutation.isPending}>
                    {paymentMutation.isPending ? t("app.saving") || "Saving..." : t("app.actions.save")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => paymentForm.reset(buildPaymentValues(settings.payment))}
                  >
                    {t("app.actions.reset")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.notifications")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-6"
                onSubmit={notificationsForm.handleSubmit((values) => notificationsMutation.mutate(values))}
              >
                <section className="grid gap-3 md:grid-cols-3">
                  {([
                    ["notifyEmail", "settings.notificationsFields.email"],
                    ["notifySms", "settings.notificationsFields.sms"],
                    ["notifyPush", "settings.notificationsFields.push"],
                  ] as const).map(([name, label]) => (
                    <div key={name} className="flex items-center justify-between border rounded-lg p-3">
                      <span>{t(label)}</span>
                      <Controller
                        control={notificationsForm.control}
                        name={name}
                        render={({ field }) => (
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        )}
                      />
                    </div>
                  ))}
                </section>

                <section className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span>{t("settings.notificationsFields.marketingEmails")}</span>
                      <Controller
                        control={notificationsForm.control}
                        name="marketingEnabled"
                        render={({ field }) => (
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        )}
                      />
                    </div>
                    <Input
                      placeholder={t("settings.notificationsFields.frequency") || "weekly"}
                      {...notificationsForm.register("marketingFrequency")}
                    />
                  </div>
                  <div className="space-y-2 border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span>{t("settings.notificationsFields.lowStock")}</span>
                      <Controller
                        control={notificationsForm.control}
                        name="lowStockEnabled"
                        render={({ field }) => (
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        )}
                      />
                    </div>
                    <Input
                      type="number"
                      placeholder={t("settings.notificationsFields.threshold") || "5"}
                      {...notificationsForm.register("lowStockThreshold", { valueAsNumber: true })}
                    />
                  </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between border rounded-lg p-3">
                    <span>{t("settings.notificationsFields.newOrders")}</span>
                    <Controller
                      control={notificationsForm.control}
                      name="newOrdersEnabled"
                      render={({ field }) => (
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                  </div>
                  <div className="flex items-center justify-between border rounded-lg p-3">
                    <span>{t("settings.notificationsFields.systemUpdates")}</span>
                    <Controller
                      control={notificationsForm.control}
                      name="systemUpdatesEnabled"
                      render={({ field }) => (
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                  </div>
                </section>

                <div className="flex gap-3">
                  <Button type="submit" disabled={notificationsMutation.isPending}>
                    {notificationsMutation.isPending ? t("app.saving") || "Saving..." : t("app.actions.save")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => notificationsForm.reset(buildNotificationsValues(settings.notifications))}
                  >
                    {t("app.actions.reset")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.system")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-6"
                onSubmit={systemForm.handleSubmit((values) => systemMutation.mutate(values))}
              >
                <section className="grid gap-4 md:grid-cols-2">
                  {([
                    ["maintenanceMode", "settings.systemFields.maintenanceMode"],
                    ["allowRegistrations", "settings.systemFields.allowRegistrations"],
                    ["requireEmailVerification", "settings.systemFields.requireEmailVerification"],
                  ] as const).map(([name, label]) => (
                    <div key={name} className="flex items-center justify-between border rounded-lg p-3">
                      <span>{t(label)}</span>
                      <Controller
                        control={systemForm.control}
                        name={name}
                        render={({ field }) => (
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        )}
                      />
                    </div>
                  ))}
                </section>

                <section className="grid gap-4 md:grid-cols-3">
                  <Input
                    type="number"
                    placeholder={t("settings.systemFields.sessionTimeout") || "30"}
                    {...systemForm.register("sessionTimeout", { valueAsNumber: true })}
                  />
                  <Input
                    type="number"
                    placeholder={t("settings.systemFields.maxLoginAttempts") || "5"}
                    {...systemForm.register("maxLoginAttempts", { valueAsNumber: true })}
                  />
                  <Input
                    type="number"
                    placeholder={t("settings.systemFields.dataRetentionDays") || "365"}
                    {...systemForm.register("dataRetentionDays", { valueAsNumber: true })}
                  />
                </section>

                <section className="grid gap-4 md:grid-cols-3">
                  <Input
                    placeholder={t("settings.systemFields.backupFrequency") || "daily"}
                    {...systemForm.register("backupFrequency")}
                  />
                  <Input
                    placeholder={t("settings.systemFields.timezone") || "Africa/Cairo"}
                    {...systemForm.register("timezone")}
                  />
                  <Input
                    placeholder={t("settings.systemFields.language") || "ar"}
                    {...systemForm.register("language")}
                  />
                  <Input
                    placeholder={t("settings.systemFields.currency") || "EGP"}
                    {...systemForm.register("currency")}
                  />
                </section>

                <div className="flex gap-3">
                  <Button type="submit" disabled={systemMutation.isPending}>
                    {systemMutation.isPending ? t("app.saving") || "Saving..." : t("app.actions.save")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => systemForm.reset(buildSystemValues(settings.system))}
                  >
                    {t("app.actions.reset")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
function SettingsSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      {[...new Array(3)].map((_, index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[...new Array(3)].map((__, idx) => (
              <Skeleton key={idx} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
