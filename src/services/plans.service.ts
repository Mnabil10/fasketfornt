import { api } from "../lib/api";
import { buildQueryParams } from "../lib/query";
import type { Plan, PlanFilters, PlanListResponse, PlanUpsertInput } from "../types/plan";

const BASE = "/api/v1/admin/plans";

export async function listPlans(filters?: PlanFilters) {
  const params = buildQueryParams(filters);
  const { data } = await api.get<PlanListResponse>(BASE, { params });
  return data;
}

export async function getPlan(id: string) {
  const { data } = await api.get<Plan>(`${BASE}/${id}`);
  return data;
}

export async function createPlan(payload: PlanUpsertInput) {
  const { data } = await api.post<Plan>(BASE, payload);
  return data;
}

export async function updatePlan(id: string, payload: PlanUpsertInput) {
  const { data } = await api.patch<Plan>(`${BASE}/${id}`, payload);
  return data;
}
