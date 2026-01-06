import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Badge } from "../../ui/badge";
import { Textarea } from "../../ui/textarea";
import { Search, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useProviderApplications, PROVIDER_APPLICATIONS_QUERY_KEY } from "../../../hooks/api/useProviderApplications";
import { usePlans } from "../../../hooks/api/usePlans";
import { getProviderApplication, approveProviderApplication, rejectProviderApplication } from "../../../services/provider-applications.service";
import { getAdminErrorMessage } from "../../../lib/errors";
import { AdminTableSkeleton } from "../common/AdminTableSkeleton";
import { EmptyState } from "../common/EmptyState";
import { ErrorState } from "../common/ErrorState";
import type { DeliveryMode, ProviderType } from "../../../types/provider";
import type {
  ProviderApplication,
  ProviderApplicationFilters,
  ProviderApplicationStatus,
} from "../../../types/provider-application";
import { fmtEGP, toCents } from "../../../lib/money";

type ApprovalFormState = {
  planId: string;
  commissionRatePercent: string;
  branchName: string;
  branchCity: string;
  branchRegion: string;
  branchAddress: string;
  deliveryRadiusKm: string;
  deliveryRatePerKm: string;
  minFee: string;
  maxFee: string;
  deliveryMode: DeliveryMode;
};

const defaultApprovalForm: ApprovalFormState = {
  planId: "",
  commissionRatePercent: "",
  branchName: "Main Branch",
  branchCity: "",
  branchRegion: "",
  branchAddress: "",
  deliveryRadiusKm: "",
  deliveryRatePerKm: "",
  minFee: "",
  maxFee: "",
  deliveryMode: "PLATFORM",
};

