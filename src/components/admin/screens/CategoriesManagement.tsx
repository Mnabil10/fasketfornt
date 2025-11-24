import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  type Category,
} from "../../../services/categories.service";
import { uploadAdminFile } from "../../../services/uploads.service";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Badge } from "../../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
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
import { Switch } from "../../ui/switch";
import { ImageWithFallback } from "../../figma/ImageWithFallback";
import { Plus, Search, Edit, Trash2, GripVertical, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../../auth/AuthProvider";
import { useDebounce } from "../../../hooks/useDebounce";
import { useCategoriesAdmin, CATEGORIES_QUERY_KEY } from "../../../hooks/api/useCategoriesAdmin";
import { getAdminErrorMessage } from "../../../lib/errors";
import { AdminTableSkeleton } from "../../admin/common/AdminTableSkeleton";
import { EmptyState } from "../../admin/common/EmptyState";
import { ErrorState } from "../../admin/common/ErrorState";

const PAGE_SIZE = 20;
const MAX_FILE_MB = 2;

const categoryFormSchema = z.object({
  name: z.string().min(2, "Name is required"),
  nameAr: z.string().optional(),
  slug: z
    .string()
    .min(2, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphen only"),
  parentId: z.string().optional(),
  sortOrder: z.string().optional(),
  isActive: z
    .boolean()
    .optional()
    .transform((value) => (typeof value === "boolean" ? value : true)),
  imageUrl: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

type DialogState = { mode: "create" | "edit"; category?: Category } | null;

type ReorderItem = { id: string; sortOrder: number };

type CategoryFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  category?: Category;
  parents: Category[];
  loading: boolean;
  onSubmit: (values: CategoryFormValues, imageFile: File | null) => void;
};

function normalizeDigits(value: string) {
  return (value || "")
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

function slugify(value: string) {
  return normalizeDigits(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 64);
}

function mapCategoryToForm(category?: Category): CategoryFormValues {
  if (!category) {
    return {
      name: "",
      nameAr: "",
      slug: "",
      parentId: "",
      sortOrder: "0",
      isActive: true,
      imageUrl: "",
    };
  }
  return {
    name: category.name,
    nameAr: category.nameAr || "",
    slug: category.slug,
    parentId: category.parentId || "",
    sortOrder: String(category.sortOrder ?? 0),
    isActive: !!category.isActive,
    imageUrl: category.imageUrl || "",
  };
}

export function CategoriesManagement() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);
  const [page, setPage] = useState(1);
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [rows, setRows] = useState<Category[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const categoriesQuery = useCategoriesAdmin(
    {
      q: debouncedSearch.trim() || undefined,
      page,
      pageSize: PAGE_SIZE,
    },
    { enabled: true }
  );

  const categoryData = categoriesQuery.data;
  const categoryItems: Category[] = categoryData?.items ?? [];

  useEffect(() => {
    if (categoryData?.items) {
      setRows(categoryData.items);
    }
  }, [categoryData?.items]);

  const parents = useMemo(() => categoryItems.filter((item) => !item.parentId), [categoryItems]);
  const parentNames = useMemo(() => {
    const lookup = new Map<string, string>();
    categoryItems.forEach((item) => lookup.set(item.id, item.name));
    return lookup;
  }, [categoryItems]);

  const saveMutation = useMutation({
    mutationFn: async ({
      id,
      values,
      imageFile,
    }: {
      id?: string;
      values: CategoryFormValues;
      imageFile: File | null;
    }) => {
      let imageUrl = values.imageUrl?.trim() || undefined;
      if (imageFile) {
        const { url } = await uploadAdminFile(imageFile);
        imageUrl = url;
      }

      const payload: Partial<Category> = {
        name: values.name.trim(),
        nameAr: values.nameAr?.trim() || undefined,
        slug: values.slug,
        parentId: values.parentId ? values.parentId : null,
        isActive: values.isActive,
        sortOrder: Number(values.sortOrder || 0),
        imageUrl,
      };

      if (id) {
        return updateCategory(id, payload, null);
      }
      return createCategory(payload, null);
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.id ? t("categories.updated", "Category updated") : t("categories.created", "Category created")
      );
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
      setDialogState(null);
    },
    onError: (error) => toast.error(getAdminErrorMessage(error, t, t("app.notifications.error"))),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      toast.success(t("categories.deleted", "Category deleted"));
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
    },
    onError: (error) => toast.error(getAdminErrorMessage(error, t, t("app.notifications.error"))),
  });

  const reorderMutation = useMutation({
    mutationFn: (items: ReorderItem[]) => reorderCategories(items),
    onError: (error) => {
      toast.error(
        getAdminErrorMessage(error, t, t("categories.reorder_error", "Unable to reorder categories"))
      );
      // revert visual order
      if (categoryItems.length) setRows(categoryItems);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY }),
  });

  const total = categoryData?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleReorder = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    setRows((prev) => {
      const next = [...prev];
      const fromIndex = next.findIndex((item) => item.id === draggingId);
      const toIndex = next.findIndex((item) => item.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      const base = (page - 1) * PAGE_SIZE;
      reorderMutation.mutate(next.map((category, index) => ({ id: category.id, sortOrder: base + index })));
      return next;
    });
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl lg:text-3xl font-semibold text-foreground">{t("categories.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("categories.subtitle", "Organize and reorder category hierarchy")}</p>
        </div>
        <Button className="gap-2" onClick={() => setDialogState({ mode: "create" })}>
          <Plus className="w-4 h-4" />
          {t("categories.addNew", "Add category")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="relative max-w-lg">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
                setPage(1);
              }}
              placeholder={t("filters.searchPlaceholder", "Search categories")}
              className="pl-9"
            />
          </div>

          <div className="border rounded-lg">
            {categoriesQuery.isLoading ? (
              <div className="p-4">
                <AdminTableSkeleton rows={5} columns={8} />
              </div>
            ) : categoriesQuery.isError ? (
              <div className="p-6">
                <ErrorState
                  message={getAdminErrorMessage(categoriesQuery.error, t, t("categories.loadError", "Unable to load categories"))}
                  onRetry={() => categoriesQuery.refetch()}
                />
              </div>
            ) : rows.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title={t("categories.emptyTitle") || "No categories yet"}
                  description={t("categories.emptyDescription") || "Start by creating your first category."}
                  action={
                    <Button size="sm" variant="outline" onClick={() => categoriesQuery.refetch()}>
                      {t("app.actions.retry")}
                    </Button>
                  }
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>{t("categories.name")}</TableHead>
                    <TableHead>{t("categories.nameAr", "Arabic Name")}</TableHead>
                    <TableHead>{t("categories.slug")}</TableHead>
                    <TableHead>{t("categories.parent")}</TableHead>
                    <TableHead>{t("categories.sortOrder")}</TableHead>
                    <TableHead>{t("categories.active")}</TableHead>
                    <TableHead className="text-right">{t("app.actions.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((category) => (
                    <TableRow
                      key={category.id}
                      draggable
                      onDragStart={() => setDraggingId(category.id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => handleReorder(category.id)}
                      onDragEnd={() => setDraggingId(null)}
                    >
                      <TableCell className="text-muted-foreground">
                        <GripVertical className="w-4 h-4" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-md overflow-hidden bg-muted">
                            {category.imageUrl ? (
                              <ImageWithFallback src={category.imageUrl} alt={category.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{category.name}</p>
                            <p className="text-xs text-muted-foreground">ID: {category.id.slice(0, 6)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{category.nameAr || "--"}</TableCell>
                      <TableCell>{category.slug}</TableCell>
                      <TableCell>{category.parentId ? parentNames.get(category.parentId) || "--" : t("categories.root", "Root")}</TableCell>
                      <TableCell>{category.sortOrder ?? 0}</TableCell>
                      <TableCell>
                        <Badge className={category.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}>
                          {category.isActive ? t("app.yes", "Active") : t("app.no", "Inactive")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => setDialogState({ mode: "edit", category })}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-rose-600">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t("categories.delete", "Delete category")}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t("categories.delete_confirm", "This action cannot be undone.")}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t("app.actions.cancel")}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMutation.mutate(category.id)}>
                                    {t("app.actions.delete")}
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
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
              <span>
                {t("app.table.page")} {page} {t("app.table.of")} {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  {t("app.actions.prev")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  {t("app.actions.next")}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <CategoryFormDialog
        open={!!dialogState}
        onOpenChange={(open) => !open && setDialogState(null)}
        mode={dialogState?.mode || "create"}
        category={dialogState?.category}
        parents={parents}
        loading={saveMutation.isPending}
        onSubmit={(values, imageFile) => saveMutation.mutate({ id: dialogState?.category?.id, values, imageFile })}
      />
    </div>
  );
}

function CategoryFormDialog({ open, onOpenChange, mode, category, parents, loading, onSubmit }: CategoryFormDialogProps) {
  const { t } = useTranslation();
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema) as Resolver<CategoryFormValues>,
    defaultValues: mapCategoryToForm(category),
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const slugTouched = useRef(false);

  useEffect(() => {
    form.reset(mapCategoryToForm(category));
    setImageFile(null);
    slugTouched.current = false;
  }, [category, form]);

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const nameValue = form.watch("name");
  useEffect(() => {
    if (slugTouched.current) return;
    if (!nameValue.trim()) return;
    form.setValue("slug", slugify(nameValue));
  }, [nameValue, form]);

  const submit = form.handleSubmit((values: CategoryFormValues) => onSubmit(values, imageFile));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? t("categories.edit", "Edit category") : t("categories.addNew", "Add category")}
          </DialogTitle>
          <DialogDescription>{t("categories.form_subtitle", "Provide multilingual names and set display order")}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div>
            <Label>{t("categories.name")}</Label>
            <Input {...form.register("name")} placeholder={t("categories.name") || ""} />
            {form.formState.errors.name && <p className="text-xs text-rose-600 mt-1">{form.formState.errors.name.message}</p>}
          </div>
          <div>
            <Label>{t("categories.nameAr", "Arabic Name")}</Label>
            <Input {...form.register("nameAr")} placeholder={t("categories.nameAr") || ""} />
          </div>
          <div>
            <Label>{t("categories.slug")}</Label>
            <Input
              {...form.register("slug")}
              onFocus={() => (slugTouched.current = true)}
              onChange={(event) => {
                slugTouched.current = true;
                form.setValue("slug", slugify(event.target.value));
              }}
              placeholder="fresh-fruits"
            />
            {form.formState.errors.slug && <p className="text-xs text-rose-600 mt-1">{form.formState.errors.slug.message}</p>}
          </div>
          <div>
            <Label>{t("categories.parent")}</Label>
            <select
              className="w-full border rounded-md h-10 px-3 text-sm"
              value={form.watch("parentId") || ""}
              onChange={(event) => form.setValue("parentId", event.target.value)}
            >
              <option value="">{t("categories.root", "Root")}</option>
              {parents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>{t("categories.sortOrder")}</Label>
              <Input
                inputMode="numeric"
                {...form.register("sortOrder")}
                onChange={(event) => form.setValue("sortOrder", normalizeDigits(event.target.value).replace(/[^0-9]/g, ""))}
                placeholder="0"
              />
            </div>
            <div className="flex items-center gap-3">
              <Label>{t("categories.active")}</Label>
              <Switch checked={form.watch("isActive")} onCheckedChange={(checked) => form.setValue("isActive", checked)} />
            </div>
          </div>
          <div>
            <Label>{t("categories.image", "Image")}</Label>
            <CategoryImageInput
              value={previewUrl || form.watch("imageUrl")}
              onUrlChange={(url) => form.setValue("imageUrl", url)}
              onFileSelected={(file) => setImageFile(file)}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              {t("app.actions.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("app.loading", "Saving...") : t("app.actions.save", "Save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type CategoryImageInputProps = {
  value?: string | null;
  onUrlChange: (url: string) => void;
  onFileSelected: (file: File | null) => void;
};

function CategoryImageInput({ value, onUrlChange, onFileSelected }: CategoryImageInputProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const displayValue = value?.startsWith("blob:") ? "" : value || "";

  const handleFile = (file: File | null) => {
    if (!file) {
      onFileSelected(null);
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(t("products.upload.too_large", "File too large"));
      return;
    }
    onUrlChange("");
    onFileSelected(file);
  };

  return (
    <div className="space-y-3">
      <div
        className="border-2 border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files?.[0];
          if (file) {
            handleFile(file);
            return;
          }
          const url = event.dataTransfer.getData("text/uri-list") || event.dataTransfer.getData("text/plain");
          if (url.trim()) onUrlChange(url.trim());
        }}
      >
        {value ? (
          <div className="w-28 h-28 mx-auto rounded-md overflow-hidden bg-muted">
            <ImageWithFallback src={value} alt="category" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        <p className="mt-3 text-xs">{t("categories.image_hint", "Drop an image or paste a URL")}</p>
        <div className="flex justify-center gap-2 mt-2">
          <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
            {t("app.actions.upload")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              onUrlChange("");
              onFileSelected(null);
            }}
          >
            {t("app.actions.clear", "Clear")}
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => handleFile(event.target.files?.[0] || null)}
        />
      </div>
      <Input
        value={displayValue}
        onChange={(event) => onUrlChange(event.target.value)}
        placeholder="https://cdn.fasket.com/category.jpg"
      />
    </div>
  );
}
