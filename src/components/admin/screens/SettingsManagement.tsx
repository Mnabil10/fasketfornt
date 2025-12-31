import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import { Switch } from "../../ui/switch";
import { Textarea } from "../../ui/textarea";
import { toast } from "sonner";
import { useSettingsAdmin } from "../../../hooks/api/useSettingsAdmin";
import { useUpdateSettingsSection } from "../../../hooks/api/useUpdateSettingsSection";
import { getAdminErrorMessage } from "../../../lib/errors";
import { AdminTableSkeleton } from "../common/AdminTableSkeleton";
import { ErrorState } from "../common/ErrorState";
import { EmptyState } from "../common/EmptyState";
import { MobileAppBuilder } from "./MobileAppBuilder";
import type {
  DeliverySettings,
  GeneralSettings,
  LoyaltySettings,
  MobileAppConfig,
  PaymentSettings,
  NotificationsSettings,
  SystemSettings,
} from "../../../types/settings";
import { useNavigate } from "react-router-dom";

const generalSchema = z.object({
  storeName: z.string().min(2),
  storeDescription: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  storeAddress: z.string().optional(),
  businessHours: z.string().optional(),
});

const deliverySchema = z.object({
  deliveryFee: z.coerce.number().min(0).default(0),
  freeDeliveryMinimum: z.coerce.number().min(0).default(0),
  deliveryRatePerKm: z.coerce.number().min(0).nullable().optional(),
  minDeliveryFee: z.coerce.number().min(0).nullable().optional(),
  maxDeliveryFee: z.coerce.number().min(0).nullable().optional(),
  estimatedDeliveryTime: z.coerce.number().min(0).nullable().optional(),
  maxDeliveryRadius: z.coerce.number().min(0).nullable().optional(),
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
  maxLoginAttempts: z.coerce.number().min(1).optional(),
  dataRetentionDays: z.coerce.number().min(0).optional(),
  backupFrequency: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
  currency: z.string().optional(),
});

const loyaltySchema = z.object({
  enabled: z.boolean(),
  earnPoints: z.coerce.number().min(0),
  earnPerAmount: z.coerce.number().min(0),
  earnRate: z.coerce.number().min(0),
  redeemRate: z.coerce.number().min(0),
  redeemUnitAmount: z.coerce.number().min(0),
  redeemRateValue: z.coerce.number().min(0),
  minRedeemPoints: z.coerce.number().min(0),
  maxDiscountPercent: z.coerce.number().min(0).max(100),
  maxRedeemPerOrder: z.coerce.number().min(0),
  resetThreshold: z.coerce.number().min(0),
});

type GeneralFormValues = z.infer<typeof generalSchema>;
type DeliveryFormValues = z.infer<typeof deliverySchema>;
type PaymentFormValues = z.infer<typeof paymentSchema>;
type NotificationsFormValues = z.infer<typeof notificationsSchema>;
type SystemFormValues = z.infer<typeof systemSchema>;
type LoyaltyFormValues = z.infer<typeof loyaltySchema>;

type SettingsManagementProps = {
  initialSection?: string;
};

