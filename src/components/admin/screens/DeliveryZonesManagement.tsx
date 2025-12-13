import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type FieldError, type Resolver } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Switch } from "../../ui/switch";
import { Badge } from "../../ui/badge";
import { AdminTableSkeleton } from "../common/AdminTableSkeleton";
import { EmptyState } from "../common/EmptyState";
import { ErrorState } from "../common/ErrorState";
import { useCreateZone, useDeliveryZone, useDeliveryZones, useUpdateZone } from "../../../hooks/api/useDeliveryZones";
import type { DeliveryZoneFilters, DeliveryZonePayload } from "../../../types/zones";
import { useDebounce } from "../../../hooks/useDebounce";
import { toast } from "sonner";
import { getAdminErrorMessage } from "../../../lib/errors";
import { fmtEGP } from "../../../lib/money";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DELIVERY_ZONES_QUERY_KEY } from "../../../hooks/api/useDeliveryZones";
import { deleteDeliveryZone } from "../../../services/deliveryZones.service";

const zoneSchema = z
  .object({
    nameEn: z.string().trim().min(2, { message: "validation.required" }),
    nameAr: z.string().optional(),
    city: z.string().optional(),
    region: z.string().optional(),
    feeCents: z.coerce.number({ required_error: "validation.required" }),
    etaMinutes: z.coerce.number().nullable().optional(),
    freeDeliveryThresholdCents: z.coerce.number().nullable().optional(),
    minOrderAmountCents: z.coerce.number().nullable().optional(),
    isActive: z.boolean().default(true),
  })
  .superRefine((val, ctx) => {
    const numericFields: Array<keyof typeof val> = [
      "feeCents",
      "etaMinutes",
      "freeDeliveryThresholdCents",
      "minOrderAmountCents",
    ];
    numericFields.forEach((field) => {
      const value = val[field];
      if (value != null && value < 0) {
        ctx.addIssue({ code: "custom", path: [field], message: "validation.nonNegative" });
      }
    });
  });

type ZoneFormValues = z.infer<typeof zoneSchema>;

export function DeliveryZonesManagement() {
  const location = useLocation();
  const navigate = useNavigate();
  const segments = location.pathname.split("/").filter(Boolean);
  const isZoneRoute = segments[0] === "settings" && segments[1] === "delivery-zones";
  const isCreate = isZoneRoute && segments[2] === "create";
  const isEdit = isZoneRoute && segments[3] === "edit";
  const editingId = isEdit ? segments[2] : undefined;

  if (isCreate || isEdit) {
    return (
      <ZoneFormPage
        mode={isCreate ? "create" : "edit"}
        zoneId={editingId}
        onDone={() => navigate("/settings/delivery-zones")}
      />
    );
  }

  return (
    <ZoneListPage
      onCreate={() => navigate("/settings/delivery-zones/create")}
      onEdit={(id) => navigate(`/settings/delivery-zones/${id}/edit`)}
    />
  );
}

type ZoneListPageProps = {
  onCreate: () => void;
  onEdit: (id: string) => void;
};

