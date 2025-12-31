import React, { useMemo, useState } from "react";
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
import { Switch } from "../../ui/switch";
import { Plus, Search, Edit } from "lucide-react";
import { useBranches, BRANCHES_QUERY_KEY } from "../../../hooks/api/useBranches";
import { useProviders } from "../../../hooks/api/useProviders";
import { createBranch, updateBranch } from "../../../services/branches.service";
import { fmtEGP, toCents } from "../../../lib/money";
import { getAdminErrorMessage } from "../../../lib/errors";
import { AdminTableSkeleton } from "../common/AdminTableSkeleton";
import { EmptyState } from "../common/EmptyState";
import { ErrorState } from "../common/ErrorState";
import type { Branch, BranchFilters, BranchStatus, BranchUpsertInput } from "../../../types/branch";
import type { DeliveryMode } from "../../../types/provider";
import { toast } from "sonner";

const optionalNumber = z.preprocess(
  (val) => {
    if (val === "" || val === null || val === undefined) return null;
    if (typeof val === "string") return Number(val);
    return val;
  },
  z.number({ invalid_type_error: "validation.numeric" }).nullable()
);

const branchSchema = z.object({
  providerId: z.string().min(1),
  name: z.string().min(2),
  nameAr: z.string().optional(),
  slug: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  address: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  lat: optionalNumber,
  lng: optionalNumber,
  deliveryMode: z.enum(["PLATFORM", "MERCHANT"]).optional(),
  deliveryRadiusKm: optionalNumber,
  deliveryRatePerKm: optionalNumber,
  minDeliveryFee: optionalNumber,
  maxDeliveryFee: optionalNumber,
  serviceArea: z.string().optional(),
  isDefault: z.boolean().optional(),
});

type BranchFormValues = z.infer<typeof branchSchema>;

const defaultValues: BranchFormValues = {
  providerId: "",
  name: "",
  nameAr: "",
  slug: "",
  status: "ACTIVE",
  address: "",
  city: "",
  region: "",
  lat: null,
  lng: null,
  deliveryMode: "PLATFORM",
  deliveryRadiusKm: null,
  deliveryRatePerKm: null,
  minDeliveryFee: null,
  maxDeliveryFee: null,
  serviceArea: "",
  isDefault: false,
};

const toOptionalCents = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return toCents(value);
};

