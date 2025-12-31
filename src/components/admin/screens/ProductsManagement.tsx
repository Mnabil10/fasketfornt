import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm, Controller, type FieldError, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  getProduct,
  type Product,
  downloadProductsBulkTemplate,
  uploadProductsBulk,
} from "../../../services/products.service";
import { uploadAdminFile } from "../../../services/uploads.service";
import { type Category } from "../../../services/categories.service";
import { toCents, fromCents } from "../../../lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Badge } from "../../ui/badge";
import { Switch } from "../../ui/switch";
import { Textarea } from "../../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
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
import {
  Plus,
  Search as SearchIcon,
  Edit,
  Trash2,
  Filter,
  Upload,
  Download,
  Flame,
  DollarSign,
  Package,
  ArrowUpDown,
  Image as ImageIcon,
  AlertTriangle,
} from "lucide-react";
import { ImageWithFallback } from "../../figma/ImageWithFallback";
import { toast } from "sonner";
import { useAuth } from "../../../auth/AuthProvider";
import { useDebounce } from "../../../hooks/useDebounce";
import { useProductsAdmin, PRODUCTS_QUERY_KEY } from "../../../hooks/api/useProductsAdmin";
import { useCategoriesAdmin } from "../../../hooks/api/useCategoriesAdmin";
import { AdminTableSkeleton } from "../../admin/common/AdminTableSkeleton";
import { EmptyState } from "../../admin/common/EmptyState";
import { ErrorState } from "../../admin/common/ErrorState";
import { getAdminErrorMessage } from "../../../lib/errors";
import type { ScreenProps } from "../../admin/AdminDashboard";

const MAX_FILE_MB = 2;
const PAGE_SIZE_OPTIONS = [10, 20, 50];
const DEFAULT_PAGE_SIZE = 20;

const productFormSchema = z
  .object({
    name: z.string().trim().min(1, "validation.required"),
    nameAr: z.string().optional(),
    slug: z
      .string()
      .trim()
      .min(2, "validation.required")
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "products.invalid_slug"),
    description: z.string().optional(),
    descriptionAr: z.string().optional(),
    categoryId: z.string().trim().min(1, "validation.required"),
    price: z.string().trim().min(1, "validation.required"),
    salePrice: z.string().trim().optional(),
    stock: z.string().trim().min(1, "validation.required"),
    status: z.enum(["DRAFT", "ACTIVE", "HIDDEN", "DISCONTINUED"]),
    isHotOffer: z.boolean().default(false),
    images: z.array(z.string().min(1)).default([]),
    mainImage: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    const priceValue = parseCurrency(val.price);
    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      ctx.addIssue({ code: "custom", path: ["price"], message: "products.invalid_price_positive" });
    }

    if (val.salePrice) {
      const saleValue = parseCurrency(val.salePrice);
      if (!Number.isFinite(saleValue) || saleValue <= 0) {
        ctx.addIssue({ code: "custom", path: ["salePrice"], message: "products.invalid_sale_price" });
      } else if (Number.isFinite(priceValue) && saleValue >= priceValue) {
        ctx.addIssue({ code: "custom", path: ["salePrice"], message: "products.invalid_sale_price" });
      }
    }

    const stockValue = Number.parseInt(sanitizeIntegerInput(val.stock), 10);
    if (!Number.isFinite(stockValue) || stockValue < 0) {
      ctx.addIssue({ code: "custom", path: ["stock"], message: "products.invalid_stock" });
    }
  });

type ProductFormValues = z.infer<typeof productFormSchema>;
type DrawerState = { mode: "create" | "edit"; product?: Product } | null;
type StatusFilter = Product["status"] | "all";
type StockFilter = "all" | "in" | "out" | "low";
type SortField = "createdAt" | "priceCents" | "name";

type FilterState = {
  status: StatusFilter;
  categoryId: string;
  stock: StockFilter;
  onlyHot: boolean;
  minPrice?: number;
  maxPrice?: number;
  page: number;
  pageSize: number;
  sortField: SortField;
  sortDirection: "asc" | "desc";
};

const defaultFilters: FilterState = {
  status: "all",
  categoryId: "all",
  stock: "all",
  onlyHot: false,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  sortField: "createdAt",
  sortDirection: "desc",
};

type BulkRowStatus = { row: number | string; status: "success" | "failed"; message?: string; name?: string };
type BulkUploadResult = {
  created: number;
  updated: number;
  skipped?: number;
  dryRun?: boolean;
  rows?: BulkRowStatus[];
  errors?: { row: number | string; message: string; name?: string }[];
};

const statusStyles: Record<Product["status"], string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  DRAFT: "bg-slate-200 text-slate-700",
  HIDDEN: "bg-gray-200 text-gray-700",
  DISCONTINUED: "bg-red-100 text-red-700",
};

const stockBadge = {
  ok: "bg-emerald-100 text-emerald-700",
  low: "bg-amber-100 text-amber-700",
  out: "bg-rose-100 text-rose-700",
};