const mobileAppTemplate = {
  branding: {
    appName: { en: "Fasket", ar: "" },
    logoUrl: "",
    splashUrl: "",
    wordmarkUrl: "",
  },
  theme: {
    primary: "#E53935",
    primaryStrong: "#C62828",
    accent: "#FF857A",
    background: "#F6F7F9",
    surface: "#FFFFFF",
    surfaceMuted: "#FAFAFA",
    text: "#1A1A1A",
    textStrong: "#2B2B2F",
    textMuted: "#757575",
    muted: "#757575",
    mutedForeground: "#667085",
    borderStrong: "rgba(0,0,0,0.1)",
    borderSoft: "rgba(0,0,0,0.06)",
    heroGradient: "linear-gradient(135deg, rgba(229,57,53,0.16), rgba(255,133,122,0.12))",
    splashGradient: "linear-gradient(140deg, #E53935 0%, #c92b2b 45%, #0f172a 110%)",
    fontBase: "\"Manrope\", \"Inter\", system-ui, -apple-system, \"Segoe UI\", sans-serif",
    fontArabic: "\"Cairo\", \"Manrope\", \"Inter\", system-ui, -apple-system, \"Segoe UI\", sans-serif",
  },
  navigation: {
    tabs: [
      { id: "home", screen: "home", label: { en: "Home", ar: "" }, enabled: true },
      { id: "categories", screen: "categories", label: { en: "Categories", ar: "" }, enabled: true },
      { id: "cart", screen: "cart", label: { en: "Cart", ar: "" }, enabled: true },
      { id: "help", screen: "help", label: { en: "Help", ar: "" }, enabled: true },
      { id: "orders", screen: "orders", label: { en: "Orders", ar: "" }, enabled: true, requiresAuth: true },
      { id: "profile", screen: "profile", label: { en: "Profile", ar: "" }, enabled: true, requiresAuth: true },
    ],
  },
  home: {
    hero: {
      prompt: { en: "Start shopping today", ar: "" },
      title: { en: "Welcome to Fasket", ar: "" },
      subtitle: { en: "Fresh groceries and essentials delivered fast.", ar: "" },
      pills: [
        { label: { en: "30-45 min delivery", ar: "" }, icon: "clock" },
        { label: { en: "Citywide coverage", ar: "" }, icon: "truck" },
        { label: { en: "Quality picks", ar: "" }, icon: "star" },
      ],
    },
    promos: [
      {
        imageUrl: "https://images.unsplash.com/photo-1705727209465-b292e4129a37?auto=format&fit=crop&w=1080&q=80",
        title: { en: "Weekly deals", ar: "" },
        subtitle: { en: "Save on essentials and favorites.", ar: "" },
      },
    ],
    sections: [
      { id: "hero", type: "hero", enabled: true },
      { id: "promos", type: "promos", enabled: true },
      { id: "categories", type: "categories", enabled: true },
      { id: "best-selling", type: "bestSelling", enabled: true },
      { id: "hot-offers", type: "hotOffers", enabled: true },
    ],
  },
  content: {
    support: {
      phone: "",
      email: "",
      websiteUrl: "",
      webAppUrl: "",
      whatsapp: "",
      serviceArea: { en: "", ar: "" },
      workingHours: { en: "", ar: "" },
      cityCoverage: { en: "", ar: "" },
      playStoreUrl: "",
      appStoreUrl: "",
    },
  },
  features: {
    guestCheckout: true,
    coupons: true,
    loyalty: true,
  },
};

type MobileAppLocalizedValue = { en?: string; ar?: string } | string | null | undefined;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const cloneMobileAppConfig = (config: MobileAppConfig) =>
  JSON.parse(JSON.stringify(config ?? {})) as MobileAppConfig;

const mergeDeep = (target: any, source: any) => {
  Object.keys(source).forEach((key) => {
    const value = source[key];
    if (Array.isArray(value)) {
      target[key] = value.map((item) => (isPlainObject(item) ? mergeDeep({}, item) : item));
      return;
    }
    if (isPlainObject(value)) {
      target[key] = mergeDeep(isPlainObject(target[key]) ? target[key] : {}, value);
      return;
    }
    target[key] = value;
  });
  return target;
};

const normalizeLocalized = (value: MobileAppLocalizedValue, fallback?: MobileAppLocalizedValue) => {
  const resolved = value ?? fallback;
  if (typeof resolved === "string") return { en: resolved, ar: "" };
  if (resolved && typeof resolved === "object") return { en: resolved.en ?? "", ar: resolved.ar ?? "" };
  return { en: "", ar: "" };
};

