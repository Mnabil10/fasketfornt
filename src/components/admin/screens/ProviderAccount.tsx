import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { fetchProviderAccount } from "../../../services/provider-account.service";
import { fmtCurrency } from "../../../lib/money";
import { ErrorState } from "../common/ErrorState";

const statusTone: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  REJECTED: "bg-red-100 text-red-700",
  SUSPENDED: "bg-rose-100 text-rose-700",
  DISABLED: "bg-gray-200 text-gray-700",
};

export function ProviderAccount() {
  const { t, i18n } = useTranslation();
  const accountQuery = useQuery({
    queryKey: ["provider-account"],
    queryFn: fetchProviderAccount,
  });

  if (accountQuery.isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">{t("app.loading", "Loading...")}</div>;
  }

  if (accountQuery.isError) {
    return (
      <ErrorState
        message={t("provider.account.load_failed", "Unable to load provider account")}
        onRetry={() => accountQuery.refetch()}
      />
    );
  }

  const provider = accountQuery.data?.provider;
  const subscription = accountQuery.data?.subscription;
  const deliveryMode = provider?.deliveryMode || "PLATFORM";
  const deliveryLabel =
    deliveryMode === "MERCHANT"
      ? t("providers.deliveryMode.MERCHANT", "Provider delivers")
      : t("providers.deliveryMode.PLATFORM", "Platform delivers");

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{t("provider.account.title", "Provider account")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("provider.account.subtitle", "Your store profile and subscription status")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("provider.account.store", "Store profile")}</CardTitle>
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
              <span className="text-muted-foreground">{t("providers.status", "Status")}</span>
              {provider?.status ? (
                <Badge className={statusTone[provider.status] || "bg-gray-200 text-gray-700"}>
                  {t(`providers.statuses.${provider.status}`, provider.status)}
                </Badge>
              ) : (
                <span>--</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("providers.deliveryMode", "Delivery")}</span>
              <span>{deliveryLabel}</span>
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{t("provider.account.plan", "Plan")}</CardTitle>
            <Button size="sm" variant="outline" onClick={() => accountQuery.refetch()}>
              {t("common.refresh", "Refresh")}
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {subscription?.plan ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("billing.plan", "Plan")}</span>
                  <span className="font-semibold">{subscription.plan.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("billing.status", "Status")}</span>
                  <Badge className="bg-slate-200 text-slate-700">
                    {t(`billing.status.${subscription.status}`, subscription.status)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("billing.amount", "Amount")}</span>
                  <span>
                    {fmtCurrency(subscription.plan.amountCents, subscription.plan.currency || "EGP", i18n.language)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("billing.interval", "Interval")}</span>
                  <span>{t(`billing.interval.${subscription.plan.billingInterval}`, subscription.plan.billingInterval)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("billing.commission", "Commission")}</span>
                  <span>{(subscription.plan.commissionRateBps ?? 0) / 100}%</span>
                </div>
                {subscription.currentPeriodEnd && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t("billing.periodEnd", "Period ends")}</span>
                    <span>{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</span>
                  </div>
                )}
                {subscription.trialEndsAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t("billing.trialEnd", "Trial ends")}</span>
                    <span>{new Date(subscription.trialEndsAt).toLocaleDateString()}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-muted-foreground">
                {t("provider.account.no_plan", "No active plan assigned yet.")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
