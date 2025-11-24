import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCoupon, updateCoupon } from "../../../services/coupons.service";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Switch } from "../../ui/switch";
import { Label } from "../../ui/label";
import { Plus, Search, Edit } from "lucide-react";
import { toast } from "sonner";
import { useCouponsAdmin, COUPONS_QUERY_KEY } from "../../../hooks/api/useCouponsAdmin";
import { getAdminErrorMessage } from "../../../lib/errors";
import { AdminTableSkeleton } from "../../admin/common/AdminTableSkeleton";
import { EmptyState } from "../../admin/common/EmptyState";
import { ErrorState } from "../../admin/common/ErrorState";
import type { Coupon, CouponFormValues, CouponUpsertInput } from "../../../types/coupon";

const optionalMoney = z
  .preprocess((val) => {
    if (val === "" || val === null || val === undefined) return null;
    if (typeof val === "string") return Number(val);
    return val;
  }, z.number({ invalid_type_error: "validation.numeric" }).min(0, { message: "validation.nonNegative" }).nullable());

const requiredMoney = z.preprocess(
  (val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    if (typeof val === "string") return Number(val);
    return val;
  },
  z
    .number({ required_error: "coupons.value_required", invalid_type_error: "validation.numeric" })
    .min(0, { message: "validation.nonNegative" })
);

const dateString = z
  .string()
  .optional()
  .transform((val) => (typeof val === "string" ? val.trim() : ""))
  .transform((val) => val || "");

const couponSchema = z.object({
  code: z.string().trim().min(1, { message: "coupons.code_required" }),
  type: z.enum(["PERCENT", "FIXED"]),
  value: requiredMoney,
  isActive: z.boolean(),
  startsAt: dateString,
  endsAt: dateString,
  minOrderCents: optionalMoney,
  maxDiscountCents: optionalMoney,
});

const defaultValues: CouponFormValues = {
  code: "",
  type: "PERCENT",
  value: 0,
  isActive: true,
  startsAt: "",
  endsAt: "",
  minOrderCents: null,
  maxDiscountCents: null,
};

