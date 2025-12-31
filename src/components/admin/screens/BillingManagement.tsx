import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../ui/dialog";
import { Switch } from "../../ui/switch";
import { Badge } from "../../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Plus, Search, Edit, Eye } from "lucide-react";
import { usePlans, PLANS_QUERY_KEY } from "../../../hooks/api/usePlans";
import { useSubscriptions, SUBSCRIPTIONS_QUERY_KEY } from "../../../hooks/api/useSubscriptions";
import { useInvoices } from "../../../hooks/api/useInvoices";
import { useProviders } from "../../../hooks/api/useProviders";
import { createPlan, updatePlan } from "../../../services/plans.service";
import { createSubscription, updateSubscription } from "../../../services/subscriptions.service";
import { getInvoice } from "../../../services/invoices.service";
import { fmtCurrency, toCents } from "../../../lib/money";
import { getAdminErrorMessage } from "../../../lib/errors";
import { AdminTableSkeleton } from "../common/AdminTableSkeleton";
import { EmptyState } from "../common/EmptyState";
import { ErrorState } from "../common/ErrorState";
import type { BillingInterval, Plan, PlanFilters, PlanUpsertInput } from "../../../types/plan";
import type {
  ProviderSubscription,
  SubscriptionFilters,
  SubscriptionStatus,
  SubscriptionUpsertInput,
} from "../../../types/subscription";
import type { Invoice, InvoiceFilters, InvoiceStatus } from "../../../types/invoice";
import { toast } from "sonner";

const numberField = z.preprocess(
  (val) => {
    if (val === "" || val === null || val === undefined) return 0;
    if (typeof val === "string") return Number(val);
    return val;
  },
  z.number({ invalid_type_error: "validation.numeric" }).min(0)
);

const intField = z.preprocess(
  (val) => {
    if (val === "" || val === null || val === undefined) return 0;
    if (typeof val === "string") return Number(val);
    return val;
  },
  z.number({ invalid_type_error: "validation.numeric" }).int().min(0)
);

const optionalDate = z.preprocess((val) => {
  if (val === "" || val === null || val === undefined) return undefined;
  return String(val);
}, z.string().optional());

const planSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  description: z.string().optional(),
  billingInterval: z.enum(["MONTHLY", "YEARLY"]),
  amount: numberField,
  currency: z.string().optional(),
  commissionRate: numberField,
  trialDays: intField,
  isActive: z.boolean().optional(),
});

const subscriptionSchema = z.object({
  providerId: z.string().min(1),
  planId: z.string().min(1),
  status: z.enum(["AUTO", "TRIALING", "ACTIVE", "PAST_DUE", "CANCELED", "EXPIRED"]).optional(),
  currentPeriodStart: optionalDate,
  currentPeriodEnd: optionalDate,
  trialEndsAt: optionalDate,
  cancelAt: optionalDate,
  canceledAt: optionalDate,
});

type PlanFormValues = z.infer<typeof planSchema>;
type SubscriptionFormValues = z.infer<typeof subscriptionSchema>;
type SubscriptionStatusOption = SubscriptionStatus | "AUTO";

const planDefaults: PlanFormValues = {
  code: "",
  name: "",
  description: "",
  billingInterval: "MONTHLY",
  amount: 0,
  currency: "EGP",
  commissionRate: 0,
  trialDays: 0,
  isActive: true,
};

const subscriptionDefaults: SubscriptionFormValues = {
  providerId: "",
  planId: "",
  status: "AUTO",
  currentPeriodStart: "",
  currentPeriodEnd: "",
  trialEndsAt: "",
  cancelAt: "",
  canceledAt: "",
};

const toDateInput = (value?: string | null) => (value ? value.slice(0, 10) : "");
const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString() : "-");
const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString() : "-");