const normalizeMobileAppConfig = (raw: MobileAppConfig | null | undefined) => {
  const base = cloneMobileAppConfig(mobileAppTemplate);
  const merged = mergeDeep(base, raw ?? {});

  merged.branding = merged.branding ?? {};
  merged.branding.appName = normalizeLocalized(merged.branding.appName, base.branding.appName);

  merged.navigation = merged.navigation ?? {};
  const tabsSource = Array.isArray(merged.navigation.tabs) ? merged.navigation.tabs : base.navigation.tabs;
  merged.navigation.tabs = tabsSource.map((tab: any, index: number) => ({
    ...tab,
    id: tab.id ?? tab.screen ?? `tab-${index}`,
    screen: tab.screen ?? tab.id ?? "home",
    icon: tab.icon ?? tab.id ?? tab.screen ?? "home",
    label: normalizeLocalized(tab.label, base.navigation.tabs?.[index]?.label),
    enabled: tab.enabled ?? true,
    requiresAuth: tab.requiresAuth ?? false,
    order: typeof tab.order === "number" ? tab.order : index,
  }));

  merged.home = merged.home ?? {};
  const heroBase = base.home?.hero ?? {};
  const hero = merged.home.hero ?? {};
  const pillsSource = Array.isArray(hero.pills) ? hero.pills : heroBase.pills ?? [];
  merged.home.hero = {
    ...hero,
    prompt: normalizeLocalized(hero.prompt, heroBase.prompt),
    title: normalizeLocalized(hero.title, heroBase.title),
    subtitle: normalizeLocalized(hero.subtitle, heroBase.subtitle),
    pills: pillsSource.map((pill: any, index: number) => ({
      ...pill,
      label: normalizeLocalized(pill.label, heroBase.pills?.[index]?.label),
      icon: typeof pill.icon === "string" ? pill.icon : heroBase.pills?.[index]?.icon ?? "sparkles",
    })),
  };

  const promosSource = Array.isArray(merged.home.promos) ? merged.home.promos : base.home?.promos ?? [];
  merged.home.promos = promosSource.map((promo: any, index: number) => ({
    ...promo,
    imageUrl: promo.imageUrl ?? base.home?.promos?.[index]?.imageUrl ?? "",
    title: normalizeLocalized(promo.title, base.home?.promos?.[index]?.title),
    subtitle: normalizeLocalized(promo.subtitle, base.home?.promos?.[index]?.subtitle),
  }));

  const sectionsSource = Array.isArray(merged.home.sections) ? merged.home.sections : base.home?.sections ?? [];
  merged.home.sections = sectionsSource.map((section: any, index: number) => ({
    ...section,
    id: section.id ?? section.type ?? `section-${index}`,
    enabled: section.enabled ?? true,
    order: typeof section.order === "number" ? section.order : index,
    title: section.title ? normalizeLocalized(section.title) : section.title ?? undefined,
    subtitle: section.subtitle ? normalizeLocalized(section.subtitle) : section.subtitle ?? undefined,
  }));

  merged.content = merged.content ?? {};
  merged.content.support = merged.content.support ?? {};
  merged.content.support.serviceArea = normalizeLocalized(merged.content.support.serviceArea, base.content?.support?.serviceArea);
  merged.content.support.workingHours = normalizeLocalized(merged.content.support.workingHours, base.content?.support?.workingHours);
  merged.content.support.cityCoverage = normalizeLocalized(merged.content.support.cityCoverage, base.content?.support?.cityCoverage);

  merged.features = {
    guestCheckout:
      typeof merged.features?.guestCheckout === "boolean" ? merged.features.guestCheckout : base.features?.guestCheckout ?? true,
    coupons: typeof merged.features?.coupons === "boolean" ? merged.features.coupons : base.features?.coupons ?? true,
    loyalty: typeof merged.features?.loyalty === "boolean" ? merged.features.loyalty : base.features?.loyalty ?? true,
  };

  return merged;
};

