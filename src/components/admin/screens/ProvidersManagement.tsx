import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Plus, Search, Edit } from "lucide-react";
import { useProviders, PROVIDERS_QUERY_KEY } from "../../../hooks/api/useProviders";
import { createProvider, updateProvider } from "../../../services/providers.service";
import { uploadAdminFile } from "../../../services/uploads.service";
import { fmtEGP, toCents } from "../../../lib/money";
import { getAdminErrorMessage } from "../../../lib/errors";
import { AdminTableSkeleton } from "../common/AdminTableSkeleton";
import { EmptyState } from "../common/EmptyState";
import { ErrorState } from "../common/ErrorState";
import type { Provider, ProviderFilters, ProviderUpsertInput, ProviderStatus, ProviderType, DeliveryMode } from "../../../types/provider";
import { ImageWithFallback } from "../../figma/ImageWithFallback";
import { toast } from "sonner";

const optionalNumber = z.preprocess(
  (val) => {
    if (val === "" || val === null || val === undefined) return null;
    if (typeof val === "string") return Number(val);
    return val;
  },
  z.number({ invalid_type_error: "validation.numeric" }).min(0).nullable()
);

const providerSchema = z.object({
  name: z.string().min(2),
  nameAr: z.string().optional(),
  slug: z.string().optional(),
  type: z.enum(["SUPERMARKET", "PHARMACY", "RESTAURANT", "SERVICE", "OTHER"]),
  status: z.enum(["PENDING", "ACTIVE", "REJECTED", "SUSPENDED", "DISABLED"]),
  deliveryMode: z.enum(["PLATFORM", "MERCHANT"]).optional(),
  deliveryRatePerKm: optionalNumber,
  minDeliveryFee: optionalNumber,
  maxDeliveryFee: optionalNumber,
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  logoUrl: z.string().optional(),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
});

type ProviderFormValues = z.infer<typeof providerSchema>;

const defaultValues: ProviderFormValues = {
  name: "",
  nameAr: "",
  slug: "",
  type: "SUPERMARKET",
  status: "PENDING",
  deliveryMode: "PLATFORM",
  deliveryRatePerKm: null,
  minDeliveryFee: null,
  maxDeliveryFee: null,
  contactEmail: "",
  contactPhone: "",
  logoUrl: "",
  description: "",
  descriptionAr: "",
};

const toOptionalCents = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return toCents(value);
};

const MAX_LOGO_MB = 2;

