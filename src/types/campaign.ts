export type CampaignStatus = "DRAFT" | "SCHEDULED" | "SENT" | "CANCELED";
export type CampaignChannel = "PUSH" | "SMS" | "WHATSAPP" | "EMAIL";

export type MarketingCampaign = {
  id: string;
  name: string;
  title?: string | null;
  message: string;
  channel: CampaignChannel;
  status: CampaignStatus;
  segment?: Record<string, unknown> | null;
  payload?: Record<string, unknown> | null;
  scheduledAt?: string | null;
  sentAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CampaignsResponse = {
  items: MarketingCampaign[];
  total: number;
  page: number;
  pageSize: number;
};
