import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useDebounce } from "../../../hooks/useDebounce";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { AdminTableSkeleton } from "../common/AdminTableSkeleton";
import { EmptyState } from "../common/EmptyState";
import { ErrorState } from "../common/ErrorState";
import { DriverTable } from "./DeliveryDrivers/DriverTable";
import { DriverForm, type DriverFormValues } from "./DeliveryDrivers/DriverForm";
import {
  useCreateDeliveryDriver,
  useDeliveryDriver,
  useDeliveryDrivers,
  useUpdateDeliveryDriver,
} from "../../../hooks/api/useDeliveryDrivers";
import { getAdminErrorMessage } from "../../../lib/errors";
import { toast } from "sonner";
import type { DeliveryDriverFilters, DeliveryDriverPayload, DriverVehiclePayload } from "../../../types/delivery";
import { saveDeliveryDriverVehicle, updateDeliveryDriverStatus } from "../../../services/deliveryDrivers.service";
import { DELIVERY_DRIVERS_QUERY_KEY } from "../../../hooks/api/useDeliveryDrivers";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "../../ui/badge";
import { Filter } from "lucide-react";

export function DeliveryDriversManagement() {
  const location = useLocation();
  const navigate = useNavigate();
  const segments = location.pathname.split("/").filter(Boolean);
  const isDriverRoute = segments[0] === "delivery-drivers";
  const isCreate = isDriverRoute && segments[1] === "create";
  const isEdit = isDriverRoute && segments[2] === "edit";
  const editingId = isEdit ? segments[1] ?? segments[2] : undefined;

  if (isCreate || isEdit) {
    return <DriverFormPage mode={isCreate ? "create" : "edit"} driverId={editingId} onDone={() => navigate("/delivery-drivers")} />;
  }

  return <DriverListPage onCreate={() => navigate("/delivery-drivers/create")} onEdit={(id) => navigate(`/delivery-drivers/${id}/edit`)} />;
}

type DriverListPageProps = {
  onCreate: () => void;
  onEdit: (id: string) => void;
};

