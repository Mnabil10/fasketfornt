import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProduct,
  Product,
} from "../../../services/products.service";
import { listCategories } from "../../../services/categories.service";
import { toCents, fromCents } from "../../../lib/money";
// Direct uploads disabled; use multipart on save

// === UI ===
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
// Tabs removed from product form (single section)
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
import {
  Plus,
  Search as SearchIcon,
  Edit,
  Trash2,
  DollarSign,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from "lucide-react";
import { ImageWithFallback } from "../../figma/ImageWithFallback";
import { toast } from "sonner";
import { useAuth } from "../../../auth/AuthProvider";

type StatusFilter = Product["status"] | "all";

type FormState = {
  name: string;
  nameAr?: string;
  slug: string;
  description: string;
  descriptionAr?: string;
  imageUrl: string;
  images: string; // comma-separated
  imageFile?: File | null;
  price: string;
  salePrice: string;
  stock: string;
  status: Product["status"];
  categoryId: string;
  isHotOffer?: boolean;
};

export function ProductsManagement(props?: any) {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();

  // table state
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);

  // server-side filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // categories for select
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);

  // modals & form
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Tabs removed (keep no-op state eliminated)

  // uploads removed (S3 direct upload disabled)
  const uploading = false;
  const uploadProgress: number | null = null;

  // form model (strings for numeric fields to avoid freeze)
  const [form, setForm] = useState<FormState>({
    name: "",
    nameAr: "",
    slug: "",
    description: "",
    descriptionAr: "",
    imageUrl: "",
    images: "",
    imageFile: null,
    price: "",
    salePrice: "",
    stock: "",
    status: "ACTIVE",
    categoryId: "",
    isHotOffer: false,
  });

  // helpers
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

  // improved slug + validations
  function normalizeDigits(s: string) {
    return (s || "")
      .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
      .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  }
  function parseNumberInput(raw: string): number {
    const s = normalizeDigits(raw || "").trim();
    // Replace Arabic decimal comma with dot, drop non-numeric except dot and minus
    const canonical = s.replace(/،/g, ",").replace(/,/g, ".").replace(/[^0-9.\-]/g, "");
    const n = parseFloat(canonical);
    return Number.isFinite(n) ? n : NaN;
  }
  function slugify(str: string) {
    const normalized = normalizeDigits((str || "").trim().toLowerCase());
    return normalized
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 64);
  }
  const MAX_PRICE = 1_000_000;
  const MAX_STOCK = 1_000_000;
  const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const MAX_FILE_MB = 10;
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
  function isValidSlug(s: string) {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length <= 64;
  }
  function isValidUrl(u: string) {
    try { const x = new URL(u); return x.protocol === "http:" || x.protocol === "https:"; } catch { return false; }
  }

  function updateName(next: string) {
    setForm((prev) => ({
      ...prev,
      name: next,
      slug: prev.slug ? prev.slug : slugify(next),
    }));
  }

  // load products (SERVER-SIDE filters)
  async function load() {
    const res = await listProducts({
      q: search || undefined,
      categoryId: categoryFilter !== "all" ? categoryFilter : undefined,
      status: statusFilter !== "all" ? (statusFilter as Product["status"]) : undefined,
      page,
      pageSize,
      orderBy: "createdAt",
      sort: "desc",
    });
    setItems(res.items);
    setTotal(res.total);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page, statusFilter, categoryFilter]);

  useEffect(() => {
    (async () => {
      const c = await listCategories({ pageSize: 100 });
      setCats(c.items.map((i: any) => ({ id: i.id, name: i.name })));
    })();
  }, []);

  // UI helpers
  function getStockStatus(stock: number) {
    if (stock === 0)
      return {
        label: t("products.stockStatuses.out", "غير متوفر"),
        color: "bg-red-100 text-red-700",
      };
    if (stock < 10)
      return {
        label: t("products.stockStatuses.low", "نقص المخزون"),
        color: "bg-yellow-100 text-yellow-700",
      };
    return {
      label: t("products.stockStatuses.in", "متوفر"),
        color: "bg-green-100 text-green-700",
      };
  }

  // image list helpers
  function appendImageUrl(url: string) {
    setForm((prev) => {
      const items = (prev.images ? prev.images.split(",") : [])
        .map((s) => s.trim())
        .filter(Boolean);
      if (!items.includes(url)) items.push(url);
      return { ...prev, images: items.join(",") };
    });
  }
  function setMainImage(url: string) {
    setForm((prev) => ({ ...prev, imageUrl: url }));
  }

  // create/edit openers
  function openCreate() {
    setEditing(null);
    setError(null);
    setForm({
      name: "",
      nameAr: "",
      slug: "",
      description: "",
      descriptionAr: "",
      imageUrl: "",
      images: "",
      imageFile: null,
      price: "",
      salePrice: "",
      stock: "",
      status: "ACTIVE",
      categoryId: "",
      isHotOffer: false,
    });
    setIsAddModalOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name,
      nameAr: p.nameAr || "",
      slug: p.slug,
      description: p.description || "",
      descriptionAr: p.descriptionAr || "",
      imageUrl: p.imageUrl || "",
      images: (p.images || []).join(","),
      imageFile: null,
      price: fromCents(p.priceCents).toString(),
      salePrice: p.salePriceCents ? fromCents(p.salePriceCents).toString() : "",
      stock: p.stock.toString(),
      status: p.status,
      categoryId: p.categoryId,
      isHotOffer: !!p.isHotOffer,
    });
    setError(null);
    setIsEditModalOpen(true);
  }

  // Deep-link from header notifications: open specific product by id
  useEffect(() => {
    const id = props?.adminState?.selectedProduct;
    if (!id) return;
    (async () => {
      try {
        const p = await getProduct(String(id));
        openEdit(p);
      } catch (e) {
        // ignore if not found
      } finally {
        props?.updateAdminState?.({ selectedProduct: null });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props?.adminState?.selectedProduct]);

  // uploadFiles disabled to avoid S3 endpoint usage
  function uploadFiles(_files: FileList | File[]) {
    toast.error(t("app.notifications.error") || "Upload is disabled by configuration");
  }

  async function save() {
    setError(null);

    const name = (form.name || "").trim();
    let slug = (form.slug || "").trim();
    if (!slug && name) slug = slugify(name);

    if (!name || !slug || !form.categoryId) {
      setError(
        `${t("products.name")} / ${t("products.slug")} / ${t("products.category")} ${
          t("app.notifications.error") || ""
        }`
      );
      return;
    }

    const priceNum = parseNumberInput(form.price || "");
    const saleNum = form.salePrice.trim() !== "" ? parseNumberInput(form.salePrice) : 0;
    const stockNumParsed = parseNumberInput(form.stock || "");
    const stockNum = Number.isFinite(stockNumParsed) ? Math.trunc(stockNumParsed) : NaN;

    if (!isValidSlug(slug)) { setError(t("products.invalid_slug") || "Invalid slug format"); return; }
    if (!Number.isFinite(priceNum) || priceNum < 0 || priceNum > MAX_PRICE) { setError(t("products.invalid_price") || "Invalid price"); return; }
    if (form.salePrice.trim() !== "" && (!Number.isFinite(saleNum) || saleNum < 0 || saleNum > priceNum)) { setError(t("products.invalid_sale_price") || "Invalid sale price"); return; }
    if (!Number.isFinite(stockNum) || stockNum < 0 || stockNum > MAX_STOCK) { setError(t("products.invalid_stock") || "Invalid stock"); return; }

    const payload: Partial<Product> = {
      name,
      nameAr: form.nameAr || undefined,
      slug,
      description: form.description || undefined,
      descriptionAr: form.descriptionAr || undefined,
      isHotOffer: !!form.isHotOffer,
      priceCents: toCents(priceNum || 0),
      salePriceCents:
        form.salePrice.trim() !== "" ? toCents(saleNum || 0) : undefined,
      stock: stockNum,
      status: form.status,
      categoryId: form.categoryId,
      // keep sending additional images only if backend expects them; omit in create form-data
    };

    try {
      setSaving(true);
      if (editing?.id) {
        await updateProduct(editing.id, payload, form.imageFile || null);
        toast.success(t("products.updated") || "Product updated");
      } else {
        await createProduct(payload, form.imageFile || null);
        toast.success(t("products.created") || "Product created");
      }
      await load();
      setEditing(null);
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Failed to save product";
      console.error("create/update product error:", e);
      setError(String(msg));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    try {
      await deleteProduct(id);
      toast.success(t("products.deleted") || "Product deleted");
      await load();
    } catch (e: any) {
      toast.error(String(e?.response?.data?.message || e?.message || "Delete failed"));
    }
  }

  // derived stats
  const totalProducts = items.length;
  const activeProducts = items.filter((p) => p.status === "ACTIVE").length;
  const lowStock = items.filter((p) => p.stock > 0 && p.stock < 10).length;
  const outOfStock = items.filter((p) => p.stock === 0).length;

  // discount for UI preview in form
  const discountPercent = useMemo(() => {
    const priceNum = parseFloat(form.price || "0");
    const saleNum = parseFloat(form.salePrice || "0");
    return priceNum > 0 && saleNum > 0
      ? Math.round((1 - saleNum / priceNum) * 100)
      : null;
  }, [form.price, form.salePrice]);

  const ProductForm = ({ isEdit = false }: { isEdit?: boolean }) => {
    const idPrefix = isEdit ? "edit" : "add";
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const composingNameRef = React.useRef(false);

    function handleNameChange(next: string) {
      setForm((prev) => {
        const update: any = { ...prev, name: next };
        if (!prev.slug && !composingNameRef.current) {
          update.slug = slugify(next);
        }
        return update;
      });
    }
    useEffect(() => {
      if (form.imageFile) {
        const url = URL.createObjectURL(form.imageFile);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
      }
      setPreviewUrl(null);
    }, [form.imageFile]);
    return (
      <div className="w-full">
        

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-name`}>{t("products.name")}</Label>
            <Input
              id={`${idPrefix}-name`}
              placeholder={t("products.name") || "Product name"}
              value={form.name}
              onCompositionStart={() => { composingNameRef.current = true; }}
              onCompositionEnd={(e) => { composingNameRef.current = false; handleNameChange((e.target as HTMLInputElement).value); }}
              onChange={(e) => handleNameChange(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-nameAr`}>{t("products.nameAr", "Arabic Name")}</Label>
            <Input
              id={`${idPrefix}-nameAr`}
              placeholder={t("products.nameAr", "Arabic Name") as string}
              value={form.nameAr || ""}
              onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-slug`}>{t("products.slug")}</Label>
            <Input
              id={`${idPrefix}-slug`}
              placeholder={t("products.slug") || "slug"}
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">{t("products.category")}</Label>
            <Select
              value={form.categoryId || ""}
              onValueChange={(value) => setForm({ ...form, categoryId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("categories.title") || "Category"} />
              </SelectTrigger>
              <SelectContent>
                {cats.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-description`}>{t("products.description")}</Label>
            <Textarea
              id={`${idPrefix}-description`}
              placeholder={t("products.description") || "Description"}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-descriptionAr`}>{t("products.descriptionAr", "Arabic Description")}</Label>
            <Textarea
              id={`${idPrefix}-descriptionAr`}
              placeholder={t("products.descriptionAr", "Arabic Description") as string}
              value={form.descriptionAr || ""}
              onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })}
              rows={4}
            />
          </div>

          <div className="flex items-center gap-3">
            <Label>{t("products.isHotOffer", "Hot Offer")}</Label>
            <Switch checked={!!form.isHotOffer} onCheckedChange={(v) => setForm({ ...form, isHotOffer: v })} />
          </div>
        </div>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-price`}>{t("products.price")}</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id={`${idPrefix}-price`}
                inputMode="decimal"
                placeholder="0.00"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-salePrice`}>{t("products.salePrice")}</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id={`${idPrefix}-salePrice`}
                inputMode="decimal"
                placeholder="0.00"
                value={form.salePrice}
                onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>

          {discountPercent !== null && (
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700">
                {t("products.discount", "الخصم")}: {discountPercent}% {t("products.off", "خصم")}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-stock`}>{t("products.stock")}</Label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id={`${idPrefix}-stock`}
                inputMode="numeric"
                placeholder="0"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">{t("products.status")}</Label>
            <div className="flex items-center gap-3">
              <Switch
                id="status"
                checked={form.status === "ACTIVE"}
                onCheckedChange={(checked) =>
                  setForm({ ...form, status: checked ? "ACTIVE" : "HIDDEN" })
                }
              />
              <span className="text-sm">
                {form.status === "ACTIVE"
                  ? t("products.statuses.ACTIVE")
                  : t(`products.statuses.${form.status}`)}
              </span>
            </div>
          </div>
        </div>

        {/* Media */}
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-imageFile`}>{t("products.imageUrl", "Main Image")}</Label>
            <Input
              id={`${idPrefix}-imageFile`}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e: any) => {
                const file = e.target?.files?.[0] || null;
                const fixed = file ? normalizeImageFileType(file) : null;
                if (fixed && fixed.size > MAX_FILE_MB * 1024 * 1024) {
                  toast.error(t("products.upload.too_large", { size: MAX_FILE_MB }) || `File too large (> ${MAX_FILE_MB}MB)`);
                  return;
                }
                setForm({ ...form, imageFile: fixed });
              }}
            />
            {(form.imageFile || form.imageUrl) && (
              <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100">
                {form.imageFile ? (
                  <img src={previewUrl || undefined} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageWithFallback
                    src={form.imageUrl}
                    alt="preview"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("products.images")}</Label>
            <Input
              placeholder="url1,url2"
              value={form.images}
              onChange={(e) => setForm({ ...form, images: e.target.value })}
            />
          </div>

          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
            }}
          >
            <div className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-2">
              {t("products.media.hint", "ألصق روابط الصور بالأعلى (المعاينة تستخدم الصورة الرئيسية)")}
            </p>

            <Button
              variant="outline"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.multiple = true;
                input.onchange = (ev: any) => {
                  if (ev.target?.files?.length) uploadFiles(ev.target.files);
                };
                input.click();
              }}
            >
              {uploading ? t("app.loading", "Loading...") : t("app.actions.upload")}
            </Button>

            {uploading && (
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 transition-all"
                    style={{ width: `${uploadProgress ?? 10}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {uploadProgress ?? 10}% {t("app.loading", "Loading...")}
                </p>
              </div>
            )}
          </div>

          {null}

          {form.images && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {form.images.split(",").map((url, idx) => {
                const trimmed = url.trim();
                if (!trimmed) return null;
                const isMain = trimmed === form.imageUrl;
                return (
                  <div key={`${trimmed}-${idx}`} className="relative group">
                    <div className="w-full aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <ImageWithFallback
                        src={trimmed}
                        alt={`img-${idx}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute inset-x-1 -bottom-1 translate-y-full group-hover:translate-y-0 transition">
                      <div className="flex gap-1 mt-2">
                        <Button
                          size="sm"
                          variant={isMain ? "default" : "secondary"}
                          className="flex-1"
                          onClick={() => setMainImage(trimmed)}
                        >
                          {isMain ? t("common.profile", "Main") : t("app.actions.apply", "Set main")}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            const next = form.images
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean)
                              .filter((u) => u !== trimmed)
                              .join(",");
                            setForm((prev) => ({
                              ...prev,
                              images: next,
                              imageUrl: prev.imageUrl === trimmed ? "" : prev.imageUrl,
                            }));
                          }}
                        >
                          {t("app.actions.delete")}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2 mt-2">
            {String(error)}
          </div>
        )}

        <div className="flex gap-2 pt-6">
          <Button onClick={save} disabled={saving} className="flex-1">
            {saving
              ? t("auth.signing_in") || "Saving..."
              : isEdit
              ? t("app.actions.update") || "Update Product"
              : t("app.actions.create") || "Create Product"}
          </Button>
          <Button
            variant="outline"
            onClick={() => (isEdit ? setIsEditModalOpen(false) : setIsAddModalOpen(false))}
            className="flex-1"
            disabled={saving}
          >
            {t("app.actions.cancel")}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-poppins text-2xl lg:text-3xl text-gray-900" style={{ fontWeight: 700 }}>
            {t("products.title") || "Products Management"}
          </h1>
          <p className="text-gray-600 mt-1 text-sm lg:text-base">
            {t("products.subtitle", "إدارة كتالوج المنتجات")}
          </p>
        </div>

        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <Button className="flex items-center gap-2 w-full sm:w-auto" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              {t("products.addNew")}
          </Button>
          <DialogContent
            className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white dark:bg-slate-900"
          >
            <DialogHeader>
              <DialogTitle>{t("products.addNew")}</DialogTitle>
            </DialogHeader>
            <ProductForm />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <Card>
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-gray-600">{t("products.stats.total", "إجمالي المنتجات")}</p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900">{totalProducts}</p>
              </div>
              <Package className="w-6 h-6 lg:w-8 lg:h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-gray-600">{t("products.stats.active", "منتجات نشطة")}</p>
                <p className="text-xl lg:text-2xl font-bold text-green-600">
                  {activeProducts}
                </p>
              </div>
              <TrendingUp className="w-6 h-6 lg:w-8 lg:h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-gray-600">{t("products.stats.low", "نقص المخزون")}</p>
                <p className="text-xl lg:text-2xl font-bold text-yellow-600">
                  {lowStock}
                </p>
              </div>
              <AlertTriangle className="w-6 h-6 lg:w-8 lg:h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-gray-600">{t("products.stats.out", "غير متوفر")}</p>
                <p className="text-xl lg:text-2xl font-bold text-red-600">
                  {outOfStock}
                </p>
              </div>
              <TrendingDown className="w-6 h-6 lg:w-8 lg:h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-3 lg:p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:gap-4">
            <div className="relative flex-1 min-w-0">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={t("filters.searchPlaceholder") || "Search products..."}
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v: StatusFilter) => {
                setPage(1);
                setStatusFilter(v);
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder={t("products.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all", "الكل")}</SelectItem>
                <SelectItem value="DRAFT">{t("products.statuses.DRAFT")}</SelectItem>
                <SelectItem value="ACTIVE">{t("products.statuses.ACTIVE")}</SelectItem>
                <SelectItem value="HIDDEN">{t("products.statuses.HIDDEN")}</SelectItem>
                <SelectItem value="DISCONTINUED">{t("products.statuses.DISCONTINUED")}</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={categoryFilter}
              onValueChange={(v) => {
                setPage(1);
                setCategoryFilter(v);
              }}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder={t("products.category")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all", "الكل")}</SelectItem>
                {cats.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t("products.title")} ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 lg:p-6">
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("products.name")}</TableHead>
                  <TableHead>{t("products.category")}</TableHead>
                  <TableHead>{t("products.price")}</TableHead>
                  <TableHead>{t("products.stock")}</TableHead>
                  <TableHead>{t("products.status")}</TableHead>
                  <TableHead>{t("products.performance", "الأداء")}</TableHead>
                  <TableHead>{t("app.actions.actions", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length ? (
                  items.map((p) => {
                    const stockStatus = getStockStatus(p.stock);
                    const price = fromCents(p.priceCents);
                    const hasSale = p.salePriceCents && p.salePriceCents > 0;

                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                              <ImageWithFallback
                                src={p.imageUrl || (p.images && p.images[0]) || ""}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <p className="font-medium">{p.name}</p>
                              <p className="text-sm text-gray-600">{p.slug}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {cats.find((c) => c.id === p.categoryId)?.name || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {hasSale ? (
                            <div>
                              <span className="font-medium text-primary">
                                {fromCents(p.salePriceCents!).toFixed(2)}
                              </span>
                              <span className="text-sm text-gray-500 line-through ml-2">
                                {price.toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <span className="font-medium">{price.toFixed(2)}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <Badge className={stockStatus.color}>{stockStatus.label}</Badge>
                            <p className="text-sm text-gray-600 mt-1">
                              {p.stock} {t("products.units", "قطع")}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={p.status === "ACTIVE" ? "default" : "secondary"}
                            className={
                              p.status === "ACTIVE"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            }
                          >
                            {t(`products.statuses.${p.status}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              {(p.stock ?? 0) > 10 ? (
                                <TrendingUp className="w-3 h-3 text-green-600" />
                              ) : (
                                <TrendingDown className="w-3 h-3 text-red-600" />
                              )}
                              <span>
                                {(p.stock ?? 0) > 10
                                  ? t("products.trend.good", "جيد")
                                  : t("products.trend.low", "منخفض")}
                              </span>
                            </div>
                            <p className="text-gray-600">
                              {t("products.id", "المعرّف")}: {p.id.slice(0, 6)}…
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
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
                                    {t("products.delete", "حذف المنتج")}
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t(
                                      "products.deleteConfirm",
                                      "هل أنت متأكد من حذف هذا المنتج؟ هذا الإجراء لا يمكن التراجع عنه."
                                    )}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t("app.actions.cancel")}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => onDelete(p.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
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
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7}>{t("app.table.noData")}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center gap-2 justify-end p-4">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              {t("app.actions.prev")}
            </Button>
            <span className="text-sm">
              {t("app.table.page")} {page} {t("app.table.of")}{" "}
              {Math.max(1, Math.ceil(total / pageSize))}
            </span>
            <Button
              variant="outline"
              disabled={page * pageSize >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("app.actions.next")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Product Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent
          className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white dark:bg-slate-900"
        >
          <DialogHeader>
            <DialogTitle>{t("products.editProduct", "تعديل المنتج")}</DialogTitle>
          </DialogHeader>
          <ProductForm isEdit />
        </DialogContent>
      </Dialog>
    </div>
  );
}