function normalizeDigits(input: string) {
  return (input || "")
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

function sanitizeCurrencyInput(value: string) {
  const normalized = normalizeDigits(value);
  const stripped = normalized.replace(/[^0-9.,]/g, "").replace(/,/g, ".");
  const [integer, fraction] = stripped.split(".");
  if (!fraction) return integer || "";
  return `${integer || "0"}.${fraction.slice(0, 2)}`;
}

function parseCurrency(value: string) {
  const sanitized = sanitizeCurrencyInput(value);
  if (!sanitized) return NaN;
  return Number.parseFloat(sanitized);
}

function sanitizeIntegerInput(value: string) {
  const normalized = normalizeDigits(value);
  return normalized.replace(/[^0-9]/g, "");
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

function mapProductToForm(product?: Product): ProductFormValues {
  if (!product) {
    return {
      name: "",
      nameAr: "",
      slug: "",
      description: "",
      descriptionAr: "",
      categoryId: "",
      price: "",
      salePrice: "",
      stock: "",
      status: "ACTIVE",
      isHotOffer: false,
      images: [],
      mainImage: "",
    };
  }
  return {
    name: product.name,
    nameAr: product.nameAr || "",
    slug: product.slug,
    description: product.description || "",
    descriptionAr: product.descriptionAr || "",
    categoryId: product.categoryId,
    price: fromCents(product.priceCents).toString(),
    salePrice: product.salePriceCents ? fromCents(product.salePriceCents).toString() : "",
    stock: product.stock.toString(),
    status: product.status,
    isHotOffer: !!product.isHotOffer,
    images: product.images?.filter(Boolean) || [],
    mainImage: product.imageUrl || product.images?.[0] || "",
  };
}

function formatPrice(cents: number, locale: string) {
  try {
    return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", {
      style: "currency",
      currency: "EGP",
      minimumFractionDigits: 2,
    }).format(fromCents(cents));
  } catch {
    return `EGP ${fromCents(cents).toFixed(2)}`;
  }
}

function formatDate(value?: string, locale?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString(locale === "ar" ? "ar-EG" : undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
const statusFilterOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "common.all" },
  { value: "ACTIVE", label: "products.statuses.ACTIVE" },
  { value: "DRAFT", label: "products.statuses.DRAFT" },
  { value: "HIDDEN", label: "products.statuses.HIDDEN" },
  { value: "DISCONTINUED", label: "products.statuses.DISCONTINUED" },
];

const stockFilterOptions: Array<{ value: StockFilter; label: string }> = [
  { value: "all", label: "products.stockFilters.all" },
  { value: "in", label: "products.stockFilters.in" },
  { value: "out", label: "products.stockFilters.out" },
  { value: "low", label: "products.stockFilters.low" },
];

const sortFieldLabels: Record<SortField, string> = {
  createdAt: "products.sort.createdAt",
  priceCents: "products.sort.price",
  name: "products.sort.name",
};

const sortDirections: Record<"asc" | "desc", string> = {
  asc: "products.sort.asc",
  desc: "products.sort.desc",
};

function buildFilterChips(
  t: ReturnType<typeof useTranslation>["t"],
  filters: FilterState,
  search: string,
  categoryLabel?: string
) {
  const chips: Array<{ label: string; onClear?: () => void }> = [];
  if (search.trim()) chips.push({ label: `${t("common.search")}: ${search.trim()}` });
  if (filters.status !== "all") chips.push({ label: t(`products.statuses.${filters.status}`) });
  if (filters.categoryId !== "all") chips.push({ label: categoryLabel || t("products.category_selected") });
  if (filters.stock !== "all") chips.push({ label: t(`products.stockFilters.${filters.stock}`) });
  if (filters.onlyHot) chips.push({ label: t("products.hotOffer") });
  if (filters.minPrice) chips.push({ label: `${t("products.minPrice")}: ${filters.minPrice}` });
  if (filters.maxPrice) chips.push({ label: `${t("products.maxPrice")}: ${filters.maxPrice}` });
  return chips;
}

function stockClass(stock: number) {
  if (stock === 0) return stockBadge.out;
  if (stock > 0 && stock <= 10) return stockBadge.low;
  return stockBadge.ok;
}

function calcDiscount(price: string, salePrice: string) {
  const base = parseCurrency(price);
  const sale = parseCurrency(salePrice);
  if (!Number.isFinite(base) || !Number.isFinite(sale) || !base || !sale) return null;
  if (sale >= base) return null;
  return Math.round((1 - sale / base) * 100);
}

