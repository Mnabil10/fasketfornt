import React, { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Switch } from "../ui/switch";
import { ErrorState } from "../admin/common/ErrorState";
import { fmtCurrency } from "../../lib/money";
import { fetchProviderAccount } from "../../services/provider-account.service";
import {
  fetchProviderNotificationPreferences,
  updateProviderNotificationPreferences,
  type ProviderNotificationPreferences,
} from "../../services/provider-finance.service";

function formatDate(value?: string | null) {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleDateString();
}

export function VendorSettings() {
  const { t, i18n } = useTranslation();
  const accountQuery = useQuery({
    queryKey: ["provider-account"],
    queryFn: fetchProviderAccount,
  });
  const prefsQuery = useQuery({
    queryKey: ["provider-notification-preferences"],
    queryFn: fetchProviderNotificationPreferences,
  });
  const [prefs, setPrefs] = useState<ProviderNotificationPreferences | null>(null);

  useEffect(() => {
    if (prefsQuery.data) {
      setPrefs(prefsQuery.data);
    }
  }, [prefsQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (payload: ProviderNotificationPreferences) => updateProviderNotificationPreferences(payload),
    onSuccess: (data) => setPrefs(data),
  });

  if (accountQuery.isLoading || prefsQuery.isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">{t("app.loading", "Loading...")}</div>;
  }

  if (accountQuery.isError || prefsQuery.isError) {
    return (
      <ErrorState
        message={t("vendor.settings.load_failed", "Unable to load settings")}
        onRetry={() => {
          accountQuery.refetch();
          prefsQuery.refetch();
        }}
      />
    );
  }

  const provider = accountQuery.data?.provider;
  const subscription = accountQuery.data?.subscription;
  const currency = subscription?.plan?.currency || "EGP";

  const togglePref = (key: keyof ProviderNotificationPreferences, channel: "email" | "sms" | "push") => {
    if (!prefs) return;
    setPrefs({
      ...prefs,
      [key]: {
        ...prefs[key],
        [channel]: !prefs[key][channel],
      },
    });
  };

  const savePrefs = () => {
    if (!prefs) return;
    updateMutation.mutate(prefs);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("vendor.settings.title", "Settings")}</h1>
        <p className="text-muted-foreground">{t("vendor.settings.subtitle", "Manage notifications and subscription")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("vendor.settings.store_profile", "Store profile")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("providers.name", "Name")}</span>
              <span className="font-semibold">{provider?.name || "--"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("providers.type", "Type")}</span>
              <span>{provider?.type ? t(`providers.types.${provider.type}`, provider.type) : "--"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("providers.contactPhone", "Contact phone")}</span>
              <span dir="ltr">{provider?.contactPhone || "--"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("providers.contactEmail", "Contact email")}</span>
              <span>{provider?.contactEmail || "--"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("vendor.settings.plan", "Subscription")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("billing.plan", "Plan")}</span>
              <span className="font-semibold">{subscription?.plan?.name || "--"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("billing.status", "Status")}</span>
              <Badge variant="outline">{subscription?.status || "--"}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("billing.amount", "Amount")}</span>
              <span>{fmtCurrency(subscription?.plan?.amountCents ?? 0, currency, i18n.language)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("billing.commission", "Commission")}</span>
              <span>{((subscription?.plan?.commissionRateBps ?? 0) / 100).toFixed(2)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("billing.periodEnd", "Renewal date")}</span>
              <span>{formatDate(subscription?.currentPeriodEnd)}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.location.assign("mailto:support@fasket.com")}>
              {t("vendor.settings.upgrade", "Upgrade or change plan")}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("vendor.settings.notifications", "Notifications")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {prefs ? (
            <>
              {(["newOrders", "payoutSuccess", "subscriptionExpiry"] as const).map((key) => (
                <div key={key} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{t(`vendor.settings.pref.${key}`, key)}</p>
                      <p className="text-xs text-muted-foreground">
                        {t(`vendor.settings.pref.${key}_hint`, "")}
                      </p>
                    </div>
                    <Badge variant="outline">{t("vendor.settings.channels", "Channels")}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-6">
                    {(["email", "sms", "push"] as const).map((channel) => (
                      <div key={channel} className="flex items-center gap-2">
                        <Switch
                          checked={prefs[key][channel]}
                          onCheckedChange={() => togglePref(key, channel)}
                        />
                        <span>{t(`vendor.settings.${channel}`, channel.toUpperCase())}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex justify-end">
                <Button onClick={savePrefs} disabled={updateMutation.isPending}>
                  {updateMutation.isPending
                    ? t("common.saving", "Saving...")
                    : t("vendor.settings.save", "Save preferences")}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">{t("vendor.settings.no_prefs", "No preferences found")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