function DriverListPage({ onCreate, onEdit }: DriverListPageProps) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const debouncedSearch = useDebounce(search, 300);
  const filters = useMemo<DeliveryDriverFilters>(
    () => ({
      search: debouncedSearch || undefined,
      isActive: isActiveFilter === "all" ? undefined : isActiveFilter === "active",
      page,
      pageSize,
    }),
    [debouncedSearch, isActiveFilter, page, pageSize]
  );

  const driversQuery = useDeliveryDrivers(filters);
  const queryClient = useQueryClient();
  const statusMutation = useMutation({
    mutationFn: ({ driverId, isActive }: { driverId: string; isActive: boolean }) =>
      updateDeliveryDriverStatus(driverId, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DELIVERY_DRIVERS_QUERY_KEY }),
    onError: (error) => toast.error(getAdminErrorMessage(error, t, t("drivers.statusUpdateFailed", "Failed to update driver status"))),
  });

  const toggleStatus = async (driverId: string, isActive: boolean) => {
    if (!isActive) {
      const confirmed = window.confirm(
        t("drivers.disableConfirm", "Disable this driver? They will stop receiving assignments.")
      );
      if (!confirmed) return;
    }
    await statusMutation.mutateAsync({ driverId, isActive });
  };

  const items = driversQuery.data?.items || [];
  const total = driversQuery.data?.total || 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    const qParam = searchParams.get("q") || "";
    const statusParam = (searchParams.get("status") as "all" | "active" | "inactive" | null) || "all";
    const pageParam = Number(searchParams.get("page") || 1);
    const sizeParam = Number(searchParams.get("pageSize") || 20);
    setSearch(qParam);
    setIsActiveFilter(statusParam);
    setPage(Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1);
    setPageSize(Number.isFinite(sizeParam) && sizeParam > 0 ? sizeParam : 20);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (isActiveFilter !== "all") params.set("status", isActiveFilter);
    if (page > 1) params.set("page", String(page));
    if (pageSize !== 20) params.set("pageSize", String(pageSize));
    setSearchParams(params, { replace: true });
  }, [search, isActiveFilter, page, pageSize, setSearchParams]);

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("drivers.title", "Delivery Drivers")}</h1>
          <p className="text-muted-foreground">{t("drivers.subtitle", "Manage delivery fleet and vehicles")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsActiveFilter("all")}>
            {t("common.resetFilters", "Reset filters")}
          </Button>
          <Button onClick={onCreate}>{t("drivers.createCta", "Add Driver")}</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            {t("common.filters", "Filters")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Input
                placeholder={t("common.search_placeholder", "Search..")}
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
              />
            </div>
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
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t("common.page_size", "Page size")}:</span>
              <Select value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setPage(1); }}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[20, 50, 100].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {driversQuery.isLoading ? (
        <AdminTableSkeleton rows={5} columns={5} />
      ) : driversQuery.isError ? (
        <ErrorState
          message={getAdminErrorMessage(driversQuery.error, t, t("drivers.loadError", "Unable to load drivers"))}
          onRetry={() => driversQuery.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title={t("drivers.emptyTitle", "No drivers yet")}
          description={t("drivers.emptyDesc", "Create a driver to assign orders")}
          action={
            <Button onClick={onCreate}>{t("drivers.createCta", "Add Driver")}</Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <DriverTable
              drivers={items}
              onToggleStatus={toggleStatus}
              onEdit={(driver) => onEdit(driver.id)}
            />
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
              <div>
                {t("common.pagination.summary", "{{from}}-{{to}} of {{total}}", {
                  from: (page - 1) * pageSize + 1,
                  to: Math.min(page * pageSize, total),
                  total,
                })}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  {t("common.prev", "Prev")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                >
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

type DriverFormPageProps = {
  mode: "create" | "edit";
  driverId?: string;
  onDone: () => void;
};

function DriverFormPage({ mode, driverId, onDone }: DriverFormPageProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const createDriver = useCreateDeliveryDriver();
  const updateDriver = useUpdateDeliveryDriver(driverId || "");
  const [submitting, setSubmitting] = useState(false);
  const driverQuery = useDeliveryDriver(driverId, { enabled: mode === "edit" });

  const normalizeImage = (value: unknown) => {
    if (!value) return null;
    if (value instanceof File || value instanceof Blob) return value;
    if (typeof value === "string") return value;
    if (typeof value === "object" && "url" in (value as any)) return (value as any).url as string;
    return null;
  };

  const normalizeLicenseUrl = (value?: string | null) => {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed || null;
  };

  const handleSubmit = async (values: DriverFormValues) => {
    setSubmitting(true);
    const color = values.color.trim();
    const loginPassword = values.loginPassword?.trim();
    const vehiclePayload: DriverVehiclePayload = {
      type: values.type || "CAR",
      plateNumber: values.plateNumber.trim(),
      color,
      licenseImageFile: values.licenseImageFile ?? null,
      licenseImageUrl: normalizeLicenseUrl(values.licenseImageUrl),
    };
    const payload: DeliveryDriverPayload = {
      fullName: values.fullName.trim(),
      phone: values.phone.trim(),
      nationalId: values.nationalId?.trim() || null,
      nationalIdImage: normalizeImage(values.nationalIdImage),
      isActive: values.isActive,
      loginPassword: loginPassword || undefined,
      vehicle: {
        type: vehiclePayload.type,
        plateNumber: vehiclePayload.plateNumber,
        color: vehiclePayload.color,
        licenseImageUrl: vehiclePayload.licenseImageUrl ?? null,
      },
    };
    try {
      const driver =
        mode === "create" ? await createDriver.mutateAsync(payload) : await updateDriver.mutateAsync(payload);
      if (driver?.id && vehiclePayload) {
        await saveDeliveryDriverVehicle(driver.id, vehiclePayload);
      }
      await queryClient.invalidateQueries({ queryKey: DELIVERY_DRIVERS_QUERY_KEY });
      toast.success(t("drivers.saved", "Driver saved"));
      onDone();
    } catch (error) {
      toast.error(getAdminErrorMessage(error, t));
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === "edit" && driverQuery.isLoading) {
    return (
      <div className="p-6">
        <AdminTableSkeleton rows={3} columns={2} />
      </div>
    );
  }

  if (mode === "edit" && driverQuery.isError) {
    return (
      <div className="p-6">
        <ErrorState
          message={getAdminErrorMessage(driverQuery.error, t, t("drivers.loadError", "Unable to load driver"))}
          onRetry={() => driverQuery.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <DriverForm
        mode={mode}
        initialData={driverQuery.data || undefined}
        onSubmit={handleSubmit}
        onCancel={onDone}
        isSubmitting={submitting}
      />
    </div>
  );
}
