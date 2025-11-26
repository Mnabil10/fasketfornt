import type { PaginatedQuery, PagedResponse, Timestamped } from "./common";

export type LoyaltySettings = {
  loyaltyEnabled?: boolean;
  earnRate?: number;
  redeemRateValue?: number;
  minRedeemPoints?: number;
  maxRedeemPerOrder?: number;
  maxDiscountPercent?: number;
  resetThreshold?: number;
  // Backward-compatible fields some UIs expect
  earnPoints?: number;
  earnPerCents?: number;
  redeemRate?: number;
  redeemUnitCents?: number;
};

export type LoyaltyUserSummary = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  balance: number;
  totalEarned?: number;
  totalRedeemed?: number;
  totalAdjusted?: number;
};

export type LoyaltyTransactionType = "EARN" | "REDEEM" | "ADJUST";

export type LoyaltyTransaction = Timestamped & {
  id: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  userPhone?: string | null;
  type: LoyaltyTransactionType;
  points: number;
  reason?: string | null;
  orderId?: string | null;
};

export type LoyaltyTransactionFilters = PaginatedQuery & {
  userId?: string;
  type?: LoyaltyTransactionType;
  orderId?: string;
  fromDate?: string;
  toDate?: string;
};

export type LoyaltyAdjustPayload = {
  points: number;
  reason: string;
  orderId?: string;
};

export type LoyaltyTransactionsPaged = PagedResponse<LoyaltyTransaction>;

export type LoyaltySummary = {
  usersWithPoints: number;
  outstandingPoints: number;
  totalEarned: number;
  totalRedeemed: number;
  totalAdjusted: number;
};