export function BillingManagement() {
  const { t } = useTranslation();
  const [tab, setTab] = useState("plans");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-poppins text-3xl text-gray-900" style={{ fontWeight: 700 }}>
          {t("billing.title", "Billing")}
        </h1>
        <p className="text-gray-600 mt-1">
          {t("billing.subtitle", "Manage plans, subscriptions, and invoices")}
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="plans">{t("billing.plans", "Plans")}</TabsTrigger>
          <TabsTrigger value="subscriptions">{t("billing.subscriptions", "Subscriptions")}</TabsTrigger>
          <TabsTrigger value="invoices">{t("billing.invoices", "Invoices")}</TabsTrigger>
        </TabsList>
        <TabsContent value="plans" className="mt-4">
          <PlansTab />
        </TabsContent>
        <TabsContent value="subscriptions" className="mt-4">
          <SubscriptionsTab />
        </TabsContent>
        <TabsContent value="invoices" className="mt-4">
          <InvoicesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PlansTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [interval, setInterval] = useState<BillingInterval | "all">("all");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const filters = useMemo<PlanFilters>(
    () => ({
      q: q.trim() || undefined,
      billingInterval: interval === "all" ? undefined : interval,
      isActive: status === "all" ? undefined : status === "active",
      page,
      pageSize,
    }),
    [q, interval, status, page]
  );

  const plansQuery = usePlans(filters);
  const items = plansQuery.data?.items ?? [];
  const total = plansQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: planDefaults,
  });
  const { register, handleSubmit, reset, control, formState } = form;
  const { errors } = formState;

  const upsertMutation = useMutation({
    mutationFn: ({ id, data }: { id?: string; data: PlanUpsertInput }) =>
      id ? updatePlan(id, data) : createPlan(data),
    onSuccess: async (_data, variables) => {
      toast.success(variables.id ? t("billing.planUpdated", "Plan updated") : t("billing.planCreated", "Plan created"));
      setOpen(false);
      setEditing(null);
      reset(planDefaults);
      await queryClient.invalidateQueries({ queryKey: PLANS_QUERY_KEY });
    },
    onError: (error) => toast.error(getAdminErrorMessage(error, t, t("billing.planSaveFailed", "Unable to save plan"))),
  });

  const renderError = (message?: string) =>
    message ? <p className="text-xs text-red-600 mt-1">{t(message, { defaultValue: message })}</p> : null;

  const handleDialogChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setEditing(null);
      reset(planDefaults);
    }
  };

  const openCreate = () => {
    setEditing(null);
    reset(planDefaults);
    setOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditing(plan);
    reset({
      code: plan.code,
      name: plan.name,
      description: plan.description ?? "",
      billingInterval: plan.billingInterval,
      amount: plan.amountCents != null ? plan.amountCents / 100 : 0,
      currency: plan.currency || "EGP",
      commissionRate: plan.commissionRateBps != null ? plan.commissionRateBps / 100 : 0,
      trialDays: plan.trialDays ?? 0,
      isActive: plan.isActive ?? true,
    });
    setOpen(true);
  };

  const onSubmit = handleSubmit(async (values) => {
    const payload: PlanUpsertInput = {
      code: values.code.trim(),
      name: values.name.trim(),
      description: values.description?.trim() || "",
      billingInterval: values.billingInterval,
      amountCents: toCents(values.amount),
      currency: values.currency?.trim() || "EGP",
      commissionRateBps: Math.round(values.commissionRate * 100),
      trialDays: Math.round(values.trialDays),
      isActive: values.isActive ?? true,
    };

    await upsertMutation.mutateAsync({ id: editing?.id, data: payload });
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-poppins text-2xl text-gray-900" style={{ fontWeight: 700 }}>
            {t("billing.plans", "Plans")}
          </h2>
          <p className="text-gray-600 mt-1">{t("billing.planSubtitle", "Configure subscription plans and commissions")}</p>
        </div>
        <Dialog open={open} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" onClick={openCreate}>
              <Plus className="w-4 h-4" /> {t("billing.planNew", "New plan")}
            </Button>
          </DialogTrigger>
          <DialogContent aria-describedby={undefined} className="max-w-3xl w-[95vw]">
            <DialogHeader>
              <DialogTitle>{editing ? t("billing.planEdit", "Edit plan") : t("billing.planNew", "New plan")}</DialogTitle>
            </DialogHeader>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={onSubmit} noValidate>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("billing.planCode", "Code")}</label>
                <Input {...register("code")} />
                {renderError(errors.code?.message)}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("billing.planName", "Name")}</label>
                <Input {...register("name")} />
                {renderError(errors.name?.message)}
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">{t("billing.planDescription", "Description")}</label>
                <Textarea rows={3} {...register("description")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("billing.planInterval", "Billing interval")}</label>
                <Controller
                  control={control}
                  name="billingInterval"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["MONTHLY", "YEARLY"].map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("billing.planAmount", "Amount (currency)")}</label>
                <Input type="number" step="0.01" {...register("amount")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("billing.planCurrency", "Currency")}</label>
                <Input {...register("currency")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("billing.planCommission", "Commission (%)")}</label>
                <Input type="number" step="0.01" {...register("commissionRate")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("billing.planTrial", "Trial days")}</label>
                <Input type="number" step="1" {...register("trialDays")} />
              </div>
              <div className="flex items-center justify-between border rounded-lg p-3 md:col-span-2">
                <div>
                  <p className="font-medium">{t("billing.planActive", "Active")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("billing.planActiveHint", "Controls whether providers can subscribe to this plan.")}
                  </p>
                </div>
                <Controller
                  control={control}
                  name="isActive"
                  render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
                />
              </div>
              <div className="flex justify-end gap-2 mt-2 col-span-1 md:col-span-2">
                <Button type="button" variant="outline" onClick={() => handleDialogChange(false)}>
                  {t("app.actions.cancel", "Cancel")}
                </Button>
                <Button type="submit" disabled={upsertMutation.isPending}>
                  {upsertMutation.isPending ? t("app.saving", "Saving...") : t("app.actions.save", "Save")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                className="pl-9"
                placeholder={t("billing.planSearch", "Search plans")}
                value={q}
                onChange={(e) => {
                  setPage(1);
                  setQ(e.target.value);
                }}
              />
            </div>
            <Select value={interval} onValueChange={(value) => { setInterval(value as BillingInterval | "all"); setPage(1); }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={t("billing.planInterval", "Interval")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                {["MONTHLY", "YEARLY"].map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(value) => { setStatus(value as "all" | "active" | "inactive"); setPage(1); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t("billing.planStatus", "Status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                <SelectItem value="active">{t("common.active", "Active")}</SelectItem>
                <SelectItem value="inactive">{t("common.inactive", "Inactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full overflow-x-auto">
            {plansQuery.isLoading ? (
              <AdminTableSkeleton rows={5} columns={7} />
            ) : plansQuery.isError ? (
              <ErrorState
                message={getAdminErrorMessage(plansQuery.error, t, t("billing.planLoadError", "Unable to load plans"))}
                onRetry={() => plansQuery.refetch()}
              />
            ) : items.length === 0 ? (
              <EmptyState
                title={t("billing.planEmptyTitle", "No plans found")}
                description={t("billing.planEmptyDesc", "Create a plan to start charging providers.")}
                action={
                  <Button size="sm" variant="outline" onClick={() => plansQuery.refetch()}>
                    {t("app.actions.retry", "Retry")}
                  </Button>
                }
              />
            ) : (
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("billing.planName", "Plan")}</TableHead>
                    <TableHead>{t("billing.planInterval", "Interval")}</TableHead>
                    <TableHead>{t("billing.planAmount", "Amount")}</TableHead>
                    <TableHead>{t("billing.planCommission", "Commission")}</TableHead>
                    <TableHead>{t("billing.planTrial", "Trial")}</TableHead>
                    <TableHead>{t("billing.planStatus", "Status")}</TableHead>
                    <TableHead className="text-right">{t("app.actions.actions", "Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{plan.name}</span>
                          <span className="text-xs text-muted-foreground">{plan.code}</span>
                        </div>
                      </TableCell>
                      <TableCell>{plan.billingInterval}</TableCell>
                      <TableCell>{fmtCurrency(plan.amountCents, plan.currency || "EGP")}</TableCell>
                      <TableCell>{(plan.commissionRateBps / 100).toFixed(2)}%</TableCell>
                      <TableCell>{plan.trialDays} {t("billing.days", "days")}</TableCell>
                      <TableCell>
                        <Badge className={plan.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}>
                          {plan.isActive ? t("common.active", "Active") : t("common.inactive", "Inactive")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" aria-label={t("billing.planEdit", "Edit plan")} onClick={() => openEdit(plan)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600">
            <span>
              {t("app.table.total", "Total")} {total}
            </span>
            <div className="flex items-center gap-2 sm:justify-end">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                {t("app.actions.prev", "Prev")}
              </Button>
              <span>
                {t("app.table.page", "Page")} {page} / {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                {t("app.actions.next", "Next")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SubscriptionsTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [providerId, setProviderId] = useState<string>("all");
  const [planId, setPlanId] = useState<string>("all");
  const [status, setStatus] = useState<SubscriptionStatus | "all">("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const providersQuery = useProviders({ page: 1, pageSize: 200 }, { enabled: true });
  const plansListQuery = usePlans({ page: 1, pageSize: 200 }, { enabled: true });

  const providers = providersQuery.data?.items ?? [];
  const plans = plansListQuery.data?.items ?? [];

  const filters = useMemo<SubscriptionFilters>(
    () => ({
      providerId: providerId === "all" ? undefined : providerId,
      planId: planId === "all" ? undefined : planId,
      status: status === "all" ? undefined : status,
      page,
      pageSize,
    }),
    [providerId, planId, status, page]
  );

  const subscriptionsQuery = useSubscriptions(filters);
  const items = subscriptionsQuery.data?.items ?? [];
  const total = subscriptionsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProviderSubscription | null>(null);

  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: subscriptionDefaults,
  });
  const { register, handleSubmit, reset, control, formState } = form;
  const { errors } = formState;

  const upsertMutation = useMutation({
    mutationFn: ({ id, data }: { id?: string; data: SubscriptionUpsertInput }) =>
      id ? updateSubscription(id, data) : createSubscription(data),
    onSuccess: async (_data, variables) => {
      toast.success(
        variables.id ? t("billing.subscriptionUpdated", "Subscription updated") : t("billing.subscriptionCreated", "Subscription created")
      );
      setOpen(false);
      setEditing(null);
      reset(subscriptionDefaults);
      await queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_QUERY_KEY });
    },
    onError: (error) =>
      toast.error(getAdminErrorMessage(error, t, t("billing.subscriptionSaveFailed", "Unable to save subscription"))),
  });

  const renderError = (message?: string) =>
    message ? <p className="text-xs text-red-600 mt-1">{t(message, { defaultValue: message })}</p> : null;

  const handleDialogChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setEditing(null);
      reset(subscriptionDefaults);
    }
  };

  const openCreate = () => {
    setEditing(null);
    reset(subscriptionDefaults);
    setOpen(true);
  };

  const openEdit = (subscription: ProviderSubscription) => {
    setEditing(subscription);
    reset({
      providerId: subscription.providerId,
      planId: subscription.planId,
      status: subscription.status,
      currentPeriodStart: toDateInput(subscription.currentPeriodStart),
      currentPeriodEnd: toDateInput(subscription.currentPeriodEnd),
      trialEndsAt: toDateInput(subscription.trialEndsAt),
      cancelAt: toDateInput(subscription.cancelAt),
      canceledAt: toDateInput(subscription.canceledAt),
    });
    setOpen(true);
  };

  const onSubmit = handleSubmit(async (values) => {
    const statusValue = values.status && values.status !== "AUTO" ? values.status : undefined;
    const payload: SubscriptionUpsertInput = {
      providerId: values.providerId,
      planId: values.planId,
      ...(statusValue ? { status: statusValue } : {}),
      ...(values.currentPeriodStart ? { currentPeriodStart: values.currentPeriodStart } : {}),
      ...(values.currentPeriodEnd ? { currentPeriodEnd: values.currentPeriodEnd } : {}),
      ...(values.trialEndsAt ? { trialEndsAt: values.trialEndsAt } : {}),
      ...(values.cancelAt ? { cancelAt: values.cancelAt } : {}),
      ...(values.canceledAt ? { canceledAt: values.canceledAt } : {}),
    };

    await upsertMutation.mutateAsync({ id: editing?.id, data: payload });
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-poppins text-2xl text-gray-900" style={{ fontWeight: 700 }}>
            {t("billing.subscriptions", "Subscriptions")}
          </h2>
          <p className="text-gray-600 mt-1">{t("billing.subscriptionSubtitle", "Assign plans to providers")}</p>
        </div>
        <Dialog open={open} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" onClick={openCreate}>
              <Plus className="w-4 h-4" /> {t("billing.subscriptionNew", "New subscription")}
            </Button>
          </DialogTrigger>
          <DialogContent aria-describedby={undefined} className="max-w-4xl w-[95vw]">
            <DialogHeader>
              <DialogTitle>
                {editing ? t("billing.subscriptionEdit", "Edit subscription") : t("billing.subscriptionNew", "New subscription")}
              </DialogTitle>
            </DialogHeader>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={onSubmit} noValidate>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("billing.subscriptionProvider", "Provider")}</label>
                <Controller
                  control={control}
                  name="providerId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("billing.subscriptionSelectProvider", "Select provider")} />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {renderError(errors.providerId?.message)}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("billing.subscriptionPlan", "Plan")}</label>
                <Controller
                  control={control}
                  name="planId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("billing.subscriptionSelectPlan", "Select plan")} />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name} ({plan.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {renderError(errors.planId?.message)}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("billing.subscriptionStatus", "Status")}</label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={(field.value as SubscriptionStatusOption) || "AUTO"} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AUTO">{t("billing.subscriptionAuto", "Auto (plan default)")}</SelectItem>
                        {["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED", "EXPIRED"].map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("billing.subscriptionPeriodStart", "Period start")}</label>
                <Input type="date" {...register("currentPeriodStart")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("billing.subscriptionPeriodEnd", "Period end")}</label>
                <Input type="date" {...register("currentPeriodEnd")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("billing.subscriptionTrialEnds", "Trial ends")}</label>
                <Input type="date" {...register("trialEndsAt")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("billing.subscriptionCancelAt", "Cancel at")}</label>
                <Input type="date" {...register("cancelAt")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("billing.subscriptionCanceledAt", "Canceled at")}</label>
                <Input type="date" {...register("canceledAt")} />
              </div>
              <div className="flex justify-end gap-2 mt-2 col-span-1 md:col-span-2">
                <Button type="button" variant="outline" onClick={() => handleDialogChange(false)}>
                  {t("app.actions.cancel", "Cancel")}
                </Button>
                <Button type="submit" disabled={upsertMutation.isPending}>
                  {upsertMutation.isPending ? t("app.saving", "Saving...") : t("app.actions.save", "Save")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select value={providerId} onValueChange={(value) => { setProviderId(value); setPage(1); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t("billing.subscriptionProvider", "Provider")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={planId} onValueChange={(value) => { setPlanId(value); setPage(1); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t("billing.subscriptionPlan", "Plan")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(value) => { setStatus(value as SubscriptionStatus | "all"); setPage(1); }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={t("billing.subscriptionStatus", "Status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                {["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED", "EXPIRED"].map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full overflow-x-auto">
            {subscriptionsQuery.isLoading ? (
              <AdminTableSkeleton rows={5} columns={6} />
            ) : subscriptionsQuery.isError ? (
              <ErrorState
                message={getAdminErrorMessage(
                  subscriptionsQuery.error,
                  t,
                  t("billing.subscriptionLoadError", "Unable to load subscriptions")
                )}
                onRetry={() => subscriptionsQuery.refetch()}
              />
            ) : items.length === 0 ? (
              <EmptyState
                title={t("billing.subscriptionEmptyTitle", "No subscriptions found")}
                description={t("billing.subscriptionEmptyDesc", "Assign a plan to a provider to get started.")}
                action={
                  <Button size="sm" variant="outline" onClick={() => subscriptionsQuery.refetch()}>
                    {t("app.actions.retry", "Retry")}
                  </Button>
                }
              />
            ) : (
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("billing.subscriptionProvider", "Provider")}</TableHead>
                    <TableHead>{t("billing.subscriptionPlan", "Plan")}</TableHead>
                    <TableHead>{t("billing.subscriptionStatus", "Status")}</TableHead>
                    <TableHead>{t("billing.subscriptionPeriod", "Period")}</TableHead>
                    <TableHead>{t("billing.subscriptionTrialEnds", "Trial ends")}</TableHead>
                    <TableHead className="text-right">{t("app.actions.actions", "Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell className="font-medium">
                        {subscription.provider?.name ?? subscription.providerId}
                      </TableCell>
                      <TableCell>{subscription.plan?.name ?? subscription.planId}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{subscription.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {subscription.currentPeriodStart && subscription.currentPeriodEnd
                          ? `${formatDate(subscription.currentPeriodStart)} → ${formatDate(subscription.currentPeriodEnd)}`
                          : "-"}
                      </TableCell>
                      <TableCell>{formatDate(subscription.trialEndsAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={t("billing.subscriptionEdit", "Edit subscription")}
                          onClick={() => openEdit(subscription)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600">
            <span>
              {t("app.table.total", "Total")} {total}
            </span>
            <div className="flex items-center gap-2 sm:justify-end">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                {t("app.actions.prev", "Prev")}
              </Button>
              <span>
                {t("app.table.page", "Page")} {page} / {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                {t("app.actions.next", "Next")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InvoicesTab() {
  const { t } = useTranslation();
  const [providerId, setProviderId] = useState<string>("all");
  const [status, setStatus] = useState<InvoiceStatus | "all">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const providersQuery = useProviders({ page: 1, pageSize: 200 }, { enabled: true });
  const providers = providersQuery.data?.items ?? [];

  const filters = useMemo<InvoiceFilters>(
    () => ({
      providerId: providerId === "all" ? undefined : providerId,
      status: status === "all" ? undefined : status,
      from: from || undefined,
      to: to || undefined,
      page,
      pageSize,
    }),
    [providerId, status, from, to, page]
  );

  const invoicesQuery = useInvoices(filters);
  const items = invoicesQuery.data?.items ?? [];
  const total = invoicesQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const invoiceDetailsQuery = useQuery({
    queryKey: ["admin-invoice", selectedInvoice?.id],
    queryFn: () => getInvoice(selectedInvoice!.id),
    enabled: detailsOpen && !!selectedInvoice?.id,
  });
  const detailCurrency = invoiceDetailsQuery.data?.currency || "EGP";

  const openInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDetailsOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-poppins text-2xl text-gray-900" style={{ fontWeight: 700 }}>
            {t("billing.invoices", "Invoices")}
          </h2>
          <p className="text-gray-600 mt-1">{t("billing.invoiceSubtitle", "Track charges and commission invoices")}</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <Select value={providerId} onValueChange={(value) => { setProviderId(value); setPage(1); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t("billing.invoiceProvider", "Provider")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(value) => { setStatus(value as InvoiceStatus | "all"); setPage(1); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t("billing.invoiceStatus", "Status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                {["DRAFT", "OPEN", "PAID", "VOID"].map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
              />
              <span className="text-sm text-muted-foreground">→</span>
              <Input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            {invoicesQuery.isLoading ? (
              <AdminTableSkeleton rows={5} columns={7} />
            ) : invoicesQuery.isError ? (
              <ErrorState
                message={getAdminErrorMessage(invoicesQuery.error, t, t("billing.invoiceLoadError", "Unable to load invoices"))}
                onRetry={() => invoicesQuery.refetch()}
              />
            ) : items.length === 0 ? (
              <EmptyState
                title={t("billing.invoiceEmptyTitle", "No invoices found")}
                description={t("billing.invoiceEmptyDesc", "Invoices will appear after subscriptions are billed.")}
                action={
                  <Button size="sm" variant="outline" onClick={() => invoicesQuery.refetch()}>
                    {t("app.actions.retry", "Retry")}
                  </Button>
                }
              />
            ) : (
              <Table className="min-w-[950px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("billing.invoiceNumber", "Invoice")}</TableHead>
                    <TableHead>{t("billing.invoiceProvider", "Provider")}</TableHead>
                    <TableHead>{t("billing.invoiceStatus", "Status")}</TableHead>
                    <TableHead>{t("billing.invoiceAmountDue", "Amount due")}</TableHead>
                    <TableHead>{t("billing.invoiceAmountPaid", "Paid")}</TableHead>
                    <TableHead>{t("billing.invoicePeriod", "Period")}</TableHead>
                    <TableHead className="text-right">{t("app.actions.actions", "Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.number}</TableCell>
                      <TableCell>{invoice.provider?.name ?? invoice.providerId}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{invoice.status}</Badge>
                      </TableCell>
                      <TableCell>{fmtCurrency(invoice.amountDueCents, invoice.currency || "EGP")}</TableCell>
                      <TableCell>{fmtCurrency(invoice.amountPaidCents, invoice.currency || "EGP")}</TableCell>
                      <TableCell>
                        {invoice.periodStart && invoice.periodEnd
                          ? `${formatDate(invoice.periodStart)} → ${formatDate(invoice.periodEnd)}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" aria-label={t("billing.invoiceView", "View invoice")} onClick={() => openInvoice(invoice)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600">
            <span>
              {t("app.table.total", "Total")} {total}
            </span>
            <div className="flex items-center gap-2 sm:justify-end">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                {t("app.actions.prev", "Prev")}
              </Button>
              <span>
                {t("app.table.page", "Page")} {page} / {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                {t("app.actions.next", "Next")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={(nextOpen) => { setDetailsOpen(nextOpen); if (!nextOpen) setSelectedInvoice(null); }}>
        <DialogContent aria-describedby={undefined} className="max-w-4xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>{t("billing.invoiceDetails", "Invoice details")}</DialogTitle>
          </DialogHeader>
          {invoiceDetailsQuery.isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">{t("app.loading", "Loading...")}</div>
          ) : invoiceDetailsQuery.isError ? (
            <ErrorState
              message={getAdminErrorMessage(invoiceDetailsQuery.error, t, t("billing.invoiceLoadError", "Unable to load invoice"))}
              onRetry={() => invoiceDetailsQuery.refetch()}
            />
          ) : invoiceDetailsQuery.data ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">{t("billing.invoiceNumber", "Invoice")}</p>
                  <p className="font-medium">{invoiceDetailsQuery.data.number}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">{t("billing.invoiceStatus", "Status")}</p>
                  <Badge variant="outline">{invoiceDetailsQuery.data.status}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">{t("billing.invoiceProvider", "Provider")}</p>
                  <p className="font-medium">{invoiceDetailsQuery.data.provider?.name ?? invoiceDetailsQuery.data.providerId}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">{t("billing.invoicePlan", "Plan")}</p>
                  <p className="font-medium">
                    {invoiceDetailsQuery.data.subscription?.plan?.name ?? "-"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">{t("billing.invoiceAmountDue", "Amount due")}</p>
                  <p className="font-medium">{fmtCurrency(invoiceDetailsQuery.data.amountDueCents, detailCurrency)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">{t("billing.invoiceAmountPaid", "Paid")}</p>
                  <p className="font-medium">{fmtCurrency(invoiceDetailsQuery.data.amountPaidCents, detailCurrency)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">{t("billing.invoiceDueAt", "Due at")}</p>
                  <p className="font-medium">{formatDateTime(invoiceDetailsQuery.data.dueAt)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">{t("billing.invoicePaidAt", "Paid at")}</p>
                  <p className="font-medium">{formatDateTime(invoiceDetailsQuery.data.paidAt)}</p>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">{t("billing.invoiceItems", "Invoice items")}</h3>
                {invoiceDetailsQuery.data.items?.length ? (
                  <Table className="min-w-[600px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("billing.invoiceItemType", "Type")}</TableHead>
                        <TableHead>{t("billing.invoiceItemDescription", "Description")}</TableHead>
                        <TableHead className="text-right">{t("billing.invoiceItemAmount", "Amount")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceDetailsQuery.data.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.type}</TableCell>
                          <TableCell>{item.description || "-"}</TableCell>
                          <TableCell className="text-right">{fmtCurrency(item.amountCents, detailCurrency)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("billing.invoiceNoItems", "No items")}</p>
                )}
              </div>

              <div>
                <h3 className="font-medium mb-2">{t("billing.invoiceLedger", "Ledger entries")}</h3>
                {invoiceDetailsQuery.data.ledgerEntries?.length ? (
                  <Table className="min-w-[600px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("billing.invoiceLedgerType", "Type")}</TableHead>
                        <TableHead>{t("billing.invoiceLedgerOrder", "Order")}</TableHead>
                        <TableHead>{t("billing.invoiceLedgerGroup", "Group")}</TableHead>
                        <TableHead className="text-right">{t("billing.invoiceLedgerAmount", "Amount")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceDetailsQuery.data.ledgerEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>{entry.type}</TableCell>
                          <TableCell>{entry.orderId ?? "-"}</TableCell>
                          <TableCell>{entry.orderGroupId ?? "-"}</TableCell>
                          <TableCell className="text-right">{fmtCurrency(entry.amountCents, detailCurrency)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("billing.invoiceNoLedger", "No ledger entries")}</p>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
