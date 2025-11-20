import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import { Switch } from "../../ui/switch";
import { toast } from "sonner";
import { useSettingsAdmin } from "../../../hooks/api/useSettingsAdmin";
import { useUpdateSettingsSection } from "../../../hooks/api/useUpdateSettingsSection";
import { getAdminErrorMessage } from "../../../lib/errors";
import { AdminTableSkeleton } from "../common/AdminTableSkeleton";
import { ErrorState } from "../common/ErrorState";
import { EmptyState } from "../common/EmptyState";
import type { DeliverySettings, GeneralSettings, PaymentSettings, NotificationsSettings, SystemSettings } from "../../../types/settings";
import { useDeliveryZones } from "../../../hooks/api/useDeliveryZones";
import { Badge } from "../../ui/badge";
import { useNavigate } from "react-router-dom";

const generalSchema = z.object({
  storeName: z.string().min(2),
  storeDescription: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  storeAddress: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
  currency: z.string().optional(),
});

const deliveryOverrideSchema = z.object({
  zoneId: z.string(),
  deliveryFeeCents: z.coerce.number().min(0),
  freeDeliveryThresholdCents: z.coerce.number().min(0).nullable().optional(),
});

const deliverySchema = z.object({
  deliveryEnabled: z.boolean(),
  defaultDeliveryFeeCents: z.coerce.number().min(0),
  freeDeliveryThresholdCents: z.coerce.number().min(0),
  perZoneOverrides: z.array(deliveryOverrideSchema).default([]),
});

const paymentSchema = z.object({
  cashOnDeliveryEnabled: z.boolean(),
  cashOnDeliveryMaxAmount: z.coerce.number().min(0).nullable().optional(),
  stripeEnabled: z.boolean(),
  stripePublicKey: z.string().optional(),
  stripeSecretKey: z.string().optional(),
});

const notificationsSchema = z.object({
  notifyEmail: z.boolean(),
  notifySms: z.boolean(),
  notifyPush: z.boolean(),
  marketingEnabled: z.boolean(),
});

const systemSchema = z.object({
  maintenanceMode: z.boolean(),
  allowRegistrations: z.boolean(),
  requireEmailVerification: z.boolean(),
  sessionTimeout: z.coerce.number().min(5),
});

type GeneralFormValues = z.infer<typeof generalSchema>;
type DeliveryFormValues = z.infer<typeof deliverySchema>;
type PaymentFormValues = z.infer<typeof paymentSchema>;
type NotificationsFormValues = z.infer<typeof notificationsSchema>;
type SystemFormValues = z.infer<typeof systemSchema>;

type SettingsManagementProps = {
  initialSection?: string;
};

