import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  Category,
} from "../../../services/categories.service";

// UI (shadcn)
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Badge } from "../../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
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
import { Plus, Search, Edit, Trash2, Image as ImageIcon } from "lucide-react";
import { ImageWithFallback } from "../../figma/ImageWithFallback";
import { toast } from "sonner";
import { useAuth } from "../../../auth/AuthProvider";
const MAX_FILE_MB = 10;

// ------------------- Helpers (kept from your first file) -------------------
function toSlug(str: string) {
  const arabicMap: Record<string, string> = {
    "٠": "0",
    "١": "1",
    "٢": "2",
    "٣": "3",
    "٤": "4",
    "٥": "5",
    "٦": "6",
    "٧": "7",
    "٨": "8",
    "٩": "9",
  };
  const normalized = (str || "")
    .trim()
    .toLowerCase()
    .replace(/[\u0660-\u0669]/g, (d) => arabicMap[d] ?? d);
  return normalized
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
function isValidSlug(s: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length <= 64;
}

// ------------------- Component -------------------
export function CategoriesManagement() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();

  // table state (from first file)
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [items, setItems] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);

  // modal / form state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{
    name: string;
    nameAr?: string;
    slug: string;
    imageUrl: string;
    imageFile?: File | null;
    isActive: boolean;
    sortOrder: number;
    parentId: string | "";
  }>({
    name: "",
    nameAr: "",
    slug: "",
    imageUrl: "",
    imageFile: null,
    isActive: true,
    sortOrder: 0,
    parentId: "",
  });

  // derived: parent categories and quick lookups
  const parentCandidates = useMemo(
    () => items.filter((c) => !c.parentId),
    [items]
  );
  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    items.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [items]);

  async function load() {
    const res = await listCategories({ q: search, page, pageSize });
    setItems(res.items);
    setTotal(res.total);
  }

  useEffect(() => {
    // auto-load on search/page changes (kept behavior)
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page]);

  function openCreate() {
    setEditing(null);
    setError(null);
    setForm({
      name: "",
      slug: "",
      imageUrl: "",
      imageFile: null,
      isActive: true,
      sortOrder: 0,
      parentId: "",
    });
    setIsCreateOpen(true);
  }

  function openEdit(c: Category) {
    setEditing(c);
    setError(null);
    setForm({
      name: c.name || "",
      nameAr: c.nameAr || "",
      slug: c.slug || "",
      imageUrl: c.imageUrl || "",
      imageFile: null,
      isActive: !!c.isActive,
      sortOrder: c.sortOrder ?? 0,
      parentId: c.parentId || "",
    });
    setIsEditOpen(true);
  }

  function normalizeImageFileType(file: File): File {
    const type = (file.type || "").toLowerCase();
    let target = type;
    if (type === "image/x-png") target = "image/png";
    if (type === "image/jpg" || type === "image/pjpeg") target = "image/jpeg";
    if (!target) {
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".png")) target = "image/png";
      else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".jfif")) target = "image/jpeg";
      else if (lower.endsWith(".webp")) target = "image/webp";
    }
    if (target && target !== type) {
      return new File([file], file.name, { type: target });
    }
    return file;
  }

  // Preview URL cleanup for category image
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (form.imageFile) {
      const url = URL.createObjectURL(form.imageFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [form.imageFile]);

  function updateName(next: string) {
    setForm((prev) => ({
      ...prev,
      name: next,
      slug: prev.slug ? prev.slug : toSlug(next),
    }));
  }

  async function saveCreateOrUpdate() {
    setError(null);

    const name = (form.name || "").trim();
    let slug = (form.slug || "").trim();
    if (!slug && name) slug = toSlug(name);

    if (!name || !slug || !isValidSlug(slug)) {
      setError(
        `${t("categories.name")} / ${t("categories.slug")} ${
          t("app.notifications.error") || ""
        }`
      );
      return;
    }

    const so = Math.max(0, Math.trunc(Number(form.sortOrder || 0)));
    const payload = {
      name,
      nameAr: form.nameAr || undefined,
      slug,
      imageUrl: form.imageUrl || null,
      isActive: !!form.isActive,
      sortOrder: so,
      parentId: form.parentId ? String(form.parentId) : null,
    };

    try {
      setSaving(true);
      if (editing?.id) {
        await updateCategory(editing.id, payload, form.imageFile || null);
        toast.success(t("categories.updated") || "Category updated");
        setIsEditOpen(false);
        setEditing(null);
      } else {
        await createCategory(payload as Partial<Category>, form.imageFile || null);
        toast.success(t("categories.created") || "Category created");
        setIsCreateOpen(false);
      }
      await load();
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Failed to save category";
      console.error("create/update category error:", e);
      setError(String(msg));
    } finally {
      setSaving(false);
    }
  }

  // ------------------- UI -------------------
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-poppins text-3xl text-gray-900" style={{ fontWeight: 700 }}>
            {t("categories.title") || "Categories Management"}
          </h1>
          <p className="text-gray-600 mt-1">
            {t("categories.subtitle") || "Organize your products into categories"}
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 w-full sm:w-auto" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              {t("categories.addNew") || "Add Category"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>{t("categories.addNew") || "Add New Category"}</DialogTitle>
            </DialogHeader>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                {String(error)}
              </div>
            )}

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("categories.name") || "Category Name"}</Label>
                <Input
                  id="name"
                  placeholder={t("categories.name") || "Enter category name"}
                  value={form.name}
                  onChange={(e) => updateName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nameAr">{t("categories.nameAr", "Arabic Name")}</Label>
                <Input
                  id="nameAr"
                  placeholder={t("categories.nameAr", "Arabic Name") as string}
                  value={form.nameAr || ""}
                  onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">{t("categories.slug") || "Slug"}</Label>
                <Input
                  id="slug"
                  placeholder="e.g. fresh-fruits"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="parent">{t("categories.parent") || "Parent Category (Optional)"}</Label>
                <Select
                  value={form.parentId || "none"}
                  onValueChange={(value) =>
                    setForm({ ...form, parentId: value === "none" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("categories.parent") || "Select parent category"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      {t("categories.root") || "None (Root Category)"}
                    </SelectItem>
                    {parentCandidates.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageFile">{t("categories.image") || "Image"}</Label>
                <Input
                  id="imageFile"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e: any) => {
                    const file = e.target?.files?.[0] || null;
                    const fixed = file ? normalizeImageFileType(file) : null;
                    if (fixed && fixed.size > MAX_FILE_MB * 1024 * 1024) {
                      toast.error(`${MAX_FILE_MB}MB ${t("products.upload.too_large", "File too large")}`);
                      return;
                    }
                    setForm({ ...form, imageFile: fixed });
                  }}
                />
                {(form.imageFile || form.imageUrl) && (
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100">
                    {form.imageFile ? (
                      <img src={previewUrl || undefined} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <img
                        src={form.imageUrl}
                        alt="preview"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="sortOrder">{t("categories.sortOrder") || "Sort Order"}</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    min={0}
                    value={form.sortOrder}
                    onChange={(e) => {
                      const v = Math.max(0, Math.trunc(Number(e.target.value || 0)));
                      setForm({ ...form, sortOrder: v });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("categories.active") || "Active"}</Label>
                  <Select
                    value={form.isActive ? "true" : "false"}
                    onValueChange={(v) => setForm({ ...form, isActive: v === "true" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">{t("app.yes") || "Yes"}</SelectItem>
                      <SelectItem value="false">{t("app.no") || "No"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={saveCreateOrUpdate} className="flex-1" disabled={saving}>
                  {saving ? t("auth.signing_in") || "Saving..." : t("app.actions.save") || "Save"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1"
                  disabled={saving}
                >
                  {t("app.actions.cancel") || "Cancel"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={t("filters.searchPlaceholder") || "Search categories..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 text-right"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setPage(1);
                    load();
                  }
                }}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setPage(1);
                load();
              }}
            >
              {t("app.actions.search") || "Search"}
            </Button>
            <Badge variant="outline">
              {t("app.table.total") || "Total"}: {total}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t("categories.titleList") || "Categories"} ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t("categories.image") || "Image"}</TableHead>
                <TableHead>{t("categories.name") || "Name"}</TableHead>
                <TableHead>{t("categories.slug") || "Slug"}</TableHead>
                <TableHead>{t("categories.parent") || "Parent"}</TableHead>
                <TableHead>{t("categories.sortOrder") || "Sort"}</TableHead>
                <TableHead>{t("categories.active") || "Active"}</TableHead>
                <TableHead className="text-right">{t("app.actions.title") || "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length ? (
                items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                        {c.imageUrl ? (
                          <ImageWithFallback
                            src={c.imageUrl}
                            alt={c.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-gray-600">{c.slug}</TableCell>
                    <TableCell>
                      {c.parentId ? (
                        <Badge variant="secondary">{nameById.get(c.parentId) || c.parentId}</Badge>
                      ) : (
                        <span className="text-gray-500">
                          {t("categories.root") || "Root Category"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.sortOrder ?? 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={c.isActive ? "default" : "secondary"}
                        className={c.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}
                      >
                        {c.isActive ? (t("app.active") || "active") : (t("app.inactive") || "inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                          <Edit className="w-4 h-4" />
                        </Button>

                        {isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {t("categories.deleteTitle") || "Delete Category"}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("categories.deleteConfirm") ||
                                  `Are you sure you want to delete "${c.name}"? This action cannot be undone.`}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>
                                {t("app.actions.cancel") || "Cancel"}
                              </AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={async () => {
                                  try {
                                    await deleteCategory(c.id);
                                    toast.success(t("categories.deleted") || "Category deleted");
                                    load();
                                  } catch (e: any) {
                                    toast.error(String(e?.response?.data?.message || e?.message || "Delete failed"));
                                  }
                                }}
                              >
                                {t("app.actions.delete") || "Delete"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500">
                    {t("app.table.noData") || "No data"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center gap-3 justify-end mt-4">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {t("app.actions.prev") || "Prev"}
            </Button>
            <span className="text-sm text-gray-600">
              {t("app.table.page") || "Page"} {page} {t("app.table.of") || "of"}{" "}
              {Math.max(1, Math.ceil(total / pageSize))}
            </span>
            <Button
              variant="outline"
              disabled={page * pageSize >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("app.actions.next") || "Next"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t("app.actions.edit") || "Edit Category"}</DialogTitle>
          </DialogHeader>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
              {String(error)}
            </div>
          )}

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t("categories.name") || "Category Name"}</Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={(e) => updateName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-nameAr">{t("categories.nameAr", "Arabic Name")}</Label>
              <Input
                id="edit-nameAr"
                value={form.nameAr || ""}
                onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-slug">{t("categories.slug") || "Slug"}</Label>
              <Input
                id="edit-slug"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-parent">{t("categories.parent") || "Parent Category"}</Label>
              <Select
                value={form.parentId || "none"}
                onValueChange={(value) =>
                  setForm({ ...form, parentId: value === "none" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("categories.parent") || "Select parent"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    {t("categories.root") || "None (Root Category)"}
                  </SelectItem>
                  {parentCandidates.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-imageFile">{t("categories.image") || "Image"}</Label>
              <Input
                id="edit-imageFile"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e: any) => {
                  const file = e.target?.files?.[0] || null;
                  const fixed = file ? normalizeImageFileType(file) : null;
                  if (fixed && fixed.size > MAX_FILE_MB * 1024 * 1024) {
                    toast.error(`${MAX_FILE_MB}MB ${t("products.upload.too_large", "File too large")}`);
                    return;
                  }
                  setForm({ ...form, imageFile: fixed });
                }}
              />
              {(form.imageFile || form.imageUrl) && (
                <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100">
                  {form.imageFile ? (
                    <img src={previewUrl || undefined} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <img
                      src={form.imageUrl}
                      alt="preview"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-sortOrder">{t("categories.sortOrder") || "Sort Order"}</Label>
                <Input
                  id="edit-sortOrder"
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) => {
                    const v = Math.max(0, Math.trunc(Number(e.target.value || 0)));
                    setForm({ ...form, sortOrder: v });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("categories.active") || "Active"}</Label>
                <Select
                  value={form.isActive ? "true" : "false"}
                  onValueChange={(v) => setForm({ ...form, isActive: v === "true" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">{t("app.yes") || "Yes"}</SelectItem>
                    <SelectItem value="false">{t("app.no") || "No"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={saveCreateOrUpdate} className="flex-1" disabled={saving}>
                {saving ? t("auth.signing_in") || "Saving..." : t("app.actions.update") || "Update"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                className="flex-1"
                disabled={saving}
              >
                {t("app.actions.cancel") || "Cancel"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


