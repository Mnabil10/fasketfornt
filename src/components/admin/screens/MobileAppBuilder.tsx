import React from "react";
import { useTranslation } from "react-i18next";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Switch } from "../../ui/switch";
import { Label } from "../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { ImageWithFallback } from "../../figma/ImageWithFallback";
import { uploadAdminFile } from "../../../services/uploads.service";
import { getAdminErrorMessage } from "../../../lib/errors";
import type { MobileAppConfig } from "../../../types/settings";
import { toast } from "sonner";

type LocalizedValue = { en?: string; ar?: string } | string | null | undefined;
type LocalizedDraft = { en: string; ar: string };

type MobileAppBuilderProps = {
  value: MobileAppConfig;
  onChange: (next: MobileAppConfig) => void;
};

type DragState = { list: "tabs" | "sections" | "promos" | "pills"; index: number } | null;

const navIconOptions = ["home", "categories", "cart", "orders", "profile", "help"] as const;
const pillIconOptions = ["clock", "truck", "star", "sparkles"] as const;
const screenOptions = [
  "home",
  "categories",
  "cart",
  "orders",
  "help",
  "profile",
  "addresses",
  "loyalty",
  "about",
  "products",
];
const sectionTypeOptions = ["hero", "promos", "categories", "bestSelling", "hotOffers"] as const;
const MAX_IMAGE_MB = 2;

const cloneConfig = (config: MobileAppConfig) => JSON.parse(JSON.stringify(config ?? {})) as MobileAppConfig;

const toLocalizedDraft = (value: LocalizedValue): LocalizedDraft => {
  if (typeof value === "string") return { en: value, ar: "" };
  if (value && typeof value === "object") {
    return { en: value.en ?? "", ar: value.ar ?? "" };
  }
  return { en: "", ar: "" };
};

const resolveLocalized = (value: LocalizedValue, lang: "en" | "ar", fallback = "") => {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  return (lang === "ar" ? value.ar : value.en) || value.en || value.ar || fallback;
};

const setNestedValue = (target: any, path: Array<string | number>, value: any) => {
  let ref = target;
  for (let i = 0; i < path.length - 1; i += 1) {
    const key = path[i];
    if (ref[key] === null || typeof ref[key] !== "object") {
      ref[key] = typeof path[i + 1] === "number" ? [] : {};
    }
    ref = ref[key];
  }
  ref[path[path.length - 1]] = value;
};