export function SettingsManagement({ initialSection }: SettingsManagementProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const settingsQuery = useSettingsAdmin();
  const generalMutation = useUpdateSettingsSection("general");
  const deliveryMutation = useUpdateSettingsSection("delivery");
  const paymentsMutation = useUpdateSettingsSection("payments");
  const notificationsMutation = useUpdateSettingsSection("notifications");
  const systemMutation = useUpdateSettingsSection("system");
  const loyaltyMutation = useUpdateSettingsSection("loyalty");
  const mobileAppMutation = useUpdateSettingsSection("mobileApp");

  const [activeTab, setActiveTab] = React.useState(() => {
    if (initialSection === "delivery") return "delivery";
    if (initialSection === "delivery-zones") return "delivery";
    if (initialSection === "mobile-app" || initialSection === "mobileApp") return "mobile-app";
    return initialSection || "general";
  });
  const mobileAppTemplateJson = React.useMemo(() => JSON.stringify(mobileAppTemplate, null, 2), []);
  const [mobileAppEditorMode, setMobileAppEditorMode] = React.useState<"builder" | "json">("builder");
  const [mobileAppDraft, setMobileAppDraft] = React.useState<MobileAppConfig>(() => normalizeMobileAppConfig(null));
  const [mobileAppJson, setMobileAppJson] = React.useState(mobileAppTemplateJson);
  const [mobileAppJsonError, setMobileAppJsonError] = React.useState<string | null>(null);

  const generalForm = useForm<GeneralFormValues>({
    resolver: zodResolver(generalSchema) as Resolver<GeneralFormValues>,
    defaultValues: {
      storeName: "",
      storeDescription: "",
      contactEmail: "",
      contactPhone: "",
      storeAddress: "",
      businessHours: "",
    },
  });

  const deliveryForm = useForm<DeliveryFormValues>({
    resolver: zodResolver(deliverySchema) as Resolver<DeliveryFormValues>,
    defaultValues: {
      deliveryFee: 0,
      freeDeliveryMinimum: 0,
      deliveryRatePerKm: null,
      minDeliveryFee: null,
      maxDeliveryFee: null,
      estimatedDeliveryTime: null,
      maxDeliveryRadius: null,
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
      maxLoginAttempts: 5,
      dataRetentionDays: 0,
      backupFrequency: "",
      timezone: "",
      language: "",
      currency: "",
    },
  });

  const loyaltyForm = useForm<LoyaltyFormValues>({
    resolver: zodResolver(loyaltySchema) as Resolver<LoyaltyFormValues>,
    defaultValues: {
      enabled: false,
      earnPoints: 1,
      earnPerAmount: 1,
      earnRate: 1,
      redeemRate: 1,
      redeemUnitAmount: 1,
      redeemRateValue: 1,
      minRedeemPoints: 0,
      maxDiscountPercent: 100,
      maxRedeemPerOrder: 0,
      resetThreshold: 0,
    },
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
        businessHours: g.businessHours || "",
      });
    }
  }, [settingsQuery.data?.general, generalForm]);

  useEffect(() => {
    const d = settingsQuery.data?.delivery as DeliverySettings | undefined;
    if (!d) return;

    deliveryForm.reset({
      deliveryFee: d.deliveryFee ?? (d.deliveryFeeCents != null ? d.deliveryFeeCents / 100 : 0),
      freeDeliveryMinimum:
        d.freeDeliveryMinimum ?? (d.freeDeliveryMinimumCents != null ? d.freeDeliveryMinimumCents / 100 : 0),
      deliveryRatePerKm:
        d.deliveryRatePerKm ?? (d.deliveryRatePerKmCents != null ? d.deliveryRatePerKmCents / 100 : null),
      minDeliveryFee: d.minDeliveryFee ?? (d.minDeliveryFeeCents != null ? d.minDeliveryFeeCents / 100 : null),
      maxDeliveryFee: d.maxDeliveryFee ?? (d.maxDeliveryFeeCents != null ? d.maxDeliveryFeeCents / 100 : null),
      estimatedDeliveryTime: d.estimatedDeliveryTime ?? null,
      maxDeliveryRadius: d.maxDeliveryRadius ?? null,
    });
  }, [settingsQuery.data?.delivery, deliveryForm]);

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
      maxLoginAttempts: s.maxLoginAttempts ?? 5,
      dataRetentionDays: s.dataRetentionDays ?? 0,
      backupFrequency: s.backupFrequency ?? "",
      timezone: s.timezone ?? "",
      language: s.language ?? "",
      currency: s.currency ?? "",
    });
  }, [settingsQuery.data?.system, systemForm]);

  useEffect(() => {
    const l = settingsQuery.data?.loyalty as LoyaltySettings | undefined;
    if (!l) return;
    loyaltyForm.reset({
      enabled: l.enabled ?? false,
      earnPoints: l.earnPoints ?? 1,
      earnPerAmount: l.earnPerCents != null ? l.earnPerCents / 100 : 1,
      earnRate: l.earnRate ?? 1,
      redeemRate: l.redeemRate ?? 1,
      redeemUnitAmount: l.redeemUnitCents != null ? l.redeemUnitCents / 100 : 1,
      redeemRateValue: l.redeemRateValue ?? 1,
      minRedeemPoints: l.minRedeemPoints ?? 0,
      maxDiscountPercent: l.maxDiscountPercent ?? 100,
      maxRedeemPerOrder: l.maxRedeemPerOrder ?? 0,
      resetThreshold: l.resetThreshold ?? 0,
    });
  }, [settingsQuery.data?.loyalty, loyaltyForm]);

  useEffect(() => {
    const raw = settingsQuery.data?.mobileApp;
    if (raw === undefined) return;
    const normalized = normalizeMobileAppConfig(raw);
    setMobileAppDraft(normalized);
    setMobileAppJson(JSON.stringify(normalized, null, 2));
    setMobileAppJsonError(null);
  }, [settingsQuery.data?.mobileApp]);

  useEffect(() => {
    if (mobileAppEditorMode !== "builder") return;
    setMobileAppJson(JSON.stringify(mobileAppDraft, null, 2));
    setMobileAppJsonError(null);
  }, [mobileAppDraft, mobileAppEditorMode]);

  const handleGeneralSave = generalForm.handleSubmit(async (values) => {
    try {
      await generalMutation.mutateAsync(values);
      toast.success(t("settings.saved", "Settings updated"));
    } catch (error) {
      toast.error(getAdminErrorMessage(error, t));
    }
  });

  const handleDeliverySave = deliveryForm.handleSubmit(async (values) => {
    const toSafeNumber = (value: number | null | undefined) =>
      Number.isFinite(value as number) ? (value as number) : 0;
    const ratePerKm = toSafeNumber(values.deliveryRatePerKm);
    const minFee = toSafeNumber(values.minDeliveryFee);
    const maxFee = toSafeNumber(values.maxDeliveryFee);
    const payload: DeliverySettings = {
      deliveryFee: values.deliveryFee,
      deliveryFeeCents: Math.round(values.deliveryFee * 100),
      freeDeliveryMinimum: values.freeDeliveryMinimum,
      freeDeliveryMinimumCents: Math.round(values.freeDeliveryMinimum * 100),
      deliveryRatePerKm: values.deliveryRatePerKm ?? null,
      deliveryRatePerKmCents: Math.round(ratePerKm * 100),
      minDeliveryFee: values.minDeliveryFee ?? null,
      minDeliveryFeeCents: Math.round(minFee * 100),
      maxDeliveryFee: values.maxDeliveryFee ?? null,
      maxDeliveryFeeCents: Math.round(maxFee * 100),
      estimatedDeliveryTime: values.estimatedDeliveryTime ?? null,
      maxDeliveryRadius: values.maxDeliveryRadius ?? null,
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
      maxLoginAttempts: values.maxLoginAttempts,
      dataRetentionDays: values.dataRetentionDays,
      backupFrequency: values.backupFrequency,
      timezone: values.timezone,
      language: values.language,
      currency: values.currency,
    };
    try {
      await systemMutation.mutateAsync(payload);
      toast.success(t("settings.saved", "Settings updated"));
    } catch (error) {
      toast.error(getAdminErrorMessage(error, t));
    }
  });

  const handleLoyaltySave = loyaltyForm.handleSubmit(async (values) => {
    const payload: LoyaltySettings = {
      enabled: values.enabled,
      earnPoints: values.earnPoints,
      earnPerCents: Math.round(values.earnPerAmount * 100),
      earnRate: values.earnRate,
      redeemRate: values.redeemRate,
      redeemUnitCents: Math.round(values.redeemUnitAmount * 100),
      redeemRateValue: values.redeemRateValue,
      minRedeemPoints: values.minRedeemPoints,
      maxDiscountPercent: values.maxDiscountPercent,
      maxRedeemPerOrder: values.maxRedeemPerOrder,
      resetThreshold: values.resetThreshold,
    };
    try {
      await loyaltyMutation.mutateAsync(payload);
      toast.success(t("settings.saved", "Settings updated"));
    } catch (error) {
      toast.error(getAdminErrorMessage(error, t));
    }
  });

  const handleMobileAppSave = async () => {
    try {
      await mobileAppMutation.mutateAsync(mobileAppDraft);
      toast.success(t("settings.saved", "Settings updated"));
    } catch (error) {
      toast.error(getAdminErrorMessage(error, t));
    }
  };

  const handleMobileAppReset = () => {
    const normalized = normalizeMobileAppConfig(mobileAppTemplate);
    setMobileAppDraft(normalized);
    setMobileAppJson(JSON.stringify(normalized, null, 2));
    setMobileAppJsonError(null);
  };

  const handleMobileAppApplyJson = () => {
    const raw = mobileAppJson.trim();
    if (!raw) {
      const normalized = normalizeMobileAppConfig(mobileAppTemplate);
      setMobileAppDraft(normalized);
      setMobileAppJson(JSON.stringify(normalized, null, 2));
      setMobileAppJsonError(null);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      const normalized = normalizeMobileAppConfig(parsed);
      setMobileAppDraft(normalized);
      setMobileAppJson(JSON.stringify(normalized, null, 2));
      setMobileAppJsonError(null);
    } catch (error) {
      setMobileAppJsonError(t("settings.mobileAppInvalid", "Mobile app config must be valid JSON."));
    }
  };

  const handleMobileAppEditorChange = (value: string) => {
    const nextValue = value === "json" ? "json" : "builder";
    setMobileAppEditorMode(nextValue);
    if (nextValue === "json") {
      setMobileAppJson(JSON.stringify(mobileAppDraft, null, 2));
      setMobileAppJsonError(null);
    }
  };

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
        <ErrorState
          message={getAdminErrorMessage(settingsQuery.error, t, t("settings.loadError", "Unable to load settings"))}
          onRetry={() => settingsQuery.refetch()}
        />
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
          <TabsTrigger value="loyalty">{t("settings.loyalty", "Loyalty")}</TabsTrigger>
          <TabsTrigger value="payments">{t("settings.payments", "Payments")}</TabsTrigger>
          <TabsTrigger value="notifications">{t("settings.notifications", "Notifications")}</TabsTrigger>
          <TabsTrigger value="system">{t("settings.system", "System")}</TabsTrigger>
          <TabsTrigger value="mobile-app">{t("settings.mobileApp", "Mobile App")}</TabsTrigger>
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
                  <Label>{t("settings.businessHours", "Business hours")}</Label>
                  <Input {...generalForm.register("businessHours")} />
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
                  <div className="space-y-2">
                    <Label>{t("settings.defaultDeliveryFee", "Default delivery fee (currency)")}</Label>
                    <Input type="number" step="0.01" {...deliveryForm.register("deliveryFee", { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("settings.freeDeliveryThreshold", "Free delivery minimum (currency)")}</Label>
                    <Input type="number" step="0.01" {...deliveryForm.register("freeDeliveryMinimum", { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("settings.deliveryRatePerKm", "Rate per km (currency)")}</Label>
                    <Input type="number" step="0.01" {...deliveryForm.register("deliveryRatePerKm", { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("settings.minDeliveryFee", "Min delivery fee (currency)")}</Label>
                    <Input type="number" step="0.01" {...deliveryForm.register("minDeliveryFee", { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("settings.maxDeliveryFee", "Max delivery fee (currency)")}</Label>
                    <Input type="number" step="0.01" {...deliveryForm.register("maxDeliveryFee", { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("settings.estimatedDeliveryTime", "Estimated delivery time (minutes)")}</Label>
                    <Input
                      type="number"
                      min={0}
                      step={5}
                      {...deliveryForm.register("estimatedDeliveryTime", { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("settings.maxDeliveryRadius", "Max delivery radius (km)")}</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.1"
                      {...deliveryForm.register("maxDeliveryRadius", { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {t("settings.manageZonesHint", "Manage delivery zones and per-zone fees from the zones screen.")}
                  </div>
                  <Button variant="outline" type="button" onClick={() => navigate("/settings/delivery-zones")}>
                    {t("zones.manage", "Manage delivery zones")}
                  </Button>
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

        <TabsContent value="loyalty" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.loyalty", "Loyalty")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="space-y-6" onSubmit={handleLoyaltySave}>
                <div className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <p className="font-medium">{t("settings.loyaltyEnable", "Enable loyalty program")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("settings.loyaltyEnableDesc", "Allow customers to earn and redeem points")}
                    </p>
                  </div>
                  <Switch checked={loyaltyForm.watch("enabled")} onCheckedChange={(v) => loyaltyForm.setValue("enabled", v)} />
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">{t("settings.loyaltyEarning", "Earning rules")}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("settings.loyaltyEarnPoints", "Points awarded")}</Label>
                      <Input type="number" min={0} step="0.01" {...loyaltyForm.register("earnPoints", { valueAsNumber: true })} />
                      <p className="text-xs text-muted-foreground">
                        {t("settings.loyaltyEarnPointsDesc", "Points granted each time the spend rule is met")}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("settings.loyaltyEarnPer", "Spend amount per reward (currency)")}</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        {...loyaltyForm.register("earnPerAmount", { valueAsNumber: true })}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("settings.loyaltyEarnPerDesc", "Amount customers must spend to earn the points above")}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("settings.loyaltyEarnRate", "Earn rate multiplier")}</Label>
                      <Input type="number" min={0} step="0.01" {...loyaltyForm.register("earnRate", { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("settings.loyaltyReset", "Points reset threshold")}</Label>
                      <Input type="number" min={0} step="1" {...loyaltyForm.register("resetThreshold", { valueAsNumber: true })} />
                      <p className="text-xs text-muted-foreground">
                        {t("settings.loyaltyResetDesc", "Set when points expire or reset.")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">{t("settings.loyaltyRedeeming", "Redemption rules")}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("settings.loyaltyRedeemRate", "Points per redeem unit")}</Label>
                      <Input type="number" min={0} step="1" {...loyaltyForm.register("redeemRate", { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("settings.loyaltyRedeemUnit", "Redeem unit (currency)")}</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        {...loyaltyForm.register("redeemUnitAmount", { valueAsNumber: true })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("settings.loyaltyRedeemValue", "Redeem value per unit")}</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        {...loyaltyForm.register("redeemRateValue", { valueAsNumber: true })}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("settings.loyaltyRedeemValueDesc", "Discount value granted for each redeem unit")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">{t("settings.loyaltyLimits", "Limits")}</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>{t("settings.loyaltyMinRedeem", "Minimum redeem points")}</Label>
                      <Input
                        type="number"
                        min={0}
                        step="1"
                        {...loyaltyForm.register("minRedeemPoints", { valueAsNumber: true })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("settings.loyaltyMaxRedeem", "Max points per order")}</Label>
                      <Input
                        type="number"
                        min={0}
                        step="1"
                        {...loyaltyForm.register("maxRedeemPerOrder", { valueAsNumber: true })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("settings.loyaltyMaxDiscount", "Max discount (%)")}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="1"
                        {...loyaltyForm.register("maxDiscountPercent", { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={loyaltyMutation.isPending}>
                    {loyaltyMutation.isPending ? t("common.saving", "Saving...") : t("common.save", "Save")}
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{t("settings.maxLoginAttempts", "Max login attempts")}</Label>
                    <Input type="number" min={1} {...systemForm.register("maxLoginAttempts", { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("settings.dataRetentionDays", "Data retention (days)")}</Label>
                    <Input type="number" min={0} {...systemForm.register("dataRetentionDays", { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("settings.backupFrequency", "Backup frequency")}</Label>
                    <Input {...systemForm.register("backupFrequency")} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("settings.timezone", "Timezone")}</Label>
                    <Input {...systemForm.register("timezone")} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("settings.language", "Language")}</Label>
                    <Input {...systemForm.register("language")} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("settings.currency", "Currency")}</Label>
                    <Input {...systemForm.register("currency")} />
                  </div>
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

        <TabsContent value="mobile-app" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.mobileApp", "Mobile App")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-muted-foreground">
                  {t("settings.mobileAppEditorHint", "Use the builder to control the mobile experience and preview changes live.")}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" onClick={handleMobileAppReset}>
                    {t("settings.mobileAppResetTemplate", "Reset to template")}
                  </Button>
                  <Button type="button" onClick={handleMobileAppSave} disabled={mobileAppMutation.isPending}>
                    {mobileAppMutation.isPending ? t("common.saving", "Saving...") : t("common.save", "Save")}
                  </Button>
                </div>
              </div>

              <Tabs value={mobileAppEditorMode} onValueChange={handleMobileAppEditorChange} className="w-full">
                <TabsList className="flex flex-wrap">
                  <TabsTrigger value="builder">{t("settings.mobileAppBuilderTab", "Builder")}</TabsTrigger>
                  <TabsTrigger value="json">{t("settings.mobileAppJsonTab", "JSON")}</TabsTrigger>
                </TabsList>
                <TabsContent value="builder" className="mt-4">
                  <MobileAppBuilder value={mobileAppDraft} onChange={setMobileAppDraft} />
                </TabsContent>
                <TabsContent value="json" className="mt-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t("settings.mobileAppConfig", "Mobile app configuration (JSON)")}</Label>
                      <Textarea
                        rows={18}
                        className="font-mono text-xs"
                        placeholder={mobileAppTemplateJson}
                        value={mobileAppJson}
                        onChange={(event) => setMobileAppJson(event.target.value)}
                      />
                      {mobileAppJsonError && <p className="text-xs text-red-600">{mobileAppJsonError}</p>}
                      <p className="text-xs text-muted-foreground">
                        {t(
                          "settings.mobileAppHint",
                          "Use JSON to control branding, theme, navigation, and home sections."
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="outline" onClick={() => setMobileAppJson(mobileAppTemplateJson)}>
                        {t("settings.mobileAppLoadTemplate", "Load template")}
                      </Button>
                      <Button type="button" variant="outline" onClick={handleMobileAppApplyJson}>
                        {t("settings.mobileAppApplyJson", "Apply JSON")}
                      </Button>
                      <Button type="button" onClick={handleMobileAppSave} disabled={mobileAppMutation.isPending}>
                        {mobileAppMutation.isPending ? t("common.saving", "Saving...") : t("common.save", "Save")}
                      </Button>
                    </div>
                    <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                      <p className="font-semibold text-foreground mb-2">
                        {t("settings.mobileAppTemplateTitle", "Template preview")}
                      </p>
                      <pre className="whitespace-pre-wrap break-words">{mobileAppTemplateJson}</pre>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
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