export function ProvidersManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ProviderStatus | "all">("all");
  const [type, setType] = useState<ProviderType | "all">("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const filters = useMemo<ProviderFilters>(
    () => ({
      q: q.trim() || undefined,
      status: status === "all" ? undefined : status,
      type: type === "all" ? undefined : type,
      page,
      pageSize,
    }),
    [q, status, type, page]
  );

  const providersQuery = useProviders(filters);
  const items = providersQuery.data?.items ?? [];
  const total = providersQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const resolveTypeLabel = (value: ProviderType) => t(`providers.types.${value}`, value);
  const resolveStatusLabel = (value: ProviderStatus) => t(`providers.statuses.${value}`, value);
  const resolveDeliveryModeLabel = (value: DeliveryMode) => t(`common.deliveryModes.${value}`, value);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  const form = useForm<ProviderFormValues>({
    resolver: zodResolver(providerSchema),
    defaultValues,
  });
  const { register, handleSubmit, reset, control, formState } = form;
  const { errors } = formState;

  const upsertMutation = useMutation({
    mutationFn: async ({
      id,
      data,
      logoFile: file,
    }: {
      id?: string;
      data: ProviderUpsertInput;
      logoFile: File | null;
    }) => {
      const payload = { ...data };
      if (file) {
        const { url } = await uploadAdminFile(file);
        payload.logoUrl = url;
      }
      return id ? updateProvider(id, payload) : createProvider(payload);
    },
    onSuccess: async (_data, variables) => {
      toast.success(
        variables.id ? t("providers.updated", "Provider updated") : t("providers.created", "Provider created")
      );
      setOpen(false);
      setEditing(null);
      reset(defaultValues);
      setLogoFile(null);
      setLogoPreviewUrl(null);
      await queryClient.invalidateQueries({ queryKey: PROVIDERS_QUERY_KEY });
    },
    onError: (error) => toast.error(getAdminErrorMessage(error, t, t("providers.saveFailed", "Unable to save provider"))),
  });

  const renderError = (message?: string) =>
    message ? <p className="text-xs text-red-600 mt-1">{t(message, { defaultValue: message })}</p> : null;

  const handleDialogChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setEditing(null);
      reset(defaultValues);
      setLogoFile(null);
      setLogoPreviewUrl(null);
    }
  };

  const openCreate = () => {
    setEditing(null);
    reset(defaultValues);
    setLogoFile(null);
    setLogoPreviewUrl(null);
    setOpen(true);
  };

  const openEdit = (provider: Provider) => {
    setEditing(provider);
    reset({
      name: provider.name || "",
      nameAr: provider.nameAr || "",
      slug: provider.slug || "",
      type: provider.type,
      status: provider.status,
      deliveryMode: (provider.deliveryMode ?? "PLATFORM") as DeliveryMode,
      deliveryRatePerKm:
        provider.deliveryRatePerKmCents != null ? provider.deliveryRatePerKmCents / 100 : null,
      minDeliveryFee: provider.minDeliveryFeeCents != null ? provider.minDeliveryFeeCents / 100 : null,
      maxDeliveryFee: provider.maxDeliveryFeeCents != null ? provider.maxDeliveryFeeCents / 100 : null,
      contactEmail: provider.contactEmail || "",
      contactPhone: provider.contactPhone || "",
      logoUrl: provider.logoUrl || "",
      description: provider.description || "",
      descriptionAr: provider.descriptionAr || "",
    });
    setLogoFile(null);
    setLogoPreviewUrl(null);
    setOpen(true);
  };

  const onSubmit = handleSubmit(async (values) => {
    const payload: ProviderUpsertInput = {
      name: values.name.trim(),
      nameAr: values.nameAr?.trim() || null,
      slug: values.slug?.trim() || null,
      type: values.type,
      status: values.status,
      deliveryMode: values.deliveryMode ?? null,
      deliveryRatePerKmCents: toOptionalCents(values.deliveryRatePerKm),
      minDeliveryFeeCents: toOptionalCents(values.minDeliveryFee),
      maxDeliveryFeeCents: toOptionalCents(values.maxDeliveryFee),
      contactEmail: values.contactEmail?.trim() || null,
      contactPhone: values.contactPhone?.trim() || null,
      logoUrl: values.logoUrl?.trim() || null,
      description: values.description?.trim() || null,
      descriptionAr: values.descriptionAr?.trim() || null,
    };

    await upsertMutation.mutateAsync({ id: editing?.id, data: payload, logoFile });
  });

  useEffect(() => {
    if (!logoFile) {
      setLogoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  const handleLogoChange = (file: File | null) => {
    if (!file) {
      setLogoFile(null);
      return;
    }
    if (file.size > MAX_LOGO_MB * 1024 * 1024) {
      toast.error(t("products.upload.too_large", "File too large"));
      return;
    }
    setLogoFile(file);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-poppins text-3xl text-gray-900" style={{ fontWeight: 700 }}>
            {t("providers.title", "Providers")}
          </h1>
          <p className="text-gray-600 mt-1">{t("providers.subtitle", "Manage service providers")}</p>
        </div>
        <Dialog open={open} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" onClick={openCreate}>
              <Plus className="w-4 h-4" /> {t("providers.addNew", "New Provider")}
            </Button>
          </DialogTrigger>
          <DialogContent aria-describedby={undefined} className="max-w-4xl w-[95vw]">
            <DialogHeader>
              <DialogTitle>{editing ? t("providers.edit", "Edit Provider") : t("providers.addNew", "New Provider")}</DialogTitle>
            </DialogHeader>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={onSubmit} noValidate>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("providers.name", "Name")}</label>
                <Input {...register("name")} />
                {renderError(errors.name?.message)}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("providers.nameAr", "Name (AR)")}</label>
                <Input {...register("nameAr")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("providers.slug", "Slug")}</label>
                <Input {...register("slug")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("providers.type", "Type")}</label>
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["SUPERMARKET", "PHARMACY", "RESTAURANT", "SERVICE", "OTHER"].map((item) => (
                          <SelectItem key={item} value={item}>
                            {resolveTypeLabel(item as ProviderType)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("providers.status", "Status")}</label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["PENDING", "ACTIVE", "REJECTED", "SUSPENDED", "DISABLED"].map((item) => (
                          <SelectItem key={item} value={item}>
                            {resolveStatusLabel(item as ProviderStatus)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("providers.deliveryMode", "Delivery mode")}</label>
                <Controller
                  control={control}
                  name="deliveryMode"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["PLATFORM", "MERCHANT"].map((item) => (
                          <SelectItem key={item} value={item}>
                            {resolveDeliveryModeLabel(item as DeliveryMode)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("providers.ratePerKm", "Rate per km (currency)")}</label>
                <Input type="number" step="0.01" {...register("deliveryRatePerKm")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("providers.minFee", "Min delivery fee (currency)")}</label>
                <Input type="number" step="0.01" {...register("minDeliveryFee")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("providers.maxFee", "Max delivery fee (currency)")}</label>
                <Input type="number" step="0.01" {...register("maxDeliveryFee")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("providers.contactEmail", "Contact email")}</label>
                <Input type="email" {...register("contactEmail")} />
                {renderError(errors.contactEmail?.message)}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("providers.contactPhone", "Contact phone")}</label>
                <Input {...register("contactPhone")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("providers.logoUrl", "Logo")}</label>
                <div className="space-y-2">
                  <Input type="file" accept="image/*" onChange={(event) => handleLogoChange(event.target.files?.[0] || null)} />
                  {(logoPreviewUrl || form.watch("logoUrl")) && (
                    <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted">
                      <ImageWithFallback
                        src={logoPreviewUrl || form.watch("logoUrl") || ""}
                        alt={form.watch("name") || "logo"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setLogoFile(null);
                      form.setValue("logoUrl", "");
                    }}
                  >
                    {t("app.actions.clear", "Clear")}
                  </Button>
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">{t("providers.description", "Description")}</label>
                <Textarea rows={3} {...register("description")} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">{t("providers.descriptionAr", "Description (AR)")}</label>
                <Textarea rows={3} {...register("descriptionAr")} />
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
                placeholder={t("providers.search", "Search providers")}
                value={q}
                onChange={(e) => {
                  setPage(1);
                  setQ(e.target.value);
                }}
              />
            </div>
            <Select value={type} onValueChange={(value) => { setType(value as ProviderType | "all"); setPage(1); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t("providers.type", "Type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                {["SUPERMARKET", "PHARMACY", "RESTAURANT", "SERVICE", "OTHER"].map((item) => (
                  <SelectItem key={item} value={item}>
                    {resolveTypeLabel(item as ProviderType)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(value) => { setStatus(value as ProviderStatus | "all"); setPage(1); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t("providers.status", "Status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                {["PENDING", "ACTIVE", "REJECTED", "SUSPENDED", "DISABLED"].map((item) => (
                  <SelectItem key={item} value={item}>
                    {resolveStatusLabel(item as ProviderStatus)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full overflow-x-auto">
            {providersQuery.isLoading ? (
              <AdminTableSkeleton rows={5} columns={7} />
            ) : providersQuery.isError ? (
              <ErrorState
                message={getAdminErrorMessage(providersQuery.error, t, t("providers.loadError", "Unable to load providers"))}
                onRetry={() => providersQuery.refetch()}
              />
            ) : items.length === 0 ? (
              <EmptyState
                title={t("providers.emptyTitle", "No providers found")}
                description={t("providers.emptyDesc", "Create a provider to get started.")}
                action={
                  <Button size="sm" variant="outline" onClick={() => providersQuery.refetch()}>
                    {t("app.actions.retry", "Retry")}
                  </Button>
                }
              />
            ) : (
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("providers.name", "Name")}</TableHead>
                    <TableHead>{t("providers.type", "Type")}</TableHead>
                    <TableHead>{t("providers.status", "Status")}</TableHead>
                    <TableHead>{t("providers.deliveryMode", "Delivery mode")}</TableHead>
                    <TableHead>{t("providers.ratePerKm", "Rate/km")}</TableHead>
                    <TableHead>{t("providers.minFee", "Min")}</TableHead>
                    <TableHead>{t("providers.maxFee", "Max")}</TableHead>
                    <TableHead className="text-right">{t("app.actions.actions", "Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((provider) => (
                    <TableRow key={provider.id}>
                      <TableCell className="font-medium">{provider.name}</TableCell>
                      <TableCell>{resolveTypeLabel(provider.type)}</TableCell>
                      <TableCell>{resolveStatusLabel(provider.status)}</TableCell>
                      <TableCell>{provider.deliveryMode ? resolveDeliveryModeLabel(provider.deliveryMode) : "-"}</TableCell>
                      <TableCell>
                        {provider.deliveryRatePerKmCents != null ? fmtEGP(provider.deliveryRatePerKmCents) : "-"}
                      </TableCell>
                      <TableCell>
                        {provider.minDeliveryFeeCents != null ? fmtEGP(provider.minDeliveryFeeCents) : "-"}
                      </TableCell>
                      <TableCell>
                        {provider.maxDeliveryFeeCents != null ? fmtEGP(provider.maxDeliveryFeeCents) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" aria-label={t("providers.edit", "Edit")} onClick={() => openEdit(provider)}>
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
