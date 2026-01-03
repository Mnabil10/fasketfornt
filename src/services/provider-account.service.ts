import { api } from "../lib/api";
import type { Provider } from "../types/provider";

export type ProviderPlan = {
  id: string;
  name: string;
  description?: string | null;
  billingInterval: "MONTHLY" | "YEARLY" | string;
  amountCents: number;
  currency: string;
  commissionRateBps?: number | null;
};

export type ProviderSubscription = {
  id: string;
  status: string;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  trialEndsAt?: string | null;
  plan?: ProviderPlan | null;
};

export type ProviderAccount = {
  provider: Provider;
  membership?: { role: string } | null;
  subscription?: ProviderSubscription | null;
};

export async function fetchProviderAccount() {
  const { data } = await api.get<ProviderAccount>("/api/v1/provider/me");
  return data;
}