const parseOptionalNumber = (value: string) => {
  if (!value.trim()) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export function ProviderApplicationsManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ProviderApplicationStatus | "all">("all");
  const [type, setType] = useState<ProviderType | "all">("all");
  const [city, setCity] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const filters = useMemo<ProviderApplicationFilters>(
    () => ({
      q: q.trim() || undefined,
      status: status === "all" ? undefined : status,
      type: type === "all" ? undefined : type,
      city: city.trim() || undefined,
      page,
      pageSize,
    }),
    [q, status, type, city, page]
  );

  const applicationsQuery = useProviderApplications(filters);
  const items = applicationsQuery.data?.items ?? [];
  const total = applicationsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [approvalForm, setApprovalForm] = useState<ApprovalFormState>(defaultApprovalForm);

  const detailQuery = useQuery({
    queryKey: [...PROVIDER_APPLICATIONS_QUERY_KEY, "detail", selectedId],
    queryFn: () => (selectedId ? getProviderApplication(selectedId) : null),
    enabled: Boolean(selectedId),
  });

  const plansQuery = usePlans({ page: 1, pageSize: 200, isActive: true }, { enabled: detailOpen });
  const plans = plansQuery.data?.items ?? [];

  useEffect(() => {
    if (!detailQuery.data) return;
    setApprovalForm((prev) => ({
      ...prev,
      branchCity: detailQuery.data.city ?? "",
      branchRegion: detailQuery.data.region ?? "",
      deliveryMode: (detailQuery.data.deliveryMode ?? "PLATFORM") as DeliveryMode,
    }));
  }, [detailQuery.data]);

  useEffect(() => {
    if (detailOpen) return;
    setSelectedId(null);
    setApprovalForm(defaultApprovalForm);
    setRejectReason("");
  }, [detailOpen]);

  useEffect(() => {
    if (approvalForm.planId || !plans.length) return;
    setApprovalForm((prev) => ({ ...prev, planId: plans[0].id }));
  }, [plans.length]);

  const approveMutation = useMutation({
    mutationFn: (payload: { id: string; data: any }) => approveProviderApplication(payload.id, payload.data),
    onSuccess: () => {
      toast.success(t("providerApplications.approved", "Application approved"));
      queryClient.invalidateQueries({ queryKey: PROVIDER_APPLICATIONS_QUERY_KEY });
      detailQuery.refetch();
      setDetailOpen(false);
    },
    onError: (error) =>
      toast.error(getAdminErrorMessage(error, t, t("providerApplications.loadError", "Unable to load applications"))),
  });

  const rejectMutation = useMutation({
    mutationFn: (payload: { id: string; data: { reason?: string | null } }) => rejectProviderApplication(payload.id, payload.data),
    onSuccess: () => {
      toast.success(t("providerApplications.rejected", "Application rejected"));
      queryClient.invalidateQueries({ queryKey: PROVIDER_APPLICATIONS_QUERY_KEY });
      detailQuery.refetch();
      setRejectOpen(false);
      setDetailOpen(false);
      setRejectReason("");
    },
    onError: (error) =>
      toast.error(getAdminErrorMessage(error, t, t("providerApplications.loadError", "Unable to load applications"))),
  });

  const openDetail = (app: ProviderApplication) => {
    setSelectedId(app.id);
    setDetailOpen(true);
  };

  const onApprove = () => {
    if (!selectedId) return;
    if (!approvalForm.planId) {
      toast.error(t("providerApplications.planPlaceholder", "Select plan"));
      return;
    }
    const commissionPercent = parseOptionalNumber(approvalForm.commissionRatePercent);
    const commissionRateBpsOverride =
      commissionPercent != null ? Math.round(commissionPercent * 100) : null;

    const branchPayload = {
      name: approvalForm.branchName.trim() || undefined,
      city: approvalForm.branchCity.trim() || undefined,
      region: approvalForm.branchRegion.trim() || undefined,
      address: approvalForm.branchAddress.trim() || undefined,
      deliveryMode: approvalForm.deliveryMode,
      deliveryRadiusKm: parseOptionalNumber(approvalForm.deliveryRadiusKm),
      deliveryRatePerKmCents:
        approvalForm.deliveryRatePerKm.trim() ? toCents(Number(approvalForm.deliveryRatePerKm)) : null,
      minDeliveryFeeCents: approvalForm.minFee.trim() ? toCents(Number(approvalForm.minFee)) : null,
      maxDeliveryFeeCents: approvalForm.maxFee.trim() ? toCents(Number(approvalForm.maxFee)) : null,
    };

    approveMutation.mutate({
      id: selectedId,
      data: {
        planId: approvalForm.planId,
        commissionRateBpsOverride,
        branch: branchPayload,
      },
    });
  };

  const onReject = () => {
    if (!selectedId) return;
    rejectMutation.mutate({ id: selectedId, data: { reason: rejectReason.trim() || null } });
  };

  const statusBadge = (value: ProviderApplicationStatus) => {
    const map: Record<ProviderApplicationStatus, { color: string; label: string }> = {
      PENDING: { color: "bg-yellow-100 text-yellow-800", label: t("providerApplications.statuses.PENDING", "Pending") },
      APPROVED: { color: "bg-green-100 text-green-800", label: t("providerApplications.statuses.APPROVED", "Approved") },
      REJECTED: { color: "bg-red-100 text-red-800", label: t("providerApplications.statuses.REJECTED", "Rejected") },
    };
    return map[value];
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-poppins text-3xl text-gray-900" style={{ fontWeight: 700 }}>
          {t("providerApplications.title", "Provider Applications")}
        </h1>
        <p className="text-gray-600 mt-1">{t("providerApplications.subtitle", "Review and onboard new providers")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Search className="w-4 h-4" />
            {t("providerApplications.filters.search", "Search")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                className="pl-8"
                placeholder={t("providerApplications.filters.search", "Search by business, owner, phone")}
                value={q}
                onChange={(e) => {
                  setPage(1);
                  setQ(e.target.value);
                }}
              />
            </div>
            <Input
              placeholder={t("providerApplications.filters.city", "City")}
              value={city}
              onChange={(e) => {
                setPage(1);
                setCity(e.target.value);
              }}
            />
            <Select value={type} onValueChange={(value) => { setType(value as ProviderType | "all"); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder={t("providerApplications.filters.type", "Type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                {["SUPERMARKET", "PHARMACY", "RESTAURANT", "SERVICE", "OTHER"].map((item) => (
                  <SelectItem key={item} value={item}>
                    {t(`providers.types.${item}`, item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(value) => { setStatus(value as ProviderApplicationStatus | "all"); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder={t("providerApplications.filters.status", "Status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                {["PENDING", "APPROVED", "REJECTED"].map((item) => (
                  <SelectItem key={item} value={item}>
                    {t(`providerApplications.statuses.${item}`, item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          {applicationsQuery.isLoading ? (
            <AdminTableSkeleton rows={5} columns={6} />
          ) : applicationsQuery.isError ? (
            <ErrorState
              message={getAdminErrorMessage(applicationsQuery.error, t, t("providerApplications.loadError", "Unable to load applications"))}
              onRetry={() => applicationsQuery.refetch()}
            />
          ) : items.length === 0 ? (
            <EmptyState
              title={t("providerApplications.emptyTitle", "No applications found")}
              description={t("providerApplications.emptyDesc", "No provider applications match your filters.")}
            />
          ) : (
            <div className="w-full overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("providerApplications.businessName", "Business name")}</TableHead>
                    <TableHead>{t("providerApplications.type", "Type")}</TableHead>
                    <TableHead>{t("providerApplications.city", "City")}</TableHead>
                    <TableHead>{t("providerApplications.status", "Status")}</TableHead>
                    <TableHead>{t("providerApplications.createdAt", "Created")}</TableHead>
                    <TableHead className="text-right">{t("providerApplications.actions", "Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((app) => {
                    const badge = statusBadge(app.status);
                    return (
                      <TableRow key={app.id}>
                        <TableCell className="font-medium">{app.businessName}</TableCell>
                        <TableCell>{t(`providers.types.${app.providerType}`, app.providerType)}</TableCell>
                        <TableCell>{app.city || "-"}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${badge.color}`}>{badge.label}</span>
                        </TableCell>
                        <TableCell>{dayjs(app.createdAt).format("DD MMM YYYY")}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => openDetail(app)}>
                            {t("providerApplications.actions", "Actions")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600 mt-4">
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

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>{t("providerApplications.title", "Provider Applications")}</DialogTitle>
          </DialogHeader>
          {detailQuery.isLoading ? (
            <AdminTableSkeleton rows={4} columns={2} />
          ) : detailQuery.isError ? (
            <ErrorState
              message={getAdminErrorMessage(detailQuery.error, t)}
              onRetry={() => detailQuery.refetch()}
            />
          ) : !detailQuery.data ? (
            <EmptyState title={t("providerApplications.emptyTitle", "No applications found")} />
          ) : (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground">{t("providerApplications.businessName", "Business name")}</p>
                      <p className="font-semibold">{detailQuery.data.businessName}</p>
                    </div>
                    <Badge variant="outline">{statusBadge(detailQuery.data.status).label}</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-muted-foreground">{t("providerApplications.owner", "Owner")}</p>
                      <p>{detailQuery.data.ownerName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("providerApplications.phone", "Phone")}</p>
                      <p>{detailQuery.data.phone}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("providerApplications.email", "Email")}</p>
                      <p>{detailQuery.data.email || "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("providerApplications.type", "Type")}</p>
                      <p>{t(`providers.types.${detailQuery.data.providerType}`, detailQuery.data.providerType)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("providerApplications.city", "City")}</p>
                      <p>{detailQuery.data.city || "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("providerApplications.region", "Region")}</p>
                      <p>{detailQuery.data.region || "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("providerApplications.deliveryMode", "Delivery mode")}</p>
                      <p>{t(`common.deliveryModes.${detailQuery.data.deliveryMode}`, detailQuery.data.deliveryMode)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("providerApplications.createdAt", "Created")}</p>
                      <p>{dayjs(detailQuery.data.createdAt).format("DD MMM YYYY HH:mm")}</p>
                    </div>
                    {detailQuery.data.reviewedAt && (
                      <div>
                        <p className="text-muted-foreground">{t("providerApplications.reviewedAt", "Reviewed")}</p>
                        <p>{dayjs(detailQuery.data.reviewedAt).format("DD MMM YYYY HH:mm")}</p>
                      </div>
                    )}
                  </div>
                  {detailQuery.data.notes && (
                    <div>
                      <p className="text-muted-foreground">{t("providerApplications.notes", "Notes")}</p>
                      <p>{detailQuery.data.notes}</p>
                    </div>
                  )}
                  {detailQuery.data.rejectionReason && (
                    <div>
                      <p className="text-muted-foreground">{t("providerApplications.rejectionReason", "Rejection reason")}</p>
                      <p>{detailQuery.data.rejectionReason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {detailQuery.data.status === "PENDING" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">{t("providerApplications.approveTitle", "Approve application")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{t("providerApplications.plan", "Plan")}</label>
                        <Select value={approvalForm.planId} onValueChange={(value) => setApprovalForm((prev) => ({ ...prev, planId: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder={t("providerApplications.planPlaceholder", "Select plan")} />
                          </SelectTrigger>
                          <SelectContent>
                            {plans.map((plan) => (
                              <SelectItem key={plan.id} value={plan.id}>
                                {plan.name} ({plan.billingInterval}) - {fmtEGP(plan.amountCents)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{t("providerApplications.commissionOverride", "Commission override (%)")}</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={approvalForm.commissionRatePercent}
                          onChange={(e) => setApprovalForm((prev) => ({ ...prev, commissionRatePercent: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold">{t("providerApplications.branchTitle", "Branch setup")}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">{t("providerApplications.branchName", "Branch name")}</label>
                          <Input
                            value={approvalForm.branchName}
                            onChange={(e) => setApprovalForm((prev) => ({ ...prev, branchName: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">{t("providerApplications.branchCity", "Branch city")}</label>
                          <Input
                            value={approvalForm.branchCity}
                            onChange={(e) => setApprovalForm((prev) => ({ ...prev, branchCity: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">{t("providerApplications.branchRegion", "Branch region")}</label>
                          <Input
                            value={approvalForm.branchRegion}
                            onChange={(e) => setApprovalForm((prev) => ({ ...prev, branchRegion: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">{t("providerApplications.branchAddress", "Branch address")}</label>
                          <Input
                            value={approvalForm.branchAddress}
                            onChange={(e) => setApprovalForm((prev) => ({ ...prev, branchAddress: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">{t("providerApplications.deliveryRadiusKm", "Delivery radius (km)")}</label>
                          <Input
                            type="number"
                            step="0.1"
                            value={approvalForm.deliveryRadiusKm}
                            onChange={(e) => setApprovalForm((prev) => ({ ...prev, deliveryRadiusKm: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">{t("providerApplications.ratePerKm", "Rate per km")}</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={approvalForm.deliveryRatePerKm}
                            onChange={(e) => setApprovalForm((prev) => ({ ...prev, deliveryRatePerKm: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">{t("providerApplications.minFee", "Min delivery fee")}</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={approvalForm.minFee}
                            onChange={(e) => setApprovalForm((prev) => ({ ...prev, minFee: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">{t("providerApplications.maxFee", "Max delivery fee")}</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={approvalForm.maxFee}
                            onChange={(e) => setApprovalForm((prev) => ({ ...prev, maxFee: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setRejectOpen(true);
                        }}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        {t("providerApplications.reject", "Reject")}
                      </Button>
                      <Button onClick={onApprove} disabled={approveMutation.isPending}>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {approveMutation.isPending
                          ? t("app.saving", "Saving...")
                          : t("providerApplications.approveConfirm", "Approve and onboard")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("providerApplications.rejectTitle", "Reject application")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder={t("providerApplications.rejectionReason", "Rejection reason")}
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectOpen(false)}>
                {t("app.actions.cancel", "Cancel")}
              </Button>
              <Button variant="destructive" onClick={onReject} disabled={rejectMutation.isPending}>
                {rejectMutation.isPending
                  ? t("app.saving", "Saving...")
                  : t("providerApplications.rejectConfirm", "Reject application")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
