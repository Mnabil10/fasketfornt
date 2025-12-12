import { useAuth } from "./AuthProvider";

export type Capability =
  | "automation:replay"
  | "automation:view"
  | "orders:update"
  | "orders:assign-driver"
  | "orders:cancel"
  | "orders:view-history"
  | "orders:view-pii"
  | "reports:profit"
  | "support:view";

const ROLE_CAPABILITIES: Record<string, Capability[]> = {
  ADMIN: [
    "automation:replay",
    "automation:view",
    "orders:update",
    "orders:assign-driver",
    "orders:cancel",
    "orders:view-history",
    "orders:view-pii",
    "reports:profit",
    "support:view",
  ],
  OPS_MANAGER: [
    "automation:view",
    "orders:update",
    "orders:assign-driver",
    "orders:cancel",
    "orders:view-history",
    "orders:view-pii",
  ],
  FINANCE: ["reports:profit", "orders:view-pii"],
  STAFF: ["automation:view", "support:view"],
};

export function hasCapability(role: string | undefined | null, capability: Capability) {
  if (!role) return false;
  const caps = ROLE_CAPABILITIES[role.toUpperCase()] || [];
  return caps.includes(capability);
}

export function usePermissions() {
  const { user } = useAuth();
  const role = (user?.role || "").toUpperCase();
  return {
    role,
    canReplayAutomation: hasCapability(role, "automation:replay"),
    canViewAutomation: hasCapability(role, "automation:view"),
    canUpdateOrders: hasCapability(role, "orders:update"),
    canAssignDriver: hasCapability(role, "orders:assign-driver"),
    canCancelOrder: hasCapability(role, "orders:cancel"),
    canViewHistory: hasCapability(role, "orders:view-history"),
    canViewPII: hasCapability(role, "orders:view-pii"),
    canViewProfit: hasCapability(role, "reports:profit"),
    canViewSupport: hasCapability(role, "support:view"),
    has: (cap: Capability) => hasCapability(role, cap),
  };
}
