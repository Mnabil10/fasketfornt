import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getCustomer, setCustomerRole, resetCustomerPassword, Customer } from "../../../services/customers.service";
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
import { getApiErrorMessage } from "../../../lib/errors";
import { AdminTableSkeleton } from "../../admin/common/AdminTableSkeleton";
import { EmptyState } from "../../admin/common/EmptyState";
import { ErrorState } from "../../admin/common/ErrorState";

// Icons
import { Search, Eye, Phone, Mail, MapPin, Calendar, Users } from "lucide-react";

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

  // filters & pagination (kept logic)
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const customersQuery = useCustomersAdmin(
    {
      q: q.trim() || undefined,
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
      toast.error(getApiErrorMessage(error, t("customers.roleUpdateFailed", "Unable to update role"))),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => resetCustomerPassword(id, password),
    onSuccess: () => {
      toast.success(t("customers.passwordReset", "Password reset"));
      setResetOpen(false);
      setPwd("");
      setPwd2("");
    },
    onError: (error) => toast.error(getApiErrorMessage(error, t("customers.resetFailed", "Unable to reset password"))),
  });

  async function open(id: string) {
    const detail = (await getCustomer(id)) as CustomerDetail;
    setSelected(detail);
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
      <div className="flex items-center justify-between">
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
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={t("filters.searchPlaceholder") || "Search customers..."}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-10"
                onKeyDown={(e) => {
                  if (e.key === "Enter") setPage(1);
                }}
              />
            </div>
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
                message={t("customers.loadError") || "Unable to load customers"}
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
                        <Button variant="ghost" size="sm" onClick={() => open(c.id)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center gap-3 justify-end mt-4">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {t("app.actions.prev")}
            </Button>
            <span className="text-sm text-gray-600">
              {t("app.table.page")} {page} {t("app.table.of")} {totalPages}
            </span>
            <Button
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("app.actions.next")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Customer Details Modal */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" aria-describedby={undefined}>
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
                    {selected.orders && selected.orders.length ? (
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
                      <div className="text-sm text-gray-600">{t("app.table.noData")}</div>
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
                      {selected.addresses && selected.addresses.length ? (
                        selected.addresses.map((a) => (
                          <div key={a.id} className="p-3 border rounded-lg text-sm">
                            <div className="flex items-center gap-2 mb-1">
                              <MapPin className="w-4 h-4 text-gray-600" />
                              <span className="font-medium">{a.label || t("customers.addresses")}</span>
                            </div>
                            <p className="text-gray-700">
                              {a.city ? `${a.city} — ` : ""}{a.street || ""}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-gray-600">{t("app.table.noData")}</div>
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
        <DialogContent className="max-w-md" aria-describedby={undefined}>
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






