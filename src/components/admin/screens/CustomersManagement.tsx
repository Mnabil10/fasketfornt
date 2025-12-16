import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getCustomer, setCustomerRole, resetCustomerPassword, Customer, deleteCustomer } from "../../../services/customers.service";
import { fmtEGP } from "../../../lib/money";

// shadcn/ui
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Separator } from "../../ui/separator";
import { toast } from "sonner";
import { useAuth } from "../../../auth/AuthProvider";
import { useCustomersAdmin, CUSTOMERS_QUERY_KEY } from "../../../hooks/api/useCustomersAdmin";
import { getAdminErrorMessage } from "../../../lib/errors";
import { AdminTableSkeleton } from "../../admin/common/AdminTableSkeleton";
import { EmptyState } from "../../admin/common/EmptyState";
import { ErrorState } from "../../admin/common/ErrorState";
import { useDebounce } from "../../../hooks/useDebounce";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { useSearchParams } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../ui/alert-dialog";

// Icons
import { Search, Phone, Mail, MapPin, Calendar, Users, Trash2 } from "lucide-react";

type CustomerDetail = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  createdAt?: string;
  // from backend detail (as per your first file usage)
  addresses?: Array<{ id: string; label?: string; city?: string; street?: string }>;
  orders?: Array<{ id: string; createdAt: string; totalCents: number }>;
};

