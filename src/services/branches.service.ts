import { api } from "../lib/api";
import { buildQueryParams } from "../lib/query";
import type { Branch, BranchFilters, BranchListResponse, BranchUpsertInput } from "../types/branch";

const BASE = "/api/v1/admin/branches";

export async function listBranches(filters?: BranchFilters) {
  const params = buildQueryParams(filters);
  const { data } = await api.get<BranchListResponse>(BASE, { params });
  return data;
}

export async function getBranch(id: string) {
  const { data } = await api.get<Branch>(`${BASE}/${id}`);
  return data;
}

export async function createBranch(payload: BranchUpsertInput) {
  const { data } = await api.post<Branch>(BASE, payload);
  return data;
}

export async function updateBranch(id: string, payload: BranchUpsertInput) {
  const { data } = await api.patch<Branch>(`${BASE}/${id}`, payload);
  return data;
}