export function BranchesManagement() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<BranchStatus | "all">("all");
  const [providerId, setProviderId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const isArabic = i18n.language?.startsWith("ar");

  const filters = useMemo<BranchFilters>(
    () => ({
      q: q.trim() || undefined,
      status: status === "all" ? undefined : status,
      providerId: providerId === "all" ? undefined : providerId,
      page,
      pageSize,
    }),
    [q, status, providerId, page]
  );

  const branchesQuery = useBranches(filters);
  const providersQuery = useProviders({ page: 1, pageSize: 200 }, { enabled: true });
  const providers = providersQuery.data?.items ?? [];
  const items = branchesQuery.data?.items ?? [];
  const total = branchesQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const resolveStatusLabel = (value: BranchStatus) => t(`branches.statuses.${value}`, value);
  const resolveDeliveryModeLabel = (value: DeliveryMode) => t(`common.deliveryModes.${value}`, value);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);

  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues,
  });
  const { register, handleSubmit, reset, control, formState } = form;
  const { errors } = formState;

  const upsertMutation = useMutation({
    mutationFn: ({ id, data }: { id?: string; data: BranchUpsertInput }) =>
      id ? updateBranch(id, data) : createBranch(data),
    onSuccess: async (_data, variables) => {
      toast.success(
        variables.id ? t("branches.updated", "Branch updated") : t("branches.created", "Branch created")
      );
      setOpen(false);
      setEditing(null);
      reset(defaultValues);
      await queryClient.invalidateQueries({ queryKey: BRANCHES_QUERY_KEY });
    },
    onError: (error) => toast.error(getAdminErrorMessage(error, t, t("branches.saveFailed", "Unable to save branch"))),
  });

  const renderError = (message?: string) =>
    message ? <p className="text-xs text-red-600 mt-1">{t(message, { defaultValue: message })}</p> : null;

  const handleDialogChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setEditing(null);
      reset(defaultValues);
    }
  };

  const openCreate = () => {
    setEditing(null);
    reset(defaultValues);
    setOpen(true);
  };

  const openEdit = (branch: Branch) => {
    setEditing(branch);
    reset({
      providerId: branch.providerId,
      name: branch.name || "",
      nameAr: branch.nameAr || "",
      slug: branch.slug || "",
      status: branch.status,
      address: branch.address || "",
      city: branch.city || "",
      region: branch.region || "",
      lat: branch.lat ?? null,
      lng: branch.lng ?? null,
      deliveryMode: (branch.deliveryMode ?? "PLATFORM") as DeliveryMode,
      deliveryRadiusKm: branch.deliveryRadiusKm ?? null,
      deliveryRatePerKm:
        branch.deliveryRatePerKmCents != null ? branch.deliveryRatePerKmCents / 100 : null,
      minDeliveryFee: branch.minDeliveryFeeCents != null ? branch.minDeliveryFeeCents / 100 : null,
      maxDeliveryFee: branch.maxDeliveryFeeCents != null ? branch.maxDeliveryFeeCents / 100 : null,
      serviceArea: branch.serviceArea ? JSON.stringify(branch.serviceArea) : "",
      isDefault: branch.isDefault ?? false,
    });
    setOpen(true);
  };

  const onSubmit = handleSubmit(async (values) => {
    let serviceArea: Record<string, unknown> | null = null;
    if (values.serviceArea && values.serviceArea.trim()) {
      try {
        serviceArea = JSON.parse(values.serviceArea);
      } catch {
        toast.error(t("branches.invalidServiceArea", "Service area must be valid JSON."));
        return;
      }
    }

    const payload: BranchUpsertInput = {
      providerId: values.providerId,
      name: values.name.trim(),
      nameAr: values.nameAr?.trim() || null,
      slug: values.slug?.trim() || null,
      status: values.status,
      address: values.address?.trim() || null,
      city: values.city?.trim() || null,
      region: values.region?.trim() || null,
      lat: Number.isFinite(values.lat as number) ? Number(values.lat) : null,
      lng: Number.isFinite(values.lng as number) ? Number(values.lng) : null,
      deliveryMode: values.deliveryMode ?? null,
      deliveryRadiusKm: Number.isFinite(values.deliveryRadiusKm as number) ? Number(values.deliveryRadiusKm) : null,
      deliveryRatePerKmCents: toOptionalCents(values.deliveryRatePerKm),
      minDeliveryFeeCents: toOptionalCents(values.minDeliveryFee),
      maxDeliveryFeeCents: toOptionalCents(values.maxDeliveryFee),
      serviceArea,
      isDefault: values.isDefault ?? false,
    };

    await upsertMutation.mutateAsync({ id: editing?.id, data: payload });
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-poppins text-3xl text-gray-900" style={{ fontWeight: 700 }}>
            {t("branches.title", "Branches")}
          </h1>
          <p className="text-gray-600 mt-1">{t("branches.subtitle", "Manage provider branches and locations")}</p>
        </div>
        <Dialog open={open} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" onClick={openCreate}>
              <Plus className="w-4 h-4" /> {t("branches.addNew", "New Branch")}
            </Button>
          </DialogTrigger>
          <DialogContent aria-describedby={undefined} className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? t("branches.edit", "Edit Branch") : t("branches.addNew", "New Branch")}</DialogTitle>
            </DialogHeader>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={onSubmit} noValidate>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("branches.provider", "Provider")}</label>
                <Controller
                  control={control}
                  name="providerId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("branches.selectProvider", "Select provider")} />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {isArabic ? provider.nameAr || provider.name : provider.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {renderError(errors.providerId?.message)}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("branches.name", "Name")}</label>
                <Input {...register("name")} />
                {renderError(errors.name?.message)}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("branches.nameAr", "Name (AR)")}</label>
                <Input {...register("nameAr")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("branches.slug", "Slug")}</label>
                <Input {...register("slug")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("branches.status", "Status")}</label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["ACTIVE", "INACTIVE"].map((item) => (
                          <SelectItem key={item} value={item}>
                            {resolveStatusLabel(item as BranchStatus)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("branches.address", "Address")}</label>
                <Input {...register("address")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("branches.city", "City")}</label>
                <Input {...register("city")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("branches.region", "Region")}</label>
                <Input {...register("region")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("branches.deliveryMode", "Delivery mode")}</label>
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
                <label className="text-sm font-medium">{t("branches.deliveryRadius", "Delivery radius (km)")}</label>
                <Input type="number" step="0.1" {...register("deliveryRadiusKm")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("branches.ratePerKm", "Rate per km (currency)")}</label>
                <Input type="number" step="0.01" {...register("deliveryRatePerKm")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("branches.minFee", "Min delivery fee (currency)")}</label>
                <Input type="number" step="0.01" {...register("minDeliveryFee")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("branches.maxFee", "Max delivery fee (currency)")}</label>
                <Input type="number" step="0.01" {...register("maxDeliveryFee")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("branches.lat", "Latitude")}</label>
                <Input type="number" step="0.000001" {...register("lat")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("branches.lng", "Longitude")}</label>
                <Input type="number" step="0.000001" {...register("lng")} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">{t("branches.serviceArea", "Service area (GeoJSON)")}</label>
                <Textarea rows={3} {...register("serviceArea")} />
                <p className="text-xs text-muted-foreground">
                  {t("branches.serviceAreaHint", "Optional. Paste GeoJSON if needed.")}
                </p>
              </div>
              <div className="flex items-center justify-between border rounded-lg p-3 md:col-span-2">
                <div>
                  <p className="font-medium">{t("branches.default", "Default branch")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("branches.defaultHint", "Use as the fallback branch for this provider.")}
                  </p>
                </div>
                <Controller
                  control={control}
                  name="isDefault"
                  render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
                />
              </div>
              <div className="md:col-span-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
                {t("branches.mapPending", "Google Maps integration will be added once the API key is provided.")}
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
                placeholder={t("branches.search", "Search branches")}
                value={q}
                onChange={(e) => {
                  setPage(1);
                  setQ(e.target.value);
                }}
              />
            </div>
            <Select value={providerId} onValueChange={(value) => { setProviderId(value); setPage(1); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t("branches.provider", "Provider")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {isArabic ? provider.nameAr || provider.name : provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(value) => { setStatus(value as BranchStatus | "all"); setPage(1); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t("branches.status", "Status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                {["ACTIVE", "INACTIVE"].map((item) => (
                  <SelectItem key={item} value={item}>
                    {resolveStatusLabel(item as BranchStatus)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full overflow-x-auto">
            {branchesQuery.isLoading ? (
              <AdminTableSkeleton rows={5} columns={8} />
            ) : branchesQuery.isError ? (
              <ErrorState
                message={getAdminErrorMessage(branchesQuery.error, t, t("branches.loadError", "Unable to load branches"))}
                onRetry={() => branchesQuery.refetch()}
              />
            ) : items.length === 0 ? (
              <EmptyState
                title={t("branches.emptyTitle", "No branches found")}
                description={t("branches.emptyDesc", "Create a branch to get started.")}
                action={
                  <Button size="sm" variant="outline" onClick={() => branchesQuery.refetch()}>
                    {t("app.actions.retry", "Retry")}
                  </Button>
                }
              />
            ) : (
              <Table className="min-w-[950px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("branches.name", "Name")}</TableHead>
                    <TableHead>{t("branches.provider", "Provider")}</TableHead>
                    <TableHead>{t("branches.status", "Status")}</TableHead>
                    <TableHead>{t("branches.location", "Location")}</TableHead>
                    <TableHead>{t("branches.ratePerKm", "Rate/km")}</TableHead>
                    <TableHead>{t("branches.minFee", "Min")}</TableHead>
                    <TableHead>{t("branches.maxFee", "Max")}</TableHead>
                    <TableHead className="text-right">{t("app.actions.actions", "Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((branch) => (
                    <TableRow key={branch.id}>
                      <TableCell className="font-medium">
                        {(isArabic ? branch.nameAr || branch.name : branch.name)}{" "}
                        {branch.isDefault ? `(${t("branches.defaultBadge", "Default")})` : ""}
                      </TableCell>
                      <TableCell>
                        {branch.provider
                          ? (isArabic ? branch.provider.nameAr || branch.provider.name : branch.provider.name)
                          : branch.providerId}
                      </TableCell>
                      <TableCell>{resolveStatusLabel(branch.status)}</TableCell>
                      <TableCell>
                        {branch.lat != null && branch.lng != null ? `${branch.lat}, ${branch.lng}` : "-"}
                      </TableCell>
                      <TableCell>
                        {branch.deliveryRatePerKmCents != null ? fmtEGP(branch.deliveryRatePerKmCents) : "-"}
                      </TableCell>
                      <TableCell>
                        {branch.minDeliveryFeeCents != null ? fmtEGP(branch.minDeliveryFeeCents) : "-"}
                      </TableCell>
                      <TableCell>
                        {branch.maxDeliveryFeeCents != null ? fmtEGP(branch.maxDeliveryFeeCents) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" aria-label={t("branches.edit", "Edit")} onClick={() => openEdit(branch)}>
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
