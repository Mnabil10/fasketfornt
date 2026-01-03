import type { Timestamped, PagedResponse, PaginatedQuery, FileResource } from "./common";

export type ProductStatus = "DRAFT" | "ACTIVE" | "HIDDEN" | "DISCONTINUED";

export type Product = Timestamped & {
  id: string;
  name: string;
  nameAr?: string;
  slug: string;
  description?: string | null;
  descriptionAr?: string | null;
  isHotOffer?: boolean;
  imageUrl?: string | null;
  images?: Array<string | FileResource>;
  priceCents: number;
  salePriceCents?: number | null;
  stock: number;
  status: ProductStatus;
  categoryId: string;
  sku?: string | null;
  providerId?: string | null;
};

export type ProductFilters = PaginatedQuery & {
  q?: string;
  categoryId?: string;
  providerId?: string;
  status?: ProductStatus;
  minPriceCents?: number;
  maxPriceCents?: number;
  inStock?: boolean;
  isHotOffer?: boolean;
  orderBy?: "createdAt" | "priceCents" | "name";
  sort?: "asc" | "desc";
};

export type ProductsPaged = PagedResponse<Product>;