export function ProductsManagement(props?: Partial<ScreenProps>) {
  const { adminState, updateAdminState } = props || {};
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const isArabic = i18n.language?.startsWith("ar");
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);
  const [drawerState, setDrawerState] = useState<DrawerState>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const categoriesQuery = useCategoriesAdmin({ pageSize: 100 }, { enabled: true });

  const apiFilters = useMemo(() => {
    const q = debouncedSearch.trim();
    return {
      q: q || undefined,
      categoryId: filters.categoryId !== "all" ? filters.categoryId : undefined,
      status: filters.status !== "all" ? (filters.status as Product["status"]) : undefined,
      minPriceCents: filters.minPrice ? toCents(filters.minPrice) : undefined,
      maxPriceCents: filters.maxPrice ? toCents(filters.maxPrice) : undefined,
      inStock:
        filters.stock === "all"
          ? undefined
          : filters.stock === "in"
          ? true
          : filters.stock === "out"
          ? false
          : undefined,
      isHotOffer: filters.onlyHot || undefined,
      orderBy: filters.sortField,
      sort: filters.sortDirection,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  }, [filters, debouncedSearch]);

  const productsQuery = useProductsAdmin(apiFilters);

  const categoryLookup = useMemo(() => {
    const map = new Map<string, string>();
    (categoriesQuery.data?.items || []).forEach((category) =>
      map.set(category.id, isArabic && category.nameAr ? category.nameAr : category.name)
    );
    return map;
  }, [categoriesQuery.data?.items, isArabic]);

  const tableItems = useMemo(() => {
    const data = productsQuery.data?.items || [];
    if (filters.stock !== "low") return data;
    return data.filter((item) => item.stock > 0 && item.stock <= 10);
  }, [productsQuery.data?.items, filters.stock]);

  const productListParentRef = useRef<HTMLDivElement | null>(null);
  const productVirtualizer = useVirtualizer({
    count: tableItems.length,
    getScrollElement: () => productListParentRef.current,
    estimateSize: () => 96,
    overscan: 6,
  });

  const total = filters.stock === "low" ? tableItems.length : productsQuery.data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / (filters.pageSize || DEFAULT_PAGE_SIZE)));

  const stats = useMemo(() => {
    const items = tableItems;
    const active = items.filter((p) => p.status === "ACTIVE").length;
    const lowStock = items.filter((p) => p.stock > 0 && p.stock <= 10).length;
    const outOfStock = items.filter((p) => p.stock === 0).length;
    return { total: total || items.length, active, lowStock, outOfStock };
  }, [tableItems, total]);

  const upsertMutation = useMutation({
    mutationFn: async (payload: { id?: string; values: ProductFormValues; imageFile: File | null; product?: Product }) => {
      const priceValue = parseCurrency(payload.values.price);
      const saleValue = payload.values.salePrice ? parseCurrency(payload.values.salePrice) : NaN;
      const stockValue = Number.parseInt(sanitizeIntegerInput(payload.values.stock), 10);
      if (!Number.isFinite(priceValue) || priceValue <= 0) {
        throw new Error(t("products.invalid_price_positive", "Price must be greater than 0"));
      }
      if (payload.values.salePrice && (!Number.isFinite(saleValue) || saleValue >= priceValue)) {
        throw new Error(t("products.invalid_sale_price", "Sale price must be lower"));
      }
      if (!Number.isFinite(stockValue) || stockValue < 0) throw new Error(t("products.invalid_stock", "Invalid stock"));

      const basePayload: Partial<Product> = {
        name: payload.values.name.trim(),
        nameAr: payload.values.nameAr?.trim() || undefined,
        slug: payload.values.slug,
        description: payload.values.description?.trim() || undefined,
        descriptionAr: payload.values.descriptionAr?.trim() || undefined,
        categoryId: payload.values.categoryId,
        status: payload.values.status,
        stock: stockValue,
        isHotOffer: payload.values.isHotOffer,
        priceCents: toCents(priceValue),
        salePriceCents: payload.values.salePrice ? toCents(saleValue) : undefined,
        imageUrl: payload.values.mainImage || payload.values.images[0] || undefined,
        images: payload.values.images.filter(Boolean),
      };

      if (!isAdmin) {
        if (!payload.id || !payload.product) {
          throw new Error(t("products.permissions.adminOnly", "Only admins can create products or change prices"));
        }
        basePayload.priceCents = payload.product?.priceCents ?? basePayload.priceCents;
        basePayload.salePriceCents =
          payload.product && typeof payload.product.salePriceCents !== "undefined"
            ? payload.product.salePriceCents ?? undefined
            : basePayload.salePriceCents;
      }

      if (payload.imageFile) {
        const { url } = await uploadAdminFile(payload.imageFile);
        basePayload.imageUrl = url;
        if (!basePayload.images?.length) {
          basePayload.images = [url];
        } else if (!basePayload.images.includes(url)) {
          basePayload.images = [url, ...basePayload.images];
        }
      }

      if (payload.id) {
        return updateProduct(payload.id, basePayload, null);
      }
      return createProduct(basePayload, null);
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.id ? t("products.updated", "Product updated") : t("products.created", "Product created")
      );
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      setDrawerState(null);
    },
    onError: (error) => {
      toast.error(getAdminErrorMessage(error, t, t("app.notifications.error", "Unable to save product")));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      toast.success(t("products.deleted", "Product deleted"));
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
    },
    onError: (error) => toast.error(getAdminErrorMessage(error, t, t("app.notifications.error"))),
  });

  useEffect(() => {
    if (!adminState?.selectedProduct) return;
    (async () => {
      try {
        const product = await getProduct(String(adminState.selectedProduct));
        setDrawerState({ mode: "edit", product });
      } catch (error) {
        toast.error(getAdminErrorMessage(error, t, t("products.not_found", "Product not found")));
      } finally {
        updateAdminState?.({ selectedProduct: null });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminState?.selectedProduct]);

  const handleSort = (field: SortField) => {
    setFilters((prev) => {
      if (prev.sortField === field) {
        return { ...prev, sortDirection: prev.sortDirection === "asc" ? "desc" : "asc", page: 1 };
      }
      return { ...prev, sortField: field, sortDirection: "asc", page: 1 };
    });
  };

  const sortIconClass = (field: SortField) =>
    `w-3 h-3 transition-colors ${
      filters.sortField === field ? "text-foreground" : "text-muted-foreground"
    } ${filters.sortField === field && filters.sortDirection === "asc" ? "rotate-180" : ""}`;

  const resetFilters = () => {
    setFilters(defaultFilters);
    setSearchInput("");
  };

  const activeFilterChips = buildFilterChips(
    t,
    filters,
    searchInput,
    filters.categoryId !== "all" ? categoryLookup.get(filters.categoryId) : undefined
  );
  const primaryAlignClass = isRTL ? "text-right" : "";
  const endAlignClass = isRTL ? "text-left" : "text-right";
  const sortHeaderClass = isRTL ? "flex-row-reverse" : "";

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-foreground">{t("products.title")}</h1>
          <p className="text-muted-foreground text-sm lg:text-base">
            {t("products.subtitle", "Manage inventory, prices, and availability")}
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" className="gap-2" onClick={() => setBulkOpen(true)}>
              <Upload className="w-4 h-4" />
              {t("products.importExcel", "Bulk upload")}
            </Button>
            <Button className="gap-2" onClick={() => setDrawerState({ mode: "create" })}>
              <Plus className="w-4 h-4" />
              {t("products.addNew")}
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Package} label={t("products.stats.total", "Total products")} value={stats.total} />
        <StatCard icon={DollarSign} label={t("products.stats.active", "Active")} value={stats.active} accent="text-emerald-600" />
        <StatCard icon={Flame} label={t("products.stats.low", "Low stock")} value={stats.lowStock} accent="text-amber-600" />
        <StatCard icon={AlertTriangle} label={t("products.stats.out", "Out of stock")} value={stats.outOfStock} accent="text-rose-600" />
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <SearchIcon className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchInput}
                onChange={(event) => {
                  setSearchInput(event.target.value);
                  setFilters((prev) => ({ ...prev, page: 1 }));
                }}
                placeholder={t("filters.searchPlaceholder", "Search by name or SKU")}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select
                value={filters.status}
                onValueChange={(value: StatusFilter) => setFilters((prev) => ({ ...prev, status: value, page: 1 }))}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder={t("products.status")} />
                </SelectTrigger>
                <SelectContent>
                  {statusFilterOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(option.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.categoryId}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, categoryId: value, page: 1 }))}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder={t("products.category")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  {(categoriesQuery.data?.items || []).map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {isArabic && category.nameAr ? category.nameAr : category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.stock}
                onValueChange={(value: StockFilter) => setFilters((prev) => ({ ...prev, stock: value, page: 1 }))}
              >
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder={t("products.stock")} />
                </SelectTrigger>
                <SelectContent>
                  {stockFilterOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(option.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">{t("products.minPrice")}</Label>
              <Input
                inputMode="decimal"
                value={filters.minPrice?.toString() || ""}
                onChange={(event) =>
                  setFilters((prev) => {
                    const next = sanitizeCurrencyInput(event.target.value);
                    if (!next) return { ...prev, minPrice: undefined };
                    const numeric = parseCurrency(next);
                    if (Number.isNaN(numeric)) return prev;
                    return { ...prev, minPrice: numeric };
                  })
                }
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t("products.maxPrice")}</Label>
              <Input
                inputMode="decimal"
                value={filters.maxPrice?.toString() || ""}
                onChange={(event) =>
                  setFilters((prev) => {
                    const next = sanitizeCurrencyInput(event.target.value);
                    if (!next) return { ...prev, maxPrice: undefined };
                    const numeric = parseCurrency(next);
                    if (Number.isNaN(numeric)) return prev;
                    return { ...prev, maxPrice: numeric };
                  })
                }
                placeholder="0"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
              <Switch checked={filters.onlyHot} onCheckedChange={(checked) => setFilters((prev) => ({ ...prev, onlyHot: checked, page: 1 }))} />
              <span className="text-sm">{t("products.hotOffer", "Hot offer")}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
              <Label className="text-xs text-muted-foreground">{t("products.sort.label", "Sort by")}</Label>
              <Select
                value={filters.sortField}
                onValueChange={(value: SortField) => setFilters((prev) => ({ ...prev, sortField: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("products.sort.label")} />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(sortFieldLabels) as SortField[]).map((field) => (
                    <SelectItem key={field} value={field}>
                      {t(sortFieldLabels[field])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.sortDirection}
                onValueChange={(value: "asc" | "desc") => setFilters((prev) => ({ ...prev, sortDirection: value }))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue placeholder={t("products.sort.direction")} />
                </SelectTrigger>
                <SelectContent>
                  {(["asc", "desc"] as const).map((dir) => (
                    <SelectItem key={dir} value={dir}>
                      {t(sortDirections[dir])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {activeFilterChips.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {activeFilterChips.map((chip, index) => (
                <Badge key={`${chip.label}-${index}`} variant="secondary">
                  {chip.label}
                </Badge>
              ))}
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 px-2">
                {t("filters.reset")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {t("products.tableTitle", "Products")}
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {t("app.table.page")} {filters.page} {t("app.table.of")} {totalPages}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {productsQuery.isLoading ? (
            <div className="p-6">
              <AdminTableSkeleton rows={6} columns={8} />
            </div>
          ) : productsQuery.isError ? (
            <div className="p-6">
              <ErrorState
                message={getAdminErrorMessage(productsQuery.error, t, t("app.table.error", "Unable to load products right now"))}
                onRetry={() => productsQuery.refetch()}
              />
            </div>
          ) : tableItems.length ? (
            <div className="overflow-x-auto" dir={i18n.dir()}>
              <div ref={productListParentRef} className="max-h-[70vh] overflow-auto">
                <Table dir={i18n.dir()} className={isRTL ? "text-right" : ""}>
                <TableHeader>
                  <TableRow>
                    <TableHead className={`cursor-pointer ${primaryAlignClass}`} onClick={() => handleSort("name")}>
                      <div className={`flex items-center gap-1 ${sortHeaderClass}`}>
                        {t("products.product")}
                        <ArrowUpDown className={sortIconClass("name")} />
                      </div>
                    </TableHead>
                    <TableHead className={primaryAlignClass}>{t("products.category")}</TableHead>
                    <TableHead className={`cursor-pointer ${primaryAlignClass}`} onClick={() => handleSort("createdAt")}>
                      <div className={`flex items-center gap-1 ${sortHeaderClass}`}>
                        {t("products.createdAt", "Created")}
                        <ArrowUpDown className={sortIconClass("createdAt")} />
                      </div>
                    </TableHead>
                    <TableHead className={`cursor-pointer ${primaryAlignClass}`} onClick={() => handleSort("priceCents")}>
                      <div className={`flex items-center gap-1 ${sortHeaderClass}`}>
                        {t("products.price")}
                        <ArrowUpDown className={sortIconClass("priceCents")} />
                      </div>
                    </TableHead>
                    <TableHead className={primaryAlignClass}>
                      <div className="flex items-center gap-1">
                        {t("products.stock")}
                      </div>
                    </TableHead>
                    <TableHead className={primaryAlignClass}>{t("products.status")}</TableHead>
                    <TableHead className={primaryAlignClass}>{t("products.hotOffer", "Hot offer")}</TableHead>
                    <TableHead className={endAlignClass}>{t("app.actions.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody style={{ position: "relative", height: productVirtualizer.getTotalSize() }}>
                  {productVirtualizer.getVirtualItems().map((virtualRow) => {
                    const product = tableItems[virtualRow.index];
                    const primaryName = isArabic && product.nameAr?.trim() ? product.nameAr : product.name;
                    const secondaryName =
                      isArabic && product.name !== primaryName
                        ? product.name
                        : !isArabic && product.nameAr?.trim()
                        ? product.nameAr
                        : product.slug;
                    return (
                      <TableRow
                        key={product.id}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                      <TableCell className={primaryAlignClass}>
                        <div className={`flex gap-3 ${isRTL ? "flex-row-reverse text-right" : ""}`}>
                          <div className="w-14 h-14 rounded-md overflow-hidden bg-muted">
                            {product.imageUrl ? (
                              <ImageWithFallback src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <ImageIcon className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div className="space-y-0.5">
                            <p className="font-medium text-sm">{primaryName}</p>
                            <p className="text-xs text-muted-foreground max-w-[220px] truncate">{secondaryName}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className={primaryAlignClass}>{categoryLookup.get(product.categoryId) || "--"}</TableCell>
                      <TableCell className={primaryAlignClass}>{formatDate(product.createdAt, i18n.language)}</TableCell>
                      <TableCell className={primaryAlignClass}>{formatPrice(product.priceCents, i18n.language)}</TableCell>
                      <TableCell className={primaryAlignClass}>
                        <Badge className={stockClass(product.stock)}>
                          {product.stock === 0
                            ? t("products.stockFilters.out", "Out of stock")
                            : product.stock <= 10
                            ? t("products.stockFilters.low", "Low stock")
                            : t("products.stockFilters.in", "In stock")}{" "}
                          ({product.stock})
                        </Badge>
                      </TableCell>
                      <TableCell className={primaryAlignClass}>
                        <Badge className={statusStyles[product.status]}>{t(`products.statuses.${product.status}`)}</Badge>
                      </TableCell>
                      <TableCell className={primaryAlignClass}>
                        {product.isHotOffer ? (
                          <Badge className="bg-amber-100 text-amber-700 gap-1">
                            <Flame className="w-3 h-3" />
                            {t("products.hotOffer")}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell className={endAlignClass}>
                        <div className={`flex ${isRTL ? "justify-start" : "justify-end"} gap-2`}>
                          <Button size="icon" variant="ghost" onClick={() => setDrawerState({ mode: "edit", product })}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="text-rose-600">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t("products.delete")}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t("products.deleteConfirm", "This action cannot be undone")}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t("app.actions.cancel")}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMutation.mutate(product.id)}>
                                    {t("app.actions.delete")}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
          ) : (
            <div className="p-6">
              <EmptyState
                title={t("products.noResults", "No products found for the selected filters")}
                description={t("products.noResultsHint", "Try adjusting your filters or search query.")}
                action={
                  <Button size="sm" variant="outline" onClick={() => productsQuery.refetch()}>
                    {t("app.actions.retry")}
                  </Button>
                }
              />
            </div>
          )}

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-t px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span>
                {t("app.table.total", "Total")}: {total}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{t("app.table.pageSize", "Rows per page")}</span>
                <Select
                  value={String(filters.pageSize)}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      pageSize: Number(value),
                      page: 1,
                    }))
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page === 1}
                onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              >
                {t("app.actions.prev")}
              </Button>
              <span>
                {filters.page}/{totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page >= totalPages}
                onClick={() => setFilters((prev) => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}
              >
                {t("app.actions.next")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!drawerState} onOpenChange={(open) => !open && setDrawerState(null)}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {drawerState?.mode === "edit" ? t("products.editProduct", "Edit product") : t("products.addNew")}
            </DialogTitle>
            <DialogDescription>
              {t("products.formSubtitle", "Fill in the product details below")}
            </DialogDescription>
          </DialogHeader>
          <ProductForm
            key={drawerState?.product?.id || drawerState?.mode}
            categories={categoriesQuery.data?.items || []}
            initialValues={mapProductToForm(drawerState?.product)}
            loading={upsertMutation.isPending}
            canEditPrice={isAdmin}
            onCancel={() => setDrawerState(null)}
            onSubmit={(values, imageFile) =>
              upsertMutation.mutate({ id: drawerState?.product?.id, values, imageFile, product: drawerState?.product })
            }
          />
        </DialogContent>
      </Dialog>

      {isAdmin && (
        <BulkUploadDrawer
          open={bulkOpen}
          onOpenChange={(open) => setBulkOpen(open)}
          onCompleted={() => queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY })}
        />
      )}
    </div>
  );
}
type StatCardProps = {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: number;
  accent?: string;
};

function StatCard({ icon: Icon, label, value, accent }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center ${accent || ""}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

type ProductFormProps = {
  categories: Category[];
  initialValues: ProductFormValues;
  loading: boolean;
  canEditPrice: boolean;
  onSubmit: (values: ProductFormValues, imageFile: File | null) => void;
  onCancel: () => void;
};

function ProductForm({ categories, initialValues, loading, canEditPrice, onSubmit, onCancel }: ProductFormProps) {
  const { t } = useTranslation();
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema) as Resolver<ProductFormValues>,
    defaultValues: initialValues,
  });
  const requiredMark = <span className="text-rose-500">*</span>;
  const renderError = (error?: FieldError) =>
    error?.message ? (
      <p className="text-xs text-rose-600 mt-1">{t(error.message as string, { defaultValue: error.message as string })}</p>
    ) : null;
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const slugEdited = useRef(false);

  useEffect(() => {
    form.reset(initialValues);
    setImageFile(null);
    slugEdited.current = false;
  }, [initialValues, form]);

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
  const saleValue = form.watch("salePrice");
  useEffect(() => {
    if (slugEdited.current) return;
    if (!nameValue.trim()) return;
    form.setValue("slug", slugify(nameValue));
  }, [nameValue, form]);

  const discount = calcDiscount(form.watch("price"), saleValue || "");

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setImageFile(null);
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(t("products.upload.too_large", "File too large"));
      return;
    }
    setImageFile(file);
  };

  const submit = form.handleSubmit((values: ProductFormValues) => onSubmit(values, imageFile));

  return (
    <form className="space-y-6" onSubmit={submit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-4">
          <div>
            <Label>
              {t("products.name")} {requiredMark}
            </Label>
            <Input {...form.register("name")} placeholder={t("products.name") || ""} />
            {renderError(form.formState.errors.name as FieldError)}
          </div>
          <div>
            <Label>{t("products.nameAr", "Arabic name")}</Label>
            <Input {...form.register("nameAr")} placeholder={t("products.nameAr") || ""} />
          </div>
          <div>
            <Label>
              {t("products.slug")} {requiredMark}
            </Label>
            <Input
              {...form.register("slug")}
              onFocus={() => (slugEdited.current = true)}
              onChange={(event) => {
                slugEdited.current = true;
                form.setValue("slug", slugify(event.target.value));
              }}
              placeholder="fresh-fruits"
            />
            {renderError(form.formState.errors.slug as FieldError)}
          </div>
          <div>
            <Label>
              {t("products.category")} {requiredMark}
            </Label>
            <Select value={form.watch("categoryId")} onValueChange={(value) => form.setValue("categoryId", value)}>
              <SelectTrigger>
                <SelectValue placeholder={t("products.category")} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {renderError(form.formState.errors.categoryId as FieldError)}
          </div>
          <div>
            <Label>{t("products.description")}</Label>
            <Textarea rows={4} {...form.register("description")} placeholder={t("products.description") || ""} />
          </div>
          <div>
            <Label>{t("products.descriptionAr", "Arabic description")}</Label>
            <Textarea rows={4} {...form.register("descriptionAr")} />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.watch("isHotOffer")} onCheckedChange={(checked) => form.setValue("isHotOffer", checked)} />
            <div>
              <p className="text-sm font-medium">{t("products.hotOffer")}</p>
              <p className="text-xs text-muted-foreground">{t("products.hotOffer_hint", "Highlight product in heroes and offer sections")}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Controller
              control={form.control}
              name="price"
              render={({ field }) => (
                <div>
                  <Label>
                    {t("products.price")} {requiredMark}
                  </Label>
                  <Input
                    {...field}
                    inputMode="decimal"
                    onChange={(event) => field.onChange(sanitizeCurrencyInput(event.target.value))}
                    placeholder="0.00"
                    disabled={!canEditPrice}
                  />
                  {renderError(form.formState.errors.price as FieldError)}
                  {!canEditPrice && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("products.price_locked", "Only admins can update prices")}
                    </p>
                  )}
                </div>
              )}
            />
            <Controller
              control={form.control}
              name="salePrice"
              render={({ field }) => (
                <div>
                  <Label>{t("products.salePrice")}</Label>
                  <Input
                    {...field}
                    inputMode="decimal"
                    onChange={(event) => field.onChange(sanitizeCurrencyInput(event.target.value))}
                    placeholder="0.00"
                    disabled={!canEditPrice}
                  />
                  {renderError(form.formState.errors.salePrice as FieldError)}
                </div>
              )}
            />
          </div>
          {discount !== null && (
            <div className="rounded-md bg-emerald-50 text-emerald-700 text-sm px-3 py-2">
              {t("products.discount", "Discount")}: {discount}%
            </div>
          )}

          <Controller
            control={form.control}
            name="stock"
            render={({ field }) => (
              <div>
                <Label>
                  {t("products.stock")} {requiredMark}
                </Label>
                <Input
                  {...field}
                  inputMode="numeric"
                  onChange={(event) => field.onChange(sanitizeIntegerInput(event.target.value))}
                  placeholder="0"
                />
                {renderError(form.formState.errors.stock as FieldError)}
              </div>
            )}
          />

          <div>
            <Label>{t("products.status")}</Label>
            <Select value={form.watch("status")} onValueChange={(value) => form.setValue("status", value as Product["status"])}>
              <SelectTrigger>
                <SelectValue placeholder={t("products.status")} />
              </SelectTrigger>
              <SelectContent>
                {(["ACTIVE", "DRAFT", "HIDDEN", "DISCONTINUED"] as const).map((status) => (
                  <SelectItem key={status} value={status}>
                    {t(`products.statuses.${status}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t("products.imageUrl", "Main image")}</Label>
            <Input type="file" accept="image/*" onChange={handleImageChange} />
            {(previewUrl || form.watch("mainImage")) && (
              <div className="mt-2 w-32 h-32 rounded-lg overflow-hidden bg-muted">
                {previewUrl ? (
                  <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageWithFallback src={form.watch("mainImage") || ""} alt="main" className="w-full h-full object-cover" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Controller
        control={form.control}
        name="images"
        render={({ field }) => (
          <ProductImagesInput
            value={field.value}
            mainImage={form.watch("mainImage")}
            onChange={(value) => field.onChange(value)}
            onMainChange={(value) => form.setValue("mainImage", value)}
          />
        )}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          {t("app.actions.cancel")}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? t("app.loading", "Saving...") : t("app.actions.save", "Save product")}
        </Button>
      </div>
    </form>
  );
}
type ProductImagesInputProps = {
  value: string[];
  mainImage?: string;
  onChange: (value: string[]) => void;
  onMainChange: (value: string) => void;
};

function ProductImagesInput({ value, mainImage, onChange, onMainChange }: ProductImagesInputProps) {
  const { t } = useTranslation();
  const dragIndex = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const MAX_IMAGE_MB = 2;

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    setUploading(true);
    try {
      const nextUrls: string[] = [];
      for (const file of list) {
        if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
          toast.error(t("products.upload.too_large", "File too large"));
          continue;
        }
        const { url } = await uploadAdminFile(file);
        nextUrls.push(url);
      }
      if (nextUrls.length) {
        const merged = [...(value || []), ...nextUrls].filter(Boolean);
        onChange(Array.from(new Set(merged)));
      }
    } finally {
      setUploading(false);
    }
  };

  const handleReorder = (targetIndex: number) => {
    if (dragIndex.current === null || dragIndex.current === targetIndex) return;
    const next = [...value];
    const [item] = next.splice(dragIndex.current, 1);
    next.splice(targetIndex, 0, item);
    dragIndex.current = null;
    onChange(next);
  };

  const items = value || [];

  return (
    <div className="space-y-3">
      <Label>{t("products.images.label", "Additional images")}</Label>
      <div
        className="border border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const files = event.dataTransfer.files;
          if (files && files.length) {
            void handleFiles(files);
          }
        }}
      >
        {t("products.media.hint", "Drop images here to upload.")}
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? t("common.saving", "Saving...") : t("app.actions.upload", "Upload")}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            const files = event.target.files;
            if (files && files.length) {
              void handleFiles(files);
            }
            event.currentTarget.value = "";
          }}
        />
        <p className="text-xs text-muted-foreground">{t("validation.imageType", "Use PNG, JPG, or WEBP (max {{size}}MB)", { size: MAX_IMAGE_MB })}</p>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("products.images.empty", "No gallery images added")}</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {items.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="border rounded-lg p-2 space-y-2"
              draggable
              onDragStart={() => (dragIndex.current = index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleReorder(index)}
            >
              <div className="w-full aspect-square bg-muted rounded-md overflow-hidden">
                <ImageWithFallback src={url} alt={`image-${index}`} className="w-full h-full object-cover" />
              </div>
              <div className="flex items-center justify-between text-xs">
                <Badge variant={mainImage === url ? "default" : "secondary"}>
                  {mainImage === url ? t("products.mainImage", "Cover") : t("products.gallery", "Gallery")}
                </Badge>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => onMainChange(url)}>
                    {t("app.actions.set", "Set")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-rose-500"
                    onClick={() => {
                      const next = items.filter((_, i) => i !== index);
                      onChange(next);
                      if (mainImage === url) {
                        onMainChange(next[0] || "");
                      }
                    }}
                  >
                    {t("app.actions.delete")}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
type BulkUploadDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
};

function BulkUploadDrawer({ open, onOpenChange, onCompleted }: BulkUploadDrawerProps) {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<BulkUploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setResult(null);
      setError(null);
      setUploading(false);
    }
  }, [open]);

  const handleUpload = async () => {
    if (!file) {
      setError(t("products.bulkImport.noFile", "Select a file"));
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const res = await uploadBulkFile(file);
      setResult(res);
      toast.success(t("products.bulkImport.success", "Bulk upload complete"));
      onCompleted();
    } catch (err) {
      const message = getAdminErrorMessage(err, t, t("products.bulkImport.error", "Upload failed"));
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const rows = useMemo(() => {
    if (result?.rows?.length) return result.rows;
    if (result?.errors?.length) {
      return result.errors.map((item) => ({ row: item.row, status: "failed" as const, message: item.message, name: item.name }));
    }
    return [] as BulkRowStatus[];
  }, [result]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw]">
        <DialogHeader>
          <DialogTitle>{t("products.importExcel", "Import products from Excel")}</DialogTitle>
          <DialogDescription>
            {t("products.bulkImport.instructions1", "Download the template, fill it, then upload the file.")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={async () => {
                try {
                  await downloadBulkTemplate();
                  toast.success(t("products.bulkImport.templateDownloaded", "Template downloaded"));
                } catch (err) {
                  toast.error(
                    getAdminErrorMessage(err, t, t("products.bulkImport.templateError", "Unable to download template"))
                  );
                }
              }}
            >
              <Download className="w-4 h-4" />
              {t("products.bulkImport.downloadTemplate", "Download template")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => inputRef.current?.click()}>
              {t("products.bulkImport.chooseFile", "Choose file")}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={(event) => {
                const next = event.target.files?.[0];
                setFile(next || null);
                setResult(null);
                setError(null);
              }}
            />
          </div>

          <div
            className="border-2 border-dashed rounded-lg p-6 text-center"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const next = event.dataTransfer.files?.[0];
              if (!next) return;
              setFile(next);
              setResult(null);
              setError(null);
            }}
          >
            {file ? (
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                {t("products.bulkImport.dropzone", "Drag & drop your Excel file here")}
              </p>
            )}
          </div>

          {error && <div className="text-sm text-rose-600 bg-rose-50 rounded-md p-3">{error}</div>}

          <div className="flex gap-3">
            <Button type="button" className="flex-1" disabled={!file || uploading} onClick={handleUpload}>
              {uploading ? t("products.bulkImport.uploading", "Uploading...") : t("products.bulkImport.startUpload", "Start upload")}
            </Button>
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={uploading}>
              {t("app.actions.close")}
            </Button>
          </div>

          {result && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{t("products.bulkImport.created", "Created")}</p>
                    <p className="text-2xl font-semibold text-emerald-600">{result.created}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{t("products.bulkImport.updated", "Updated")}</p>
                    <p className="text-2xl font-semibold text-blue-600">{result.updated}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("products.bulkImport.row", "Row")}</TableHead>
                      <TableHead>{t("products.bulkImport.product", "Product")}</TableHead>
                      <TableHead>{t("products.bulkImport.status", "Status")}</TableHead>
                      <TableHead>{t("products.bulkImport.message", "Message")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          {t("products.bulkImport.noRows", "No row details provided")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row, index) => (
                        <TableRow key={`${row.row}-${index}`}>
                          <TableCell>{row.row}</TableCell>
                          <TableCell>{row.name || "--"}</TableCell>
                          <TableCell>
                            <Badge className={row.status === "success" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}>
                              {row.status === "success"
                                ? t("products.bulkImport.successRow", "Success")
                                : t("products.bulkImport.failedRow", "Failed")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{row.message || "--"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

async function downloadBulkTemplate() {
  const { blob, filename } = await downloadProductsBulkTemplate();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "products-template.xlsx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function uploadBulkFile(file: File): Promise<BulkUploadResult> {
  const payload = await uploadProductsBulk(file);
  const rows =
    payload.rows?.map((row, index) => ({
      row: row.row ?? row.rowNumber ?? index + 1,
      status: ((row.status || "").toLowerCase() === "failed" ? "failed" : "success") as BulkRowStatus["status"],
      message: row.errorMessage || row.message,
      name: row.name,
    })) ?? [];
  const errors =
    payload.errors?.map((error) => ({
      row: error.row,
      code: error.code,
      message: error.message,
    })) ?? [];
  return {
    created: payload.created ?? 0,
    updated: payload.updated ?? 0,
    skipped: payload.skipped ?? 0,
    dryRun: payload.dryRun,
    rows,
    errors,
  };
}