function ZoneListPage({ onCreate, onEdit }: ZoneListPageProps) {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const debouncedSearch = useDebounce(search, 300);
  const filters = useMemo<DeliveryZoneFilters>(
    () => ({
      search: debouncedSearch || undefined,
      isActive: isActiveFilter === "all" ? undefined : isActiveFilter === "active",
      page,
      pageSize,
    }),
    [debouncedSearch, isActiveFilter, page, pageSize]
  );

  const zonesQuery = useDeliveryZones(filters);
  const queryClient = useQueryClient();
  const deleteZoneMut = useMutation({
    mutationFn: (zoneId: string) => deleteDeliveryZone(zoneId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DELIVERY_ZONES_QUERY_KEY }),
  });

  const zones = zonesQuery.data?.items || [];
  const total = zonesQuery.data?.total || 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const dirClass = i18n.language === "ar" ? "text-right" : "text-left";

  const confirmDelete = async (id: string) => {
    try {
      await deleteZoneMut.mutateAsync(id);
      toast.success(t("zones.deleted", "Zone removed"));
    } catch (error) {
      toast.error(getAdminErrorMessage(error, t));
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("zones.title", "Delivery Zones")}</h1>
          <p className="text-muted-foreground">{t("zones.subtitle", "Manage fees and coverage areas")}</p>
        </div>
        <Button onClick={onCreate}>{t("zones.create", "New zone")}</Button>
      </div>

      <Card>
        <CardContent className="space-y-3 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder={t("common.search_placeholder", "Search")}
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
            <div className="flex items-center gap-2">
              <Badge
                variant={isActiveFilter === "all" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => {
                  setPage(1);
                  setIsActiveFilter("all");
                }}
              >
                {t("common.all", "All")}
              </Badge>
              <Badge
                variant={isActiveFilter === "active" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => {
                  setPage(1);
                  setIsActiveFilter("active");
                }}
              >
                {t("drivers.active", "Active")}
              </Badge>
              <Badge
                variant={isActiveFilter === "inactive" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => {
                  setPage(1);
                  setIsActiveFilter("inactive");
                }}
              >
                {t("drivers.inactive", "Inactive")}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {zonesQuery.isLoading ? (
        <AdminTableSkeleton rows={4} columns={5} />
      ) : zonesQuery.isError ? (
        <ErrorState
          message={getAdminErrorMessage(zonesQuery.error, t, t("zones.loadError", "Unable to load delivery zones"))}
          onRetry={() => zonesQuery.refetch()}
        />
      ) : zones.length === 0 ? (
        <EmptyState
          title={t("zones.emptyTitle", "No zones created")}
          description={t("zones.emptyDesc", "Define delivery zones to control fees")}
          action={<Button onClick={onCreate}>{t("zones.create", "New zone")}</Button>}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={dirClass}>{t("zones.name", "Name")}</TableHead>
                    <TableHead className={dirClass}>{t("zones.city", "City/Region")}</TableHead>
                    <TableHead className={dirClass}>{t("zones.deliveryFee", "Delivery fee")}</TableHead>
                    <TableHead className={dirClass}>{t("zones.freeThreshold", "Free delivery threshold")}</TableHead>
                    <TableHead className={dirClass}>{t("zones.minOrder", "Min order")}</TableHead>
                    <TableHead>{t("zones.status", "Status")}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zones.map((zone) => (
                    <TableRow key={zone.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{zone.nameEn}</span>
                          {zone.nameAr && <span className="text-xs text-muted-foreground">{zone.nameAr}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{zone.city || "-"}</span>
                          {zone.region && <span className="text-xs text-muted-foreground">{zone.region}</span>}
                        </div>
                      </TableCell>
                      <TableCell>{fmtEGP(zone.feeCents)}</TableCell>
                      <TableCell>
                        {zone.freeDeliveryThresholdCents != null ? fmtEGP(zone.freeDeliveryThresholdCents) : "-"}
                      </TableCell>
                      <TableCell>
                        {zone.minOrderAmountCents != null ? fmtEGP(zone.minOrderAmountCents) : t("zones.none", "None")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={zone.isActive ? "outline" : "secondary"}>
                          {zone.isActive ? t("drivers.active", "Active") : t("drivers.inactive", "Inactive")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => onEdit(zone.id)}>
                            {t("common.edit", "Edit")}
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => confirmDelete(zone.id)}>
                            {t("common.delete", "Delete")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
              <div>
                {t("common.pagination.label", { defaultValue: "Page {{page}} of {{count}}", page, count: pageCount })}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  {t("common.prev", "Prev")}
                </Button>
                <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>
                  {t("common.next", "Next")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

type ZoneFormPageProps = {
  mode: "create" | "edit";
  zoneId?: string;
  onDone: () => void;
};

function ZoneFormPage({ mode, zoneId, onDone }: ZoneFormPageProps) {
  const { t } = useTranslation();
  const createZone = useCreateZone();
  const updateZone = useUpdateZone(zoneId || "");
  const zoneQuery = useDeliveryZone(zoneId, { enabled: mode === "edit" });
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<ZoneFormValues>({
    resolver: zodResolver(zoneSchema) as Resolver<ZoneFormValues>,
    defaultValues: {
      nameEn: "",
      nameAr: "",
      city: "",
      region: "",
      feeCents: 0,
      etaMinutes: null,
      freeDeliveryThresholdCents: 0,
      minOrderAmountCents: 0,
      isActive: true,
    },
  });

  const requiredMark = <span className="text-rose-500">*</span>;
  const renderError = (error?: FieldError) =>
    error?.message ? <p className="text-sm text-red-500">{t(error.message, { defaultValue: error.message })}</p> : null;

  React.useEffect(() => {
    if (!zoneQuery.data || mode !== "edit") return;
    const z = zoneQuery.data;
    form.reset({
      nameEn: z.nameEn,
      nameAr: z.nameAr || "",
      city: z.city || "",
      region: z.region || "",
      feeCents: z.feeCents ?? Math.round(z.fee * 100),
      etaMinutes: z.etaMinutes ?? null,
      freeDeliveryThresholdCents: z.freeDeliveryThresholdCents ?? 0,
      minOrderAmountCents: z.minOrderAmountCents ?? 0,
      isActive: z.isActive,
    });
  }, [zoneQuery.data, mode, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    const computedFeeCents = Math.round(values.feeCents);
    const payload: DeliveryZonePayload = {
      nameEn: values.nameEn.trim(),
      nameAr: values.nameAr?.trim() || undefined,
      city: values.city?.trim() || undefined,
      region: values.region?.trim() || undefined,
      feeCents: computedFeeCents,
      etaMinutes: values.etaMinutes != null ? Math.round(values.etaMinutes) : undefined,
      freeDeliveryThresholdCents:
        values.freeDeliveryThresholdCents != null ? Math.round(values.freeDeliveryThresholdCents) : undefined,
      minOrderAmountCents:
        values.minOrderAmountCents != null ? Math.round(values.minOrderAmountCents) : undefined,
      isActive: values.isActive,
    };
    try {
      if (mode === "create") {
        await createZone.mutateAsync(payload);
      } else if (zoneId) {
        await updateZone.mutateAsync(payload);
      }
      await queryClient.invalidateQueries({ queryKey: DELIVERY_ZONES_QUERY_KEY });
      toast.success(t("zones.saved", "Zone saved"));
      onDone();
    } catch (error) {
      toast.error(getAdminErrorMessage(error, t));
    } finally {
      setSubmitting(false);
    }
  });

  if (mode === "edit" && zoneQuery.isLoading) {
    return (
      <div className="p-6">
        <AdminTableSkeleton rows={3} columns={3} />
      </div>
    );
  }

  if (mode === "edit" && zoneQuery.isError) {
    return (
      <div className="p-6">
        <ErrorState
          message={getAdminErrorMessage(zoneQuery.error, t, t("zones.loadError", "Unable to load zone"))}
          onRetry={() => zoneQuery.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>
            {mode === "create" ? t("zones.create", "New zone") : t("zones.edit", "Edit zone")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  {t("zones.name", "Zone name (EN)")} {requiredMark}
                </Label>
                <Input {...form.register("nameEn")} placeholder={t("zones.name", "Zone name (EN)")} />
                {renderError(form.formState.errors.nameEn)}
              </div>
              <div className="space-y-2">
                <Label>{t("zones.nameAr", "Zone name (AR)")}</Label>
                <Input {...form.register("nameAr")} />
              </div>
              <div className="space-y-2">
                <Label>{t("zones.city", "City / region")}</Label>
                <Input {...form.register("city")} />
                {renderError(form.formState.errors.city as FieldError)}
              </div>
              <div className="space-y-2">
                <Label>{t("zones.region", "Area / district (optional)")}</Label>
                <Input {...form.register("region")} />
              </div>
              <div className="space-y-2">
                <Label>
                  {t("zones.deliveryFee", "Delivery fee (cents)")} {requiredMark}
                </Label>
                <Input type="number" min={0} step={50} {...form.register("feeCents", { valueAsNumber: true })} />
                {renderError(form.formState.errors.feeCents as FieldError)}
              </div>
              <div className="space-y-2">
                <Label>{t("zones.freeThreshold", "Free delivery threshold (cents)")}</Label>
                <Input
                  type="number"
                  min={0}
                  step={50}
                  {...form.register("freeDeliveryThresholdCents", { valueAsNumber: true })}
                />
                {renderError(form.formState.errors.freeDeliveryThresholdCents as FieldError)}
              </div>
              <div className="space-y-2">
                <Label>{t("zones.minOrder", "Minimum order (cents)")}</Label>
                <Input
                  type="number"
                  min={0}
                  step={50}
                  {...form.register("minOrderAmountCents", { valueAsNumber: true })}
                />
                {renderError(form.formState.errors.minOrderAmountCents as FieldError)}
              </div>
              <div className="space-y-2">
                <Label>{t("zones.etaMinutes", "ETA (minutes)")}</Label>
                <Input
                  type="number"
                  min={0}
                  step={5}
                  {...form.register("etaMinutes", { valueAsNumber: true })}
                />
                {renderError(form.formState.errors.etaMinutes as FieldError)}
              </div>
              <div className="flex items-center justify-between md:col-span-2 border rounded-lg p-3">
                <div>
                  <p className="font-medium">{t("zones.active", "Active")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("zones.activeHint", "Inactive zones will not be offered at checkout")}
                  </p>
                </div>
                <Switch checked={form.watch("isActive")} onCheckedChange={(checked) => form.setValue("isActive", checked)} />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={onDone}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t("common.saving", "Saving...") : t("common.save", "Save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