export function CouponsManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const couponsQuery = useCouponsAdmin(
    {
      q: q.trim() || undefined,
      page,
      pageSize,
    },
    { enabled: true }
  );
  const items = couponsQuery.data?.items ?? [];
  const total = couponsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);

  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponSchema),
    defaultValues,
  });
  const { control, register, handleSubmit, reset, formState, watch } = form;
  const { errors } = formState;
  const selectedType = watch("type");

  const upsertCouponMutation = useMutation({
    mutationFn: ({ id, data }: { id?: string; data: CouponUpsertInput & { code: string } }) =>
      id ? updateCoupon(id, data) : createCoupon(data),
    onSuccess: async (_data, variables) => {
      toast.success(variables.id ? t("coupons.updated") || "Coupon updated" : t("coupons.created") || "Coupon created");
      setOpen(false);
      setEditing(null);
      reset(defaultValues);
      await queryClient.invalidateQueries({ queryKey: COUPONS_QUERY_KEY });
    },
    onError: (error) => toast.error(getAdminErrorMessage(error, t, t("coupons.saveFailed", "Unable to save coupon"))),
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

  function openCreate() {
    setEditing(null);
    reset(defaultValues);
    setOpen(true);
  }

  function openEdit(c: Coupon) {
    setEditing(c);
    reset({
      code: c.code || "",
      type: c.type,
      value: Number(c.valueCents ?? 0),
      isActive: !!c.isActive,
      startsAt: c.startsAt || "",
      endsAt: c.endsAt || "",
      minOrderCents: c.minOrderCents ?? null,
      maxDiscountCents: c.maxDiscountCents ?? null,
    });
    setOpen(true);
  }

  const onSubmit = handleSubmit(async (values) => {
    const payload: CouponUpsertInput & { code: string } = {
      code: values.code.trim(),
      type: values.type,
      isActive: values.isActive,
      startsAt: values.startsAt,
      endsAt: values.endsAt,
      minOrderCents: values.minOrderCents ?? null,
      maxDiscountCents: values.maxDiscountCents ?? null,
    };

    if (values.type === "PERCENT") {
      payload.percent = values.value;
    } else {
      payload.valueCents = values.value;
    }

    await upsertCouponMutation.mutateAsync({ id: editing?.id, data: payload });
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-poppins text-3xl text-gray-900" style={{ fontWeight: 700 }}>
            {t("coupons.title") || "Coupons"}
          </h1>
          <p className="text-gray-600 mt-1">{t("coupons.subtitle") || "Create and manage discount coupons"}</p>
        </div>
        <Dialog open={open} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" onClick={openCreate}>
              <Plus className="w-4 h-4" /> {t("coupons.addNew") || "New Coupon"}
            </Button>
          </DialogTrigger>
          <DialogContent aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>{editing ? t("coupons.edit", "Edit Coupon") : t("coupons.addNew", "New Coupon")}</DialogTitle>
            </DialogHeader>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={onSubmit} noValidate>
              <div className="space-y-2">
                <Label>{t("coupons.code", "Code")}</Label>
                <Input {...register("code")} />
                {renderError(errors.code?.message)}
              </div>
              <div className="space-y-2">
                <Label>{t("coupons.type", "Type")}</Label>
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERCENT">{t("coupons.percent", "PERCENT")}</SelectItem>
                        <SelectItem value="FIXED">{t("coupons.fixed", "FIXED")}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {renderError(errors.type?.message)}
              </div>
              <div className="space-y-2">
                <Label>
                  {selectedType === "PERCENT" ? t("coupons.percent", "Percent") : t("coupons.value", "Value (cents)")}
                </Label>
                <Controller
                  control={control}
                  name="value"
                  render={({ field }) => (
                    <Input inputMode="numeric" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value)} />
                  )}
                />
                {renderError(errors.value?.message)}
              </div>
              <div className="space-y-2">
                <Label>{t("coupons.active", "Active")}</Label>
                <div className="h-10 flex items-center">
                  <Controller
                    control={control}
                    name="isActive"
                    render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("coupons.startsAt", "Starts At (ISO)")}</Label>
                <Input placeholder="2025-01-01T00:00:00Z" {...register("startsAt")} />
                {renderError(errors.startsAt?.message)}
              </div>
              <div className="space-y-2">
                <Label>{t("coupons.endsAt", "Ends At (ISO)")}</Label>
                <Input placeholder="2025-12-31T23:59:59Z" {...register("endsAt")} />
                {renderError(errors.endsAt?.message)}
              </div>
              <div className="space-y-2">
                <Label>{t("coupons.minOrderCents", "Min Order (cents)")}</Label>
                <Controller
                  control={control}
                  name="minOrderCents"
                  render={({ field }) => (
                    <Input inputMode="numeric" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value)} />
                  )}
                />
                {renderError(errors.minOrderCents?.message)}
              </div>
              <div className="space-y-2">
                <Label>{t("coupons.maxDiscountCents", "Max Discount (cents)")}</Label>
                <Controller
                  control={control}
                  name="maxDiscountCents"
                  render={({ field }) => (
                    <Input inputMode="numeric" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value)} />
                  )}
                />
                {renderError(errors.maxDiscountCents?.message)}
              </div>
              <div className="flex justify-end gap-2 mt-2 col-span-1 md:col-span-2">
                <Button type="button" variant="outline" onClick={() => handleDialogChange(false)}>
                  {t("app.actions.cancel", "Cancel")}
                </Button>
                <Button type="submit" disabled={upsertCouponMutation.isPending}>
                  {upsertCouponMutation.isPending ? t("app.saving", "Saving...") : t("app.actions.save", "Save")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                className="pl-9"
                placeholder={t("coupons.searchPlaceholder", "Search code")}
                value={q}
                onChange={(e) => {
                  setPage(1);
                  setQ(e.target.value);
                }}
              />
            </div>
          </div>
          <div className="w-full overflow-x-auto">
            {couponsQuery.isLoading ? (
              <AdminTableSkeleton rows={5} columns={7} />
            ) : couponsQuery.isError ? (
              <ErrorState
                message={getAdminErrorMessage(couponsQuery.error, t, t("coupons.loadError", "Unable to load coupons"))}
                onRetry={() => couponsQuery.refetch()}
              />
            ) : items.length === 0 ? (
              <EmptyState
                title={t("coupons.emptyTitle") || "No coupons found"}
                description={t("coupons.emptyDescription") || "Create a coupon to get started."}
                action={
                  <Button size="sm" variant="outline" onClick={() => couponsQuery.refetch()}>
                    {t("app.actions.retry")}
                  </Button>
                }
              />
            ) : (
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("coupons.code", "Code")}</TableHead>
                    <TableHead>{t("coupons.type", "Type")}</TableHead>
                    <TableHead>{t("coupons.value", "Value")}</TableHead>
                    <TableHead>{t("coupons.active", "Active")}</TableHead>
                    <TableHead>{t("coupons.startsAt", "Starts")}</TableHead>
                    <TableHead>{t("coupons.endsAt", "Ends")}</TableHead>
                    <TableHead className="text-right">{t("app.actions.actions", "Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono">{c.code}</TableCell>
                      <TableCell>{c.type}</TableCell>
                      <TableCell>{c.valueCents}</TableCell>
                      <TableCell>{c.isActive ? t("app.yes", "Yes") : t("app.no", "No")}</TableCell>
                      <TableCell className="text-xs text-gray-600">{c.startsAt || "-"}</TableCell>
                      <TableCell className="text-xs text-gray-600">{c.endsAt || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" aria-label={t("coupons.edit", "Edit")} onClick={() => openEdit(c)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              {t('app.table.total') || 'Total'}: {total}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>{t('app.actions.prev','Prev')}</Button>
              <span>
                {t('app.table.page') || 'Page'} {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t('app.actions.next','Next')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