const reorderList = <T,>(items: T[], from: number, to: number) => {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

export function MobileAppBuilder({ value, onChange }: MobileAppBuilderProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("ar") ? "ar" : "en";
  const [dragState, setDragState] = React.useState<DragState>(null);

  const updateConfig = React.useCallback(
    (updater: (draft: MobileAppConfig) => void) => {
      const next = cloneConfig(value ?? {});
      updater(next);
      onChange(next);
    },
    [value, onChange]
  );

  const updateLocalizedField = React.useCallback(
    (path: Array<string | number>, locale: "en" | "ar", nextValue: string) => {
      updateConfig((draft) => {
        const current = toLocalizedDraft(path.reduce((acc: any, key) => (acc ? acc[key] : undefined), draft));
        const next = { ...current, [locale]: nextValue };
        setNestedValue(draft, path, next);
      });
    },
    [updateConfig]
  );

  const updateField = React.useCallback(
    (path: Array<string | number>, nextValue: any) => {
      updateConfig((draft) => {
        setNestedValue(draft, path, nextValue);
      });
    },
    [updateConfig]
  );

  const tabs = (value.navigation?.tabs ?? []) as Array<any>;
  const heroPills = (value.home?.hero?.pills ?? []) as Array<any>;
  const promos = (value.home?.promos ?? []) as Array<any>;
  const sections = (value.home?.sections ?? []) as Array<any>;

  const handleDragStart = (list: DragState["list"], index: number) => {
    setDragState({ list, index });
  };

  const handleDrop = (list: DragState["list"], index: number) => {
    if (!dragState || dragState.list !== list || dragState.index === index) return;
    if (list === "tabs") {
      updateConfig((draft) => {
        const next = reorderList(
          Array.isArray(draft.navigation?.tabs) ? draft.navigation?.tabs : [],
          dragState.index,
          index
        );
        const withOrder = next.map((item, order) => ({ ...item, order }));
        draft.navigation = { ...(draft.navigation ?? {}), tabs: withOrder };
      });
    }
    if (list === "sections") {
      updateConfig((draft) => {
        const next = reorderList(
          Array.isArray(draft.home?.sections) ? draft.home?.sections : [],
          dragState.index,
          index
        );
        const withOrder = next.map((item, order) => ({ ...item, order }));
        draft.home = { ...(draft.home ?? {}), sections: withOrder };
      });
    }
    if (list === "promos") {
      updateConfig((draft) => {
        const next = reorderList(
          Array.isArray(draft.home?.promos) ? draft.home?.promos : [],
          dragState.index,
          index
        );
        draft.home = { ...(draft.home ?? {}), promos: next };
      });
    }
    if (list === "pills") {
      updateConfig((draft) => {
        const next = reorderList(
          Array.isArray(draft.home?.hero?.pills) ? draft.home?.hero?.pills : [],
          dragState.index,
          index
        );
        draft.home = { ...(draft.home ?? {}), hero: { ...(draft.home?.hero ?? {}), pills: next } };
      });
    }
    setDragState(null);
  };

  const handleDragEnd = () => setDragState(null);

  const addTab = () => {
    updateConfig((draft) => {
      const nextTabs = [...(draft.navigation?.tabs ?? [])];
      nextTabs.push({
        id: `tab-${Date.now()}`,
        screen: "home",
        icon: "home",
        label: { en: "", ar: "" },
        enabled: true,
        requiresAuth: false,
        order: nextTabs.length,
      });
      draft.navigation = { ...(draft.navigation ?? {}), tabs: nextTabs };
    });
  };

  const addPill = () => {
    updateConfig((draft) => {
      const nextPills = [...(draft.home?.hero?.pills ?? [])];
      nextPills.push({ label: { en: "", ar: "" }, icon: "sparkles" });
      draft.home = { ...(draft.home ?? {}), hero: { ...(draft.home?.hero ?? {}), pills: nextPills } };
    });
  };

  const addPromo = () => {
    updateConfig((draft) => {
      const nextPromos = [...(draft.home?.promos ?? [])];
      nextPromos.push({ imageUrl: "", title: { en: "", ar: "" }, subtitle: { en: "", ar: "" } });
      draft.home = { ...(draft.home ?? {}), promos: nextPromos };
    });
  };

  const addSection = () => {
    updateConfig((draft) => {
      const nextSections = [...(draft.home?.sections ?? [])];
      nextSections.push({
        id: `section-${Date.now()}`,
        type: "categories",
        enabled: true,
        order: nextSections.length,
        title: { en: "", ar: "" },
        subtitle: { en: "", ar: "" },
      });
      draft.home = { ...(draft.home ?? {}), sections: nextSections };
    });
  };

  const removeListItem = (list: DragState["list"], index: number) => {
    updateConfig((draft) => {
      if (list === "tabs") {
        const next = [...(draft.navigation?.tabs ?? [])];
        next.splice(index, 1);
        draft.navigation = { ...(draft.navigation ?? {}), tabs: next.map((item, order) => ({ ...item, order })) };
      }
      if (list === "sections") {
        const next = [...(draft.home?.sections ?? [])];
        next.splice(index, 1);
        draft.home = { ...(draft.home ?? {}), sections: next.map((item, order) => ({ ...item, order })) };
      }
      if (list === "promos") {
        const next = [...(draft.home?.promos ?? [])];
        next.splice(index, 1);
        draft.home = { ...(draft.home ?? {}), promos: next };
      }
      if (list === "pills") {
        const next = [...(draft.home?.hero?.pills ?? [])];
        next.splice(index, 1);
        draft.home = { ...(draft.home ?? {}), hero: { ...(draft.home?.hero ?? {}), pills: next } };
      }
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.mobileAppBranding", "Branding")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <LocalizedField
              label={t("settings.mobileAppAppName", "App name")}
              value={value.branding?.appName}
              onChange={(locale, nextValue) => updateLocalizedField(["branding", "appName"], locale, nextValue)}
            />
            <div className="grid gap-4 md:grid-cols-3">
              <ImageUploadField
                label={t("settings.mobileAppLogoUrl", "Logo")}
                value={value.branding?.logoUrl ?? ""}
                onChange={(nextValue) => updateField(["branding", "logoUrl"], nextValue)}
              />
              <ImageUploadField
                label={t("settings.mobileAppWordmarkUrl", "Wordmark")}
                value={value.branding?.wordmarkUrl ?? ""}
                onChange={(nextValue) => updateField(["branding", "wordmarkUrl"], nextValue)}
              />
              <ImageUploadField
                label={t("settings.mobileAppSplashUrl", "Splash image")}
                value={value.branding?.splashUrl ?? ""}
                onChange={(nextValue) => updateField(["branding", "splashUrl"], nextValue)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("settings.mobileAppTheme", "Theme")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <ColorField
                label={t("settings.mobileAppPrimaryColor", "Primary color")}
                value={value.theme?.primary ?? ""}
                onChange={(nextValue) => updateField(["theme", "primary"], nextValue)}
              />
              <ColorField
                label={t("settings.mobileAppAccentColor", "Accent color")}
                value={value.theme?.accent ?? ""}
                onChange={(nextValue) => updateField(["theme", "accent"], nextValue)}
              />
              <ColorField
                label={t("settings.mobileAppBackgroundColor", "Background color")}
                value={value.theme?.background ?? ""}
                onChange={(nextValue) => updateField(["theme", "background"], nextValue)}
              />
              <ColorField
                label={t("settings.mobileAppSurfaceColor", "Surface color")}
                value={value.theme?.surface ?? ""}
                onChange={(nextValue) => updateField(["theme", "surface"], nextValue)}
              />
              <ColorField
                label={t("settings.mobileAppTextColor", "Text color")}
                value={value.theme?.text ?? ""}
                onChange={(nextValue) => updateField(["theme", "text"], nextValue)}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label={t("settings.mobileAppHeroGradient", "Hero gradient")}
                value={value.theme?.heroGradient ?? ""}
                onChange={(nextValue) => updateField(["theme", "heroGradient"], nextValue)}
              />
              <Field
                label={t("settings.mobileAppSplashGradient", "Splash gradient")}
                value={value.theme?.splashGradient ?? ""}
                onChange={(nextValue) => updateField(["theme", "splashGradient"], nextValue)}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label={t("settings.mobileAppFontBase", "Base font")}
                value={value.theme?.fontBase ?? ""}
                onChange={(nextValue) => updateField(["theme", "fontBase"], nextValue)}
              />
              <Field
                label={t("settings.mobileAppFontArabic", "Arabic font")}
                value={value.theme?.fontArabic ?? ""}
                onChange={(nextValue) => updateField(["theme", "fontArabic"], nextValue)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("settings.mobileAppFeatures", "Features")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <ToggleField
              label={t("settings.mobileAppGuestCheckout", "Guest checkout")}
              checked={value.features?.guestCheckout ?? true}
              onChange={(checked) => updateField(["features", "guestCheckout"], checked)}
            />
            <ToggleField
              label={t("settings.mobileAppCoupons", "Coupons")}
              checked={value.features?.coupons ?? true}
              onChange={(checked) => updateField(["features", "coupons"], checked)}
            />
            <ToggleField
              label={t("settings.mobileAppLoyalty", "Loyalty")}
              checked={value.features?.loyalty ?? true}
              onChange={(checked) => updateField(["features", "loyalty"], checked)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle>{t("settings.mobileAppNavigation", "Navigation")}</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addTab}>
              <Plus className="w-4 h-4 mr-2" /> {t("settings.mobileAppAddTab", "Add tab")}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {tabs.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("common.not_available", "N/A")}</p>
            ) : (
              tabs.map((tab, index) => (
                <div
                  key={tab.id ?? index}
                  className="border rounded-lg p-3 space-y-3 bg-muted/20"
                  draggable
                  onDragStart={() => handleDragStart("tabs", index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDrop("tabs", index)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                    <div className="flex-1 text-sm font-medium">
                      {resolveLocalized(tab.label, lang, tab.id || t("settings.mobileAppTabLabel", "Tab label"))}
                    </div>
                    <Button type="button" size="icon" variant="ghost" onClick={() => removeListItem("tabs", index)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field
                      label={t("settings.mobileAppTabId", "Tab id")}
                      value={tab.id ?? ""}
                      onChange={(nextValue) => updateField(["navigation", "tabs", index, "id"], nextValue)}
                    />
                    <div className="space-y-2">
                      <Label>{t("settings.mobileAppScreen", "Screen")}</Label>
                      <Select
                        value={tab.screen ?? "home"}
                        onValueChange={(nextValue) => updateField(["navigation", "tabs", index, "screen"], nextValue)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {screenOptions.map((screen) => (
                            <SelectItem key={screen} value={screen}>
                              {t(`settings.mobileAppScreens.${screen}`, screen)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("settings.mobileAppIcon", "Icon")}</Label>
                      <Select
                        value={tab.icon ?? "home"}
                        onValueChange={(nextValue) => updateField(["navigation", "tabs", index, "icon"], nextValue)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {navIconOptions.map((icon) => (
                            <SelectItem key={icon} value={icon}>
                              {t(`settings.mobileAppIcons.${icon}`, icon)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <LocalizedField
                      label={t("settings.mobileAppTabLabel", "Tab label")}
                      value={tab.label}
                      onChange={(locale, nextValue) =>
                        updateLocalizedField(["navigation", "tabs", index, "label"], locale, nextValue)
                      }
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <ToggleField
                      label={t("common.enabled", "Enabled")}
                      checked={tab.enabled ?? true}
                      onChange={(checked) => updateField(["navigation", "tabs", index, "enabled"], checked)}
                    />
                    <ToggleField
                      label={t("settings.mobileAppRequiresAuth", "Requires login")}
                      checked={tab.requiresAuth ?? false}
                      onChange={(checked) => updateField(["navigation", "tabs", index, "requiresAuth"], checked)}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("settings.mobileAppHero", "Hero")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <LocalizedField
              label={t("settings.mobileAppPrompt", "Prompt")}
              value={value.home?.hero?.prompt}
              onChange={(locale, nextValue) => updateLocalizedField(["home", "hero", "prompt"], locale, nextValue)}
            />
            <LocalizedField
              label={t("settings.mobileAppTitle", "Title")}
              value={value.home?.hero?.title}
              onChange={(locale, nextValue) => updateLocalizedField(["home", "hero", "title"], locale, nextValue)}
            />
            <LocalizedField
              label={t("settings.mobileAppSubtitle", "Subtitle")}
              value={value.home?.hero?.subtitle}
              onChange={(locale, nextValue) => updateLocalizedField(["home", "hero", "subtitle"], locale, nextValue)}
            />
            <div className="flex items-center justify-between">
              <Label>{t("settings.mobileAppPills", "Hero pills")}</Label>
              <Button type="button" variant="outline" size="sm" onClick={addPill}>
                <Plus className="w-4 h-4 mr-2" /> {t("settings.mobileAppAddPill", "Add pill")}
              </Button>
            </div>
            <div className="space-y-3">
              {heroPills.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("common.not_available", "N/A")}</p>
              ) : (
                heroPills.map((pill, index) => (
                  <div
                    key={`${pill.icon || "pill"}-${index}`}
                    className="border rounded-lg p-3 space-y-3 bg-muted/20"
                    draggable
                    onDragStart={() => handleDragStart("pills", index)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => handleDrop("pills", index)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                      <div className="flex-1 text-sm font-medium">
                        {resolveLocalized(pill.label, lang, t("settings.mobileAppPillLabel", "Pill label"))}
                      </div>
                      <Button type="button" size="icon" variant="ghost" onClick={() => removeListItem("pills", index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{t("settings.mobileAppPillIcon", "Pill icon")}</Label>
                        <Select
                          value={pill.icon ?? "sparkles"}
                          onValueChange={(nextValue) => updateField(["home", "hero", "pills", index, "icon"], nextValue)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {pillIconOptions.map((icon) => (
                              <SelectItem key={icon} value={icon}>
                                {t(`settings.mobileAppIcons.${icon}`, icon)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <LocalizedField
                        label={t("settings.mobileAppPillLabel", "Pill label")}
                        value={pill.label}
                        onChange={(locale, nextValue) =>
                          updateLocalizedField(["home", "hero", "pills", index, "label"], locale, nextValue)
                        }
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle>{t("settings.mobileAppPromos", "Promotions")}</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addPromo}>
              <Plus className="w-4 h-4 mr-2" /> {t("settings.mobileAppAddPromo", "Add promo")}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {promos.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("common.not_available", "N/A")}</p>
            ) : (
              promos.map((promo, index) => (
                <div
                  key={`${promo.imageUrl || "promo"}-${index}`}
                  className="border rounded-lg p-3 space-y-3 bg-muted/20"
                  draggable
                  onDragStart={() => handleDragStart("promos", index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDrop("promos", index)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                    <div className="flex-1 text-sm font-medium">
                      {resolveLocalized(promo.title, lang, t("settings.mobileAppTitle", "Title"))}
                    </div>
                    <Button type="button" size="icon" variant="ghost" onClick={() => removeListItem("promos", index)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <ImageUploadField
                      label={t("settings.mobileAppPromoImage", "Image")}
                      value={promo.imageUrl ?? ""}
                      onChange={(nextValue) => updateField(["home", "promos", index, "imageUrl"], nextValue)}
                    />
                    <LocalizedField
                      label={t("settings.mobileAppTitle", "Title")}
                      value={promo.title}
                      onChange={(locale, nextValue) =>
                        updateLocalizedField(["home", "promos", index, "title"], locale, nextValue)
                      }
                    />
                    <LocalizedField
                      label={t("settings.mobileAppSubtitle", "Subtitle")}
                      value={promo.subtitle}
                      onChange={(locale, nextValue) =>
                        updateLocalizedField(["home", "promos", index, "subtitle"], locale, nextValue)
                      }
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle>{t("settings.mobileAppSections", "Sections")}</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addSection}>
              <Plus className="w-4 h-4 mr-2" /> {t("settings.mobileAppAddSection", "Add section")}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {sections.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("common.not_available", "N/A")}</p>
            ) : (
              sections.map((section, index) => (
                <div
                  key={section.id ?? index}
                  className="border rounded-lg p-3 space-y-3 bg-muted/20"
                  draggable
                  onDragStart={() => handleDragStart("sections", index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDrop("sections", index)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                    <div className="flex-1 text-sm font-medium">
                      {t(`settings.mobileAppSectionTypes.${section.type}`, section.type ?? "section")}
                    </div>
                    <Button type="button" size="icon" variant="ghost" onClick={() => removeListItem("sections", index)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{t("settings.mobileAppSectionType", "Section type")}</Label>
                      <Select
                        value={section.type ?? "categories"}
                        onValueChange={(nextValue) => updateField(["home", "sections", index, "type"], nextValue)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {sectionTypeOptions.map((type) => (
                            <SelectItem key={type} value={type}>
                              {t(`settings.mobileAppSectionTypes.${type}`, type)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <ToggleField
                      label={t("common.enabled", "Enabled")}
                      checked={section.enabled ?? true}
                      onChange={(checked) => updateField(["home", "sections", index, "enabled"], checked)}
                    />
                    <LocalizedField
                      label={t("settings.mobileAppTitle", "Title")}
                      value={section.title}
                      onChange={(locale, nextValue) =>
                        updateLocalizedField(["home", "sections", index, "title"], locale, nextValue)
                      }
                    />
                    <LocalizedField
                      label={t("settings.mobileAppSubtitle", "Subtitle")}
                      value={section.subtitle}
                      onChange={(locale, nextValue) =>
                        updateLocalizedField(["home", "sections", index, "subtitle"], locale, nextValue)
                      }
                    />
                    {["categories", "bestSelling", "hotOffers"].includes(section.type) && (
                      <Field
                        label={t("settings.mobileAppSectionLimit", "Limit")}
                        type="number"
                        value={section.limit ?? ""}
                        onChange={(nextValue) =>
                          updateField(
                            ["home", "sections", index, "limit"],
                            nextValue === "" ? null : Number(nextValue)
                          )
                        }
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("settings.mobileAppSupport", "Support")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label={t("settings.mobileAppPhone", "Phone")}
                value={value.content?.support?.phone ?? ""}
                onChange={(nextValue) => updateField(["content", "support", "phone"], nextValue)}
              />
              <Field
                label={t("settings.mobileAppEmail", "Email")}
                value={value.content?.support?.email ?? ""}
                onChange={(nextValue) => updateField(["content", "support", "email"], nextValue)}
              />
              <Field
                label={t("settings.mobileAppWhatsApp", "WhatsApp")}
                value={value.content?.support?.whatsapp ?? ""}
                onChange={(nextValue) => updateField(["content", "support", "whatsapp"], nextValue)}
              />
              <Field
                label={t("settings.mobileAppWebsite", "Website")}
                value={value.content?.support?.websiteUrl ?? ""}
                onChange={(nextValue) => updateField(["content", "support", "websiteUrl"], nextValue)}
              />
              <Field
                label={t("settings.mobileAppWebApp", "Web app")}
                value={value.content?.support?.webAppUrl ?? ""}
                onChange={(nextValue) => updateField(["content", "support", "webAppUrl"], nextValue)}
              />
              <Field
                label={t("settings.mobileAppPlayStore", "Play Store URL")}
                value={value.content?.support?.playStoreUrl ?? ""}
                onChange={(nextValue) => updateField(["content", "support", "playStoreUrl"], nextValue)}
              />
              <Field
                label={t("settings.mobileAppAppStore", "App Store URL")}
                value={value.content?.support?.appStoreUrl ?? ""}
                onChange={(nextValue) => updateField(["content", "support", "appStoreUrl"], nextValue)}
              />
            </div>
            <LocalizedField
              label={t("settings.mobileAppServiceArea", "Service area")}
              value={value.content?.support?.serviceArea}
              onChange={(locale, nextValue) => updateLocalizedField(["content", "support", "serviceArea"], locale, nextValue)}
            />
            <LocalizedField
              label={t("settings.mobileAppWorkingHours", "Working hours")}
              value={value.content?.support?.workingHours}
              onChange={(locale, nextValue) =>
                updateLocalizedField(["content", "support", "workingHours"], locale, nextValue)
              }
            />
            <LocalizedField
              label={t("settings.mobileAppCityCoverage", "City coverage")}
              value={value.content?.support?.cityCoverage}
              onChange={(locale, nextValue) =>
                updateLocalizedField(["content", "support", "cityCoverage"], locale, nextValue)
              }
            />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 lg:sticky lg:top-6 self-start">
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.mobileAppPreview", "Simulation preview")}</CardTitle>
          </CardHeader>
          <CardContent>
            <MobilePreview config={value} lang={lang} />
            <p className="text-xs text-muted-foreground mt-3">
              {t("settings.mobileAppPreviewHint", "Live preview updates as you edit.")}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (nextValue: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function ImageUploadField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string | null;
  onChange: (nextValue: string) => void;
}) {
  const { t } = useTranslation();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [sizeError, setSizeError] = React.useState<string | null>(null);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      const msg = t("products.upload.too_large", "File too large");
      setSizeError(msg);
      toast.error(msg);
      return;
    }
    setSizeError(null);
    setUploading(true);
    try {
      const { url } = await uploadAdminFile(file);
      onChange(url);
    } catch (error) {
      const msg = getAdminErrorMessage(error, t, t("common.notifications.error", "An error occurred"));
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div
        className="border-2 border-dashed rounded-lg p-3 text-sm text-muted-foreground"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files?.[0];
          if (file) {
            void handleFile(file);
          }
        }}
      >
        <div className="space-y-3">
          {value ? (
            <div className="w-24 h-24 rounded-md overflow-hidden bg-muted">
              <ImageWithFallback src={value} alt="upload" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-md bg-muted flex items-center justify-center text-xs">
              {t("common.not_available", "N/A")}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? t("common.saving", "Saving...") : t("app.actions.upload", "Upload")}
            </Button>
            {value ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => onChange("")}>
                {t("app.actions.clear", "Clear")}
              </Button>
            ) : null}
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>{t("settings.mobileAppImageHint", "Drop an image to upload.")}</p>
            <p>{t("validation.imageType", "Use PNG, JPG, or WEBP (max {{size}}MB)", { size: MAX_IMAGE_MB })}</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0] || null;
              if (file) {
                void handleFile(file);
              }
              event.currentTarget.value = "";
            }}
          />
        </div>
      </div>
      {sizeError ? <p className="text-xs text-rose-600">{sizeError}</p> : null}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (nextValue: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-12 rounded-md border border-input bg-background p-1"
        />
        <Input value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </div>
  );
}

function LocalizedField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: LocalizedValue;
  onChange: (locale: "en" | "ar", nextValue: string) => void;
  multiline?: boolean;
}) {
  const { t } = useTranslation();
  const localized = toLocalizedDraft(value);
  const InputComponent = multiline ? Textarea : Input;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">{t("settings.english", "English")}</span>
          <InputComponent value={localized.en} onChange={(event) => onChange("en", event.target.value)} />
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">{t("settings.arabic", "Arabic")}</span>
          <InputComponent value={localized.ar} onChange={(event) => onChange("ar", event.target.value)} />
        </div>
      </div>
    </div>
  );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <div className="flex items-center justify-between border rounded-lg p-3">
      <span className="text-sm font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function MobilePreview({ config, lang }: { config: MobileAppConfig; lang: "en" | "ar" }) {
  const { t } = useTranslation();
  const appName = resolveLocalized(config.branding?.appName, lang, "Fasket");
  const hero = config.home?.hero ?? {};
  const heroShowcase = {
    prompt: resolveLocalized(hero.prompt, lang, ""),
    title: resolveLocalized(hero.title, lang, ""),
    subtitle: resolveLocalized(hero.subtitle, lang, ""),
  };
  const pills = (hero.pills ?? []).map((pill: any) => ({
    label: resolveLocalized(pill.label, lang, ""),
    icon: pill.icon ?? "sparkles",
  }));
  const promos = config.home?.promos ?? [];
  const tabs = (config.navigation?.tabs ?? [])
    .filter((tab: any) => tab.enabled !== false)
    .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
    .slice(0, 5)
    .map((tab: any) => ({
      id: tab.id ?? tab.screen ?? "tab",
      label: resolveLocalized(tab.label, lang, tab.id ?? tab.screen ?? ""),
    }));

  return (
    <div
      className="rounded-3xl border overflow-hidden shadow-sm bg-white"
      style={{
        background: config.theme?.background || "#f6f7f9",
        color: config.theme?.text || "#1a1a1a",
        fontFamily: lang === "ar" ? config.theme?.fontArabic : config.theme?.fontBase,
      }}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          {config.branding?.logoUrl ? (
            <img src={config.branding.logoUrl} alt={appName} className="w-10 h-10 rounded-xl object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-white/80 border border-border" />
          )}
          <div>
            <p className="text-xs text-muted-foreground">{t("settings.mobileAppAppName", "App name")}</p>
            <p className="text-lg font-semibold">{appName}</p>
          </div>
        </div>
        <div
          className="rounded-2xl p-4 space-y-2"
          style={{
            background:
              config.theme?.heroGradient || "linear-gradient(135deg, rgba(229,57,53,0.16), rgba(255,133,122,0.12))",
          }}
        >
          {heroShowcase.prompt && <p className="text-xs text-muted-foreground">{heroShowcase.prompt}</p>}
          {heroShowcase.title && <h3 className="text-lg font-semibold">{heroShowcase.title}</h3>}
          {heroShowcase.subtitle && <p className="text-sm text-muted-foreground">{heroShowcase.subtitle}</p>}
          {pills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pills.map((pill, index) => (
                <span
                  key={`${pill.label}-${index}`}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-white/70 border border-border"
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: config.theme?.primary || "#E53935" }} />
                  {pill.label || pill.icon}
                </span>
              ))}
            </div>
          )}
        </div>
        {promos.length > 0 && (
          <div className="rounded-2xl overflow-hidden border border-border bg-white">
            {promos[0].imageUrl ? (
              <img src={promos[0].imageUrl} alt="promo" className="w-full h-24 object-cover" />
            ) : (
              <div className="w-full h-24 bg-muted" />
            )}
            <div className="p-3">
              <p className="font-semibold">{resolveLocalized(promos[0].title, lang, "") || t("settings.mobileAppTitle", "Title")}</p>
              <p className="text-xs text-muted-foreground">
                {resolveLocalized(promos[0].subtitle, lang, "") || t("settings.mobileAppSubtitle", "Subtitle")}
              </p>
            </div>
          </div>
        )}
      </div>
      <div className="border-t bg-white/95 px-3 py-2">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          {tabs.length > 0
            ? tabs.map((tab) => (
                <div key={tab.id} className="flex-1 text-center truncate">
                  {tab.label || tab.id}
                </div>
              ))
            : t("settings.mobileAppNavigation", "Navigation")}
        </div>
      </div>
    </div>
  );
}