export function SettingsManagement({ initialSection }: SettingsManagementProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const settingsQuery = useSettingsAdmin();
  const zonesQuery = useDeliveryZones({ page: 1, pageSize: 100, isActive: true });
  const generalMutation = useUpdateSettingsSection("general");
  const deliveryMutation = useUpdateSettingsSection("delivery");
  const paymentsMutation = useUpdateSettingsSection("payments");
  const notificationsMutation = useUpdateSettingsSection("notifications");
  const systemMutation = useUpdateSettingsSection("system");

  const [activeTab, setActiveTab] = React.useState(() => {
    if (initialSection === "delivery") return "delivery";
    if (initialSection === "delivery-zones") return "delivery";
    return initialSection || "general";
  });

  const generalForm = useForm<GeneralFormValues>({
    resolver: zodResolver(generalSchema) as Resolver<GeneralFormValues>,
    defaultValues: {
      storeName: "",
      storeDescription: "",
      contactEmail: "",
      contactPhone: "",
      storeAddress: "",
      timezone: "",
      language: "",
      currency: "",
    },
  });

  const deliveryForm = useForm<DeliveryFormValues>({
    resolver: zodResolver(deliverySchema) as Resolver<DeliveryFormValues>,
    defaultValues: {
      deliveryEnabled: true,
      defaultDeliveryFeeCents: 0,
      freeDeliveryThresholdCents: 0,
      perZoneOverrides: [],
    },
  });

  const paymentsForm = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema) as Resolver<PaymentFormValues>,
    defaultValues: {
      cashOnDeliveryEnabled: true,
      cashOnDeliveryMaxAmount: null,
      stripeEnabled: false,
      stripePublicKey: "",
      stripeSecretKey: "",
    },
  });

  const notificationsForm = useForm<NotificationsFormValues>({
    resolver: zodResolver(notificationsSchema) as Resolver<NotificationsFormValues>,
    defaultValues: {
      notifyEmail: true,
      notifySms: false,
      notifyPush: false,
      marketingEnabled: false,
    },
  });

  const systemForm = useForm<SystemFormValues>({
    resolver: zodResolver(systemSchema) as Resolver<SystemFormValues>,
    defaultValues: {
      maintenanceMode: false,
      allowRegistrations: true,
      requireEmailVerification: true,
      sessionTimeout: 30,
    },
  });

  const { fields: zoneOverrideFields, replace: replaceOverrides } = useFieldArray({
    control: deliveryForm.control,
    name: "perZoneOverrides",
  });

  useEffect(() => {
    if (settingsQuery.data?.general) {
      const g = settingsQuery.data.general as GeneralSettings;
      generalForm.reset({
        storeName: g.storeName || "",
        storeDescription: g.storeDescription || "",
        contactEmail: g.contactEmail || "",
        contactPhone: g.contactPhone || "",
        storeAddress: g.storeAddress || "",
        timezone: g.timezone || "",
        language: g.language || "",
        currency: g.currency || "",
      });
    }
  }, [settingsQuery.data?.general, generalForm]);

  useEffect(() => {
    const d = settingsQuery.data?.delivery as DeliverySettings | undefined;
    if (!d) return;

    const overridesMap = new Map<string, { deliveryFeeCents: number; freeDeliveryThresholdCents?: number | null }>(
      (d.perZoneOverrides || []).map((o) => [o.zoneId, { deliveryFeeCents: o.deliveryFeeCents, freeDeliveryThresholdCents: o.freeDeliveryThresholdCents }])
    );

    const zoneOverrides = (zonesQuery.data?.items || []).map((zone) => {
      const override = overridesMap.get(zone.id);
      return {
        zoneId: zone.id,
        deliveryFeeCents: override?.deliveryFeeCents ?? d.defaultDeliveryFeeCents ?? 0,
        freeDeliveryThresholdCents: override?.freeDeliveryThresholdCents ?? d.freeDeliveryThresholdCents ?? 0,
      };
    });

    replaceOverrides(zoneOverrides);

    deliveryForm.reset({
      deliveryEnabled: d.deliveryEnabled ?? true,
      defaultDeliveryFeeCents: d.defaultDeliveryFeeCents ?? 0,
      freeDeliveryThresholdCents: d.freeDeliveryThresholdCents ?? 0,
      perZoneOverrides: zoneOverrides,
    });
  }, [settingsQuery.data?.delivery, zonesQuery.data?.items, deliveryForm, replaceOverrides]);

  useEffect(() => {
    const p = settingsQuery.data?.payments as PaymentSettings | undefined;
    if (!p) return;
    paymentsForm.reset({
      cashOnDeliveryEnabled: p.cashOnDelivery?.enabled ?? true,
      cashOnDeliveryMaxAmount: p.cashOnDelivery?.maxAmount ?? null,
      stripeEnabled: p.stripe?.enabled ?? false,
      stripePublicKey: p.stripe?.publicKey ?? "",
      stripeSecretKey: p.stripe?.secretKey ?? "",
    });
  }, [settingsQuery.data?.payments, paymentsForm]);

  useEffect(() => {
    const n = settingsQuery.data?.notifications as NotificationsSettings | undefined;
    if (!n) return;
    notificationsForm.reset({
      notifyEmail: n.orderNotifications?.email ?? true,
      notifySms: n.orderNotifications?.sms ?? false,
      notifyPush: n.orderNotifications?.push ?? false,
      marketingEnabled: n.marketingEmails?.enabled ?? false,
    });
  }, [settingsQuery.data?.notifications, notificationsForm]);

  useEffect(() => {
    const s = settingsQuery.data?.system as SystemSettings | undefined;
    if (!s) return;
    systemForm.reset({
      maintenanceMode: s.maintenanceMode ?? false,
      allowRegistrations: s.allowRegistrations ?? true,
      requireEmailVerification: s.requireEmailVerification ?? true,
      sessionTimeout: s.sessionTimeout ?? 30,
    });
  }, [settingsQuery.data?.system, systemForm]);

  const handleGeneralSave = generalForm.handleSubmit(async (values) => {
    try {
      await generalMutation.mutateAsync(values);
      toast.success(t("settings.saved", "Settings updated"));
    } catch (error) {
      toast.error(getAdminErrorMessage(error, t));
    }
  });

  const handleDeliverySave = deliveryForm.handleSubmit(async (values) => {
    const payload: DeliverySettings = {
      deliveryEnabled: values.deliveryEnabled,
      defaultDeliveryFeeCents: Math.round(values.defaultDeliveryFeeCents),
      freeDeliveryThresholdCents: Math.round(values.freeDeliveryThresholdCents),
      perZoneOverrides: values.perZoneOverrides?.map((z) => ({
        zoneId: z.zoneId,
        deliveryFeeCents: Math.round(z.deliveryFeeCents),
        freeDeliveryThresholdCents: z.freeDeliveryThresholdCents != null ? Math.round(z.freeDeliveryThresholdCents) : undefined,
      })),
    };
    try {
      await deliveryMutation.mutateAsync(payload);
      toast.success(t("settings.saved", "Settings updated"));
    } catch (error) {
      toast.error(getAdminErrorMessage(error, t));
    }
  });

  const handlePaymentsSave = paymentsForm.handleSubmit(async (values) => {
    const payload: PaymentSettings = {
      cashOnDelivery: { enabled: values.cashOnDeliveryEnabled, maxAmount: values.cashOnDeliveryMaxAmount ?? undefined },
      stripe: {
        enabled: values.stripeEnabled,
        publicKey: values.stripePublicKey,
        secretKey: values.stripeSecretKey,
      },
    };
    try {
      await paymentsMutation.mutateAsync(payload);
      toast.success(t("settings.saved", "Settings updated"));
    } catch (error) {
      toast.error(getAdminErrorMessage(error, t));
    }
  });

  const handleNotificationsSave = notificationsForm.handleSubmit(async (values) => {
    const payload: NotificationsSettings = {
      orderNotifications: { email: values.notifyEmail, sms: values.notifySms, push: values.notifyPush },
      marketingEmails: { enabled: values.marketingEnabled },
    };
    try {
      await notificationsMutation.mutateAsync(payload);
      toast.success(t("settings.saved", "Settings updated"));
    } catch (error) {
      toast.error(getAdminErrorMessage(error, t));
    }
  });

  const handleSystemSave = systemForm.handleSubmit(async (values) => {
    const payload: SystemSettings = {
      maintenanceMode: values.maintenanceMode,
      allowRegistrations: values.allowRegistrations,
      requireEmailVerification: values.requireEmailVerification,
      sessionTimeout: values.sessionTimeout,
    };
    try {
      await systemMutation.mutateAsync(payload);
      toast.success(t("settings.saved", "Settings updated"));
    } catch (error) {
      toast.error(getAdminErrorMessage(error, t));
    }
  });

  if (settingsQuery.isLoading) {
    return (
      <div className="p-6">
        <AdminTableSkeleton rows={4} columns={2} />
      </div>
    );
  }

  if (settingsQuery.isError) {
    return (
      <div className="p-6">
        <ErrorState message={t("settings.loadError", "Unable to load settings")} onRetry={() => settingsQuery.refetch()} />
      </div>
    );
  }

  if (!settingsQuery.data) {
    return (
      <div className="p-6">
        <EmptyState title={t("settings.empty", "No settings")} description={t("settings.emptyDesc", "Unable to load settings")} />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("settings.title", "Settings")}</h1>
          <p className="text-muted-foreground">{t("settings.subtitle", "Control how your store behaves")}</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/settings/delivery-zones")}>
          {t("zones.manage", "Manage delivery zones")}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="general">{t("settings.general", "General")}</TabsTrigger>
          <TabsTrigger value="delivery">{t("settings.delivery", "Delivery")}</TabsTrigger>
          <TabsTrigger value="payments">{t("settings.payments", "Payments")}</TabsTrigger>
          <TabsTrigger value="notifications">{t("settings.notifications", "Notifications")}</TabsTrigger>
          <TabsTrigger value="system">{t("settings.system", "System")}</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.general", "General")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleGeneralSave}>
                <div className="space-y-2">
                  <Label>{t("settings.storeName", "Store name")}</Label>
                  <Input {...generalForm.register("storeName")} />
                </div>
                <div className="space-y-2">
                  <Label>{t("settings.storeDescription", "Description")}</Label>
                  <Input {...generalForm.register("storeDescription")} />
                </div>
                <div className="space-y-2">
                  <Label>{t("settings.contactEmail", "Contact email")}</Label>
                  <Input type="email" {...generalForm.register("contactEmail")} />
                </div>
                <div className="space-y-2">
                  <Label>{t("settings.contactPhone", "Contact phone")}</Label>
                  <Input {...generalForm.register("contactPhone")} />
                </div>
                <div className="space-y-2">
                  <Label>{t("settings.storeAddress", "Store address")}</Label>
                  <Input {...generalForm.register("storeAddress")} />
                </div>
                <div className="space-y-2">
                  <Label>{t("settings.timezone", "Timezone")}</Label>
                  <Input {...generalForm.register("timezone")} />
                </div>
                <div className="space-y-2">
                  <Label>{t("settings.language", "Language")}</Label>
                  <Input {...generalForm.register("language")} />
                </div>
                <div className="space-y-2">
                  <Label>{t("settings.currency", "Currency")}</Label>
                  <Input {...generalForm.register("currency")} />
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <Button type="submit" disabled={generalMutation.isPending}>
                    {generalMutation.isPending ? t("common.saving", "Saving...") : t("common.save", "Save")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivery" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.delivery", "Delivery settings")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="space-y-4" onSubmit={handleDeliverySave}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between border rounded-lg p-3">
                    <div>
                      <p className="font-medium">{t("settings.deliveryEnabled", "Enable delivery")}</p>
                      <p className="text-sm text-muted-foreground">
                        {t("settings.deliveryEnabledHint", "Toggle customer delivery availability")}
                      </p>
                    </div>
                    <Switch
                      checked={deliveryForm.watch("deliveryEnabled")}
                      onCheckedChange={(checked) => deliveryForm.setValue("deliveryEnabled", checked)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("settings.defaultDeliveryFee", "Default fee (cents)")}</Label>
                    <Input type="number" {...deliveryForm.register("defaultDeliveryFeeCents", { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("settings.freeDeliveryThreshold", "Free delivery threshold (cents)")}</Label>
                    <Input
                      type="number"
                      {...deliveryForm.register("freeDeliveryThresholdCents", { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{t("settings.zoneOverrides", "Per-zone overrides")}</h3>
                    <Badge variant="outline">{t("settings.liveZones", "Live zones: {{count}}", { count: zoneOverrideFields.length })}</Badge>
                  </div>
                  <div className="space-y-3">
                    {zoneOverrideFields.length === 0 && (
                      <p className="text-sm text-muted-foreground">{t("zones.emptyDesc", "No zones found. Add a zone first.")}</p>
                    )}
                    {zoneOverrideFields.map((field, idx) => (
                      <div key={field.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{zonesQuery.data?.items?.find((z) => z.id === field.zoneId)?.name || field.zoneId}</p>
                          <p className="text-xs text-muted-foreground">
                            {zonesQuery.data?.items?.find((z) => z.id === field.zoneId)?.city}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label>{t("settings.deliveryFeeOverride", "Delivery fee (cents)")}</Label>
                          <Input
                            type="number"
                            {...deliveryForm.register(`perZoneOverrides.${idx}.deliveryFeeCents` as const, { valueAsNumber: true })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>{t("settings.freeThresholdOverride", "Free threshold (cents)")}</Label>
                          <Input
                            type="number"
                            {...deliveryForm.register(`perZoneOverrides.${idx}.freeDeliveryThresholdCents` as const, { valueAsNumber: true })}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={deliveryMutation.isPending}>
                    {deliveryMutation.isPending ? t("common.saving", "Saving...") : t("common.save", "Save")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.payments", "Payments")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handlePaymentsSave}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between border rounded-lg p-3">
                    <div>
                      <p className="font-medium">{t("settings.cod", "Cash on delivery")}</p>
                      <p className="text-sm text-muted-foreground">{t("settings.codHint", "Allow cash payments")}</p>
                    </div>
                    <Switch
                      checked={paymentsForm.watch("cashOnDeliveryEnabled")}
                      onCheckedChange={(checked) => paymentsForm.setValue("cashOnDeliveryEnabled", checked)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("settings.codLimit", "COD max amount")}</Label>
                    <Input type="number" {...paymentsForm.register("cashOnDeliveryMaxAmount", { valueAsNumber: true })} />
                  </div>
                  <div className="flex items-center justify-between border rounded-lg p-3 md:col-span-2">
                    <div>
                      <p className="font-medium">{t("settings.stripe", "Stripe")}</p>
                      <p className="text-sm text-muted-foreground">{t("settings.stripeHint", "Enable card payments")}</p>
                    </div>
                    <Switch
                      checked={paymentsForm.watch("stripeEnabled")}
                      onCheckedChange={(checked) => paymentsForm.setValue("stripeEnabled", checked)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Stripe Public Key</Label>
                    <Input {...paymentsForm.register("stripePublicKey")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Stripe Secret Key</Label>
                    <Input {...paymentsForm.register("stripeSecretKey")} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={paymentsMutation.isPending}>
                    {paymentsMutation.isPending ? t("common.saving", "Saving...") : t("common.save", "Save")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.notifications", "Notifications")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleNotificationsSave}>
                <ToggleField
                  label={t("settings.notifyEmail", "Email notifications")}
                  description={t("settings.notifyEmailDesc", "Send order updates via email")}
                  checked={notificationsForm.watch("notifyEmail")}
                  onChange={(v) => notificationsForm.setValue("notifyEmail", v)}
                />
                <ToggleField
                  label={t("settings.notifySms", "SMS notifications")}
                  description={t("settings.notifySmsDesc", "Send SMS updates")}
                  checked={notificationsForm.watch("notifySms")}
                  onChange={(v) => notificationsForm.setValue("notifySms", v)}
                />
                <ToggleField
                  label={t("settings.notifyPush", "Push notifications")}
                  description={t("settings.notifyPushDesc", "Send push updates")}
                  checked={notificationsForm.watch("notifyPush")}
                  onChange={(v) => notificationsForm.setValue("notifyPush", v)}
                />
                <ToggleField
                  label={t("settings.marketing", "Marketing emails")}
                  description={t("settings.marketingDesc", "Enable promotional emails")}
                  checked={notificationsForm.watch("marketingEnabled")}
                  onChange={(v) => notificationsForm.setValue("marketingEnabled", v)}
                />
                <div className="md:col-span-2 flex justify-end">
                  <Button type="submit" disabled={notificationsMutation.isPending}>
                    {notificationsMutation.isPending ? t("common.saving", "Saving...") : t("common.save", "Save")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.system", "System")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSystemSave}>
                <ToggleField
                  label={t("settings.maintenance", "Maintenance mode")}
                  description={t("settings.maintenanceDesc", "Pause storefront while you work")}
                  checked={systemForm.watch("maintenanceMode")}
                  onChange={(v) => systemForm.setValue("maintenanceMode", v)}
                />
                <ToggleField
                  label={t("settings.allowRegistrations", "Allow registrations")}
                  description={t("settings.allowRegistrationsDesc", "Let new customers sign up")}
                  checked={systemForm.watch("allowRegistrations")}
                  onChange={(v) => systemForm.setValue("allowRegistrations", v)}
                />
                <ToggleField
                  label={t("settings.requireEmailVerification", "Require email verification")}
                  description={t("settings.requireEmailVerificationDesc", "Force verification for new accounts")}
                  checked={systemForm.watch("requireEmailVerification")}
                  onChange={(v) => systemForm.setValue("requireEmailVerification", v)}
                />
                <div className="space-y-2">
                  <Label>{t("settings.sessionTimeout", "Session timeout (minutes)")}</Label>
                  <Input type="number" {...systemForm.register("sessionTimeout", { valueAsNumber: true })} />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={systemMutation.isPending}>
                    {systemMutation.isPending ? t("common.saving", "Saving...") : t("common.save", "Save")}
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

type ToggleFieldProps = {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

function ToggleField({ label, description, checked, onChange }: ToggleFieldProps) {
  return (
    <div className="flex items-center justify-between border rounded-lg p-3">
      <div>
        <p className="font-medium">{label}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
