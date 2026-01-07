import { api } from "../lib/api";
import { buildQueryParams } from "../lib/query";
import type { Category, Paged } from "./categories.service";

export async function listProviderCategories(params?: {
  q?: string;
  parentId?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
  sort?: string;
}) {
  const query = buildQueryParams(params);
  const { data } = await api.get<Paged<Category>>("/api/v1/provider/categories", { params: query });
  return data;
}