export function CustomersManagement() {
  const { t } = useTranslation();
  const { isAdmin, isStaff } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // filters & pagination (kept logic)
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const customersQuery = useCustomersAdmin(
    {
      q: debouncedQ.trim().length >= 2 ? debouncedQ.trim() : undefined,
      page,
      pageSize,
    },
    { enabled: true }
  );
  const items = customersQuery.data?.items ?? [];
  const total = customersQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // detail
  const [selected, setSelected] = useState<CustomerDetail | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    const qParam = searchParams.get("q") || "";
    const pageParam = Number(searchParams.get("page") || 1);
    const sizeParam = Number(searchParams.get("pageSize") || 20);
    setQ(qParam);
    setPage(Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1);
    setPageSize(Number.isFinite(sizeParam) && sizeParam > 0 ? sizeParam : 20);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (page > 1) params.set("page", String(page));
    if (pageSize !== 20) params.set("pageSize", String(pageSize));
    setSearchParams(params, { replace: true });
  }, [q, page, pageSize, setSearchParams]);

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: "CUSTOMER" | "ADMIN" | "STAFF" }) => setCustomerRole(id, role),
    onSuccess: async (_data, variables) => {
      toast.success(t("customers.roleUpdated", "Role updated"));
      await queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
      try {
        const detail = (await getCustomer(variables.id)) as CustomerDetail;
        setSelected(detail);
      } catch {
        // ignore detail reload errors
      }
    },
    onError: (error) =>
      toast.error(getAdminErrorMessage(error, t, t("customers.roleUpdateFailed", "Unable to update role"))),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => resetCustomerPassword(id, password),
    onSuccess: () => {
      toast.success(t("customers.passwordReset", "Password reset"));
      setResetOpen(false);
      setPwd("");
      setPwd2("");
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
    },
    onError: (error) => toast.error(getAdminErrorMessage(error, t, t("customers.resetFailed", "Unable to reset password"))),
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: (id: string) => deleteCustomer(id),
    onSuccess: async (_data, id) => {
      toast.success(t("customers.deleted", "Customer deleted"));
      await queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
      if (selected?.id === id) {
        setSelected(null);
      }
    },
    onError: (error) =>
      toast.error(getAdminErrorMessage(error, t, t("customers.deleteFailed", "Unable to delete customer"))),
  });

  async function open(id: string) {
    setDetailError(null);
    setDetailLoading(true);
    try {
      const detail = (await getCustomer(id)) as CustomerDetail;
      setSelected(detail);
    } catch (e: unknown) {
      setDetailError(getAdminErrorMessage(e, t, t("customers.loadError", "Unable to load customers")));
    } finally {
      setDetailLoading(false);
    }
  }

  async function changeRole(role: "CUSTOMER" | "ADMIN" | "STAFF") {
    if (!selected) return;
    await updateRoleMutation.mutateAsync({ id: selected.id, role });
  }

  // simple stats from current page (no extra API)
  const pageStats = useMemo(() => {
    const totalCustomers = items.length;
    // “new this month” based on createdAt (if present)
    const now = new Date();
    const newThisMonth = items.filter((c) => {
      if (!c.createdAt) return false;
      const d = new Date(c.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return { totalCustomers, newThisMonth };
  }, [items]);

  function initials(name?: string) {
    if (!name) return "CU";
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase() ?? "")
      .join("");
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-poppins text-3xl text-gray-900" style={{ fontWeight: 700 }}>
            {t("customers.title") || "Customers Management"}
          </h1>
          <p className="text-gray-600 mt-1">
            {t("common.viewDetails") || "Manage and view customer information"}
          </p>
        </div>
      </div>

      {/* Stats Cards (current page snapshot) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t("app.table.total")}</p>
                <p className="text-2xl font-bold text-gray-900">{pageStats.totalCustomers}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t("dashboard.recentOrders")}</p>
                <p className="text-2xl font-bold text-gray-900">{pageStats.newThisMonth}</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t("filters.searchPlaceholder")}</p>
                <p className="text-2xl font-bold text-gray-900">{q ? 1 : 0}</p>
              </div>
              <Search className="w-8 h-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative w-full min-w-[220px] md:flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={t("filters.searchPlaceholder") || "Search customers..."}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
                onKeyDown={(e) => {
                  if (e.key === "Enter") setPage(1);
                }}
              />
            </div>
            <Select value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setPage(1); }}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={t("common.page_size", "Page size")} />
              </SelectTrigger>
              <SelectContent>
                {[20, 50, 100].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} / {t("common.page", "page")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setPage(1);
                customersQuery.refetch();
              }}
              disabled={customersQuery.isFetching}
            >
              {t("app.actions.search")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t("customers.title")} ({total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {customersQuery.isLoading ? (
              <AdminTableSkeleton rows={5} columns={5} />
            ) : customersQuery.isError ? (
              <ErrorState
                message={getAdminErrorMessage(customersQuery.error, t, t("customers.loadError", "Unable to load customers"))}
                onRetry={() => customersQuery.refetch()}
              />
            ) : items.length === 0 ? (
              <EmptyState
                title={t("customers.emptyTitle") || "No customers yet"}
                description={t("customers.emptyDescription") || "Invite users or adjust filters."}
                action={
                  <Button size="sm" variant="outline" onClick={() => customersQuery.refetch()}>
                    {t("app.actions.retry")}
                  </Button>
                }
              />
            ) : (
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("customers.name")}</TableHead>
                    <TableHead>{t("customers.phone")}</TableHead>
                    <TableHead>{t("customers.email")}</TableHead>
                    <TableHead>{t("customers.createdAt")}</TableHead>
                    <TableHead className="text-right">{t("app.actions.title") || "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-white font-medium text-sm">{initials(c.name)}</span>
                          </div>
                          <div>
                            <p className="font-medium">{c.name}</p>
                            <p className="text-xs text-gray-500">ID: {c.id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span>{c.phone || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="w-3 h-3 text-gray-400" />
                          <span>{c.email || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString("ar-EG") : "-"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" onClick={() => open(c.id)}>
                            {t("common.manage", "Manage")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              open(c.id).then(() => setResetOpen(true));
                            }}
                          >
                            {t("resetPassword", "Reset Password")}
                          </Button>
                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled={deleteCustomerMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  {t("app.actions.delete")}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t("customers.deleteTitle", "Delete customer")}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t(
                                      "customers.deleteConfirm",
                                      "This will permanently remove the customer if they have no orders. This cannot be undone.",
                                    )}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel disabled={deleteCustomerMutation.isPending}>
                                    {t("app.actions.cancel")}
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteCustomerMutation.mutate(c.id)}
                                    disabled={deleteCustomerMutation.isPending}
                                  >
                                    {deleteCustomerMutation.isPending
                                      ? t("app.loading", "Loading...")
                                      : t("app.actions.delete")}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:justify-end mt-4">
            <div className="text-sm text-gray-600">
              {t("common.pagination.summary", "{{from}}-{{to}} of {{total}}", {
                from: (page - 1) * pageSize + 1,
                to: Math.min(page * pageSize, total),
                total,
              })}
            </div>
            <div className="flex gap-3 sm:order-2 sm:justify-end">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t("app.actions.prev")}
              </Button>
              <Button
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("app.actions.next")}
              </Button>
            </div>
            <span className="text-sm text-gray-600 sm:order-1">
              {t("app.table.page")} {page} {t("app.table.of")} {totalPages}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Customer Details Modal */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[80vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {t("customers.title")} : {selected?.name}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">{t("common.profile") || "Overview"}</TabsTrigger>
                <TabsTrigger value="orders">{t("customers.orders")}</TabsTrigger>
                <TabsTrigger value="addresses">{t("customers.addresses")}</TabsTrigger>
              </TabsList>

              {/* Overview */}
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">{t("customers.title")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-600" />
                          <span className="font-medium">{selected.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">Role:</span>
                          <select
                            className="border rounded px-2 py-1 text-xs"
                            value={(selected as any).role || 'CUSTOMER'}
                            onChange={(e) => changeRole(e.target.value as any)}
                          >
                            <option value="CUSTOMER">CUSTOMER</option>
                            <option value="STAFF">STAFF</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-600" />
                        <span>{selected.email || "-"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-600" />
                        <span>{selected.phone || "-"}</span>
                      </div>
                      {selected.createdAt && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-600" />
                          <span>
                            {t("customers.createdAt")}:{" "}
                            {new Date(selected.createdAt).toLocaleDateString("ar-EG")}
                          </span>
                        </div>
                      )}
                      {(isAdmin || isStaff) && (
                        <div className="pt-2">
                          <Button variant="outline" onClick={() => setResetOpen(true)}>
                            {t("resetPassword", "Reset Password")}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">{t("orders.title")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>{t("app.table.total")}:</span>
                        <span className="font-medium">{selected.orders?.length || 0}</span>
                      </div>
                      <Separator />
                      <div className="space-y-1">
                        {(selected.orders || []).slice(0, 3).map((o) => (
                          <div key={o.id} className="flex items-center justify-between">
                            <span className="font-mono">{o.id}</span>
                            <span className="text-gray-600">{new Date(o.createdAt).toLocaleString("ar-EG")}</span>
                            <span className="font-medium">{fmtEGP(o.totalCents)}</span>
                          </div>
                        ))}
                        {(!selected.orders || selected.orders.length === 0) && (
                          <span className="text-gray-500">{t("app.table.noData")}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Orders */}
              <TabsContent value="orders" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("customers.orders")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {detailError ? (
                      <ErrorState message={detailError} onRetry={() => open(selected.id)} />
                    ) : detailLoading && (!selected.orders || !selected.orders.length) ? (
                      <AdminTableSkeleton rows={3} columns={3} />
                    ) : selected.orders && selected.orders.length ? (
                      <Table className="min-w-[760px]">
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("dashboard.orderId")}</TableHead>
                            <TableHead>{t("dashboard.createdAt")}</TableHead>
                            <TableHead>{t("dashboard.total")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selected.orders.map((o) => (
                            <TableRow key={o.id}>
                              <TableCell className="font-mono">{o.id}</TableCell>
                              <TableCell>{new Date(o.createdAt).toLocaleString("ar-EG")}</TableCell>
                              <TableCell className="font-medium">{fmtEGP(o.totalCents)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <EmptyState
                        title={t("customers.noOrders", "No orders yet")}
                        description={t("customers.noOrdersDescription", "This customer has no orders on file.")}
                        action={
                          <Button size="sm" variant="outline" onClick={() => open(selected.id)}>
                            {t("app.actions.refresh", "Refresh")}
                          </Button>
                        }
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

                           {/* Addresses */}
              <TabsContent value="addresses" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("customers.addresses")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {detailError ? (
                        <ErrorState message={detailError} onRetry={() => open(selected.id)} />
                      ) : detailLoading && (!selected.addresses || !selected.addresses.length) ? (
                        <AdminTableSkeleton rows={2} columns={2} />
                      ) : selected.addresses && selected.addresses.length ? (
                        selected.addresses.map((a) => (
                          <div key={a.id} className="p-3 border rounded-lg text-sm">
                            <div className="flex items-center gap-2 mb-1">
                              <MapPin className="w-4 h-4 text-gray-600" />
                              <span className="font-medium">{a.label || t("customers.addresses")}</span>
                            </div>
                            <p className="text-gray-700">
                              {a.city ? `${a.city} - ` : ""}{a.street || ""}
                            </p>
                          </div>
                        ))
                      ) : (
                        <EmptyState
                          title={t("customers.noAddresses", "No addresses")}
                          description={t("customers.noAddressesDescription", "No saved addresses for this customer.")}
                          action={
                            <Button size="sm" variant="outline" onClick={() => open(selected.id)}>
                              {t("app.actions.refresh", "Refresh")}
                            </Button>
                          }
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-md w-[95vw]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t("resetPassword", "Reset Password")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1">{t("newPassword", "New Password")}</label>
              <Input
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("customers.passwordHint", "Use at least 6 characters with numbers/letters.")}
              </p>
            </div>
            <div>
              <label className="block text-sm mb-1">{t("confirm_password", "Confirm Password")}</label>
              <Input
                type="password"
                value={pwd2}
                onChange={(e) => setPwd2(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1"
                disabled={resetPasswordMutation.isPending || !selected}
                onClick={async () => {
                  if (!selected) return;
                  if ((pwd || "").length < 6) {
                    toast.error(t("passwordTooShort", "Password must be at least 6 characters"));
                    return;
                  }
                  if (pwd !== pwd2) {
                    toast.error(t("passwordMismatch", "Passwords do not match"));
                    return;
                  }
                  if (!selected.id) return;
                  await resetPasswordMutation.mutateAsync({ id: selected.id, password: pwd });
                }}
              >
                {resetPasswordMutation.isPending
                  ? t("app.loading", "Loading...")
                  : t("resetPassword", "Reset Password")}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setResetOpen(false)}
                disabled={resetPasswordMutation.isPending}
              >
                {t("app.actions.cancel", "Cancel")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


