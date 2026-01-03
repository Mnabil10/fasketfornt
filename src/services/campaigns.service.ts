import { api } from "../lib/api";
import type { CampaignChannel, CampaignStatus, CampaignsResponse, MarketingCampaign } from "../types/campaign";
import { buildQueryParams } from "../lib/query";

export async function listCampaigns(params?: {
  page?: number;
  pageSize?: number;
  status?: CampaignStatus;
  channel?: CampaignChannel;
  q?: string;
}) {
  const query = buildQueryParams(params);
  const { data } = await api.get<CampaignsResponse>("/api/v1/admin/campaigns", { params: query });
  return data;
}

export async function createCampaign(payload: {
  name: string;
  title?: string;
  message: string;
  channel?: CampaignChannel;
  scheduledAt?: string | null;
  segment?: Record<string, unknown> | null;
  payload?: Record<string, unknown> | null;
}) {
  const { data } = await api.post<MarketingCampaign>("/api/v1/admin/campaigns", payload);
  return data;
}

export async function updateCampaign(
  id: string,
  payload: Partial<{
    name: string;
    title: string;
    message: string;
    channel: CampaignChannel;
    status: CampaignStatus;
    scheduledAt: string | null;
    segment: Record<string, unknown> | null;
    payload: Record<string, unknown> | null;
  }>
) {
  const { data } = await api.patch<MarketingCampaign>(`/api/v1/admin/campaigns/${id}`, payload);
  return data;
}

export async function emitCampaign(id: string) {
  const { data } = await api.post<{ success: boolean }>(`/api/v1/admin/campaigns/${id}/emit`);
  return data;
}
