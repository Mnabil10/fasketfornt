// src/components/admin/AdminDashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { SidebarProvider } from "../ui/sidebar";
import { Sheet, SheetContent } from "../ui/sheet";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  LayoutDashboard,
  Package,
  Grid3x3,
  ShoppingCart,
  Users,
  Settings,
  ShoppingCartIcon,
  Search,
  Bell,
  User,
  LogOut,
  ChevronDown,
  Menu,
  Globe,
  Flame,
  Ticket,
  Truck,
  Store,
  MapPin,
  CreditCard,
} from "lucide-react";
const DashboardOverview = React.lazy(() =>
  import("./screens/DashboardOverview").then((m) => ({ default: m.DashboardOverview }))
);
const ProductsManagement = React.lazy(() =>
  import("./screens/ProductsManagement").then((m) => ({ default: m.ProductsManagement }))
);
import { CategoriesManagement } from "./screens/CategoriesManagement";
import { FasketProducts } from "./screens/FasketProducts";
import { OrdersManagement } from "./screens/OrdersManagement";
import { SettingsManagement } from "./screens/SettingsManagement";
import { CouponsManagement } from "./screens/CouponsManagement";
import { HotOffersList } from "./screens/HotOffers";
import { DeliveryDriversManagement } from "./screens/DeliveryDriversManagement";
import { DeliveryZonesManagement } from "./screens/DeliveryZonesManagement";
import { CustomersManagement } from "./screens/CustomersManagement";
import { AutomationOutboxPage } from "./screens/AutomationOutboxPage";
import { ProfitReportsPage } from "./screens/ProfitReportsPage";
import { SupportQueriesPage } from "./screens/SupportQueriesPage";
import { ProvidersManagement } from "./screens/ProvidersManagement";
import { BranchesManagement } from "./screens/BranchesManagement";
import { BillingManagement } from "./screens/BillingManagement";
import { useTranslation } from "react-i18next";
import BrandLogo from "../common/BrandLogo";
import { fetchDashboard, type DashboardSummary } from "../../services/dashboard.service";
import { useAuth } from "../../auth/AuthProvider";
import { usePermissions } from "../../auth/permissions";
import RequireCapability from "../../auth/RequireCapability";
import { useDirection } from "../../hooks/useDirection";
import { lookupOrder } from "../../services/orders.service";
import { toast } from "sonner";
import { getAdminErrorMessage } from "../../lib/errors";

export type AdminScreen =
  | "dashboard"
  | "providers"
  | "branches"
  | "categories"
  | "products"
  | "hot-offers"
  | "orders"
  | "customers"
  | "coupons"
  | "billing"
  | "settings"
  | "delivery-drivers"
  | "automation-outbox"
  | "reports"
  | "support";

export interface AdminState {
  currentScreen: AdminScreen;
  selectedCategory?: any;
  selectedProduct?: any;
  selectedOrder?: any;
  selectedCustomer?: any;
}

export type ScreenProps = {
  adminState: AdminState;
  updateAdminState: (updates: Partial<AdminState>) => void;
};

export function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const { user, isAdmin, signOut } = useAuth();
  const perms = usePermissions();
  useDirection();
  const location = useLocation();
  const navigate = useNavigate();
  const defaultScreen: AdminScreen = isAdmin ? "dashboard" : perms.canViewProfit ? "reports" : "products";
  const pathSegments = useMemo(() => location.pathname.replace(/^\/+/, "").split("/").filter(Boolean), [location.pathname]);
  const derivedScreen: AdminScreen =
    (pathSegments[0] as AdminScreen | undefined) &&
    (["dashboard", "providers", "branches", "categories", "products", "hot-offers", "orders", "customers", "coupons", "billing", "settings", "delivery-drivers", "automation-outbox", "reports", "support"] as const).includes(
      pathSegments[0] as AdminScreen
    )
      ? (pathSegments[0] as AdminScreen)
      : defaultScreen;
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [adminState, setAdminState] = useState<AdminState>(() => ({
    currentScreen: defaultScreen,
  }));
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [lookupTerm, setLookupTerm] = useState("");

  const lookupMutation = useMutation({
    mutationFn: (term: string) => lookupOrder({ code: term, phone: term }),
    onSuccess: (order) => {
      if (order?.id) {
        navigate(`/orders/${order.id}`);
        updateAdminState({ currentScreen: "orders", selectedOrder: order.id });
      } else {
        toast.error(t("orders.lookup_not_found", "No order found"));
      }
    },
    onError: (error) => toast.error(getAdminErrorMessage(error, t, t("orders.lookup_failed", "Lookup failed"))),
  });

  const role = (user?.role || "").toUpperCase();
  const accessibleScreens = useMemo<AdminScreen[]>(() => {
    const base: AdminScreen[] = ["categories", "products", "hot-offers", "orders"];
    const adminExtras: AdminScreen[] = ["dashboard", "providers", "branches", "customers", "billing", "coupons", "settings", "delivery-drivers"];
    const automationScreens: AdminScreen[] = perms.canViewAutomation ? ["automation-outbox"] : [];
    const profitScreens: AdminScreen[] = perms.canViewProfit ? ["reports"] : [];
    const supportScreens: AdminScreen[] = perms.canViewSupport ? ["support"] : [];
    if (role === "ADMIN") return [...base, ...adminExtras, ...automationScreens, ...profitScreens, ...supportScreens];
    if (role === "OPS_MANAGER") return [...base, "dashboard", ...automationScreens, ...supportScreens];
    if (role === "FINANCE") return ["dashboard", ...profitScreens];
    return [...base, ...automationScreens, ...profitScreens, ...supportScreens];
  }, [role, perms.canViewAutomation, perms.canViewProfit, perms.canViewSupport]);

  const screenToPath = (screen: AdminScreen) => (screen === "dashboard" ? "/" : `/${screen}`);

  useEffect(() => {
    if (!accessibleScreens.includes(derivedScreen)) return;
    setAdminState((prev) => ({ ...prev, currentScreen: derivedScreen }));
  }, [derivedScreen, accessibleScreens]);

  useEffect(() => {
    if (derivedScreen === "orders" && pathSegments[1]) {
      setAdminState((prev) => ({ ...prev, selectedOrder: pathSegments[1] }));
    }
  }, [derivedScreen, pathSegments]);

  const updateAdminState = (updates: Partial<AdminState>) => {
    if (updates.currentScreen && !accessibleScreens.includes(updates.currentScreen)) {
      return;
    }
    if (updates.currentScreen) {
      const target = screenToPath(updates.currentScreen);
      if (target !== location.pathname) {
        navigate(target);
      }
    }
    setAdminState((prev) => ({ ...prev, ...updates }));
  };

  // Live notifications from recent orders + low stock
  useEffect(() => {
    if (!isAdmin) {
      setSummary(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const s = await fetchDashboard();
        if (!cancelled) {
          setSummary(s);
        }
      } catch (e) {
        // ignore; header/side can render without
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  // Ensure users cannot stay on screens outside their role permissions
  useEffect(() => {
    if (!accessibleScreens.includes(adminState.currentScreen)) {
      setAdminState((prev) => ({ ...prev, currentScreen: defaultScreen }));
    }
  }, [accessibleScreens, adminState.currentScreen, defaultScreen]);
  const notifications = useMemo(() => {
    const items: Array<{ id: string|number; title: string; message: string; time?: string; type: string; payload?: Record<string, any> }>=[];
    if (summary?.recent?.length) {
      for (const r of summary.recent.slice(0, 5)) {
        items.push({
          id: r.id,
          title: t("common.new_order"),
          message: t("orders.listTitle", { count: 1 }) + ` #${r.id}`,
          type: "order",
          payload: { orderId: r.id },
        });
      }
    }
    if (summary?.lowStock?.length) {
      for (const ls of summary.lowStock.slice(0, 3)) {
        items.push({
          id: `ls-${ls.id}`,
          title: t("common.low_stock"),
          message: t("common.low_stock_msg", { product: ls.name, count: ls.stock }),
          type: "stock",
          payload: { productId: ls.id },
        });
      }
    }
    return items;
  }, [summary, t]);

  const handleMenuItemClick = (screen: AdminScreen) => {
    updateAdminState({ currentScreen: screen });
    setIsMobileSidebarOpen(false);
  };

  const menuItems = useMemo(() => {
    const ordersCount = summary?.sales?.totalOrders ?? null;
    const customersCount = summary?.customersCount ?? null;
    const lowStockCount = summary?.lowStock?.length ?? null;
    const all = [
      { id: "dashboard" as const, icon: LayoutDashboard, badge: null },
      { id: "providers" as const, icon: Store, badge: null },
      { id: "branches" as const, icon: MapPin, badge: null },
      { id: "categories" as const, icon: Grid3x3, badge: null },
      { id: "products" as const, icon: Package, badge: lowStockCount && lowStockCount > 0 ? lowStockCount : null },
      { id: "hot-offers" as const, icon: Flame, badge: null },
      { id: "orders" as const, icon: ShoppingCart, badge: ordersCount },
      { id: "delivery-drivers" as const, icon: Truck, badge: null },
      { id: "customers" as const, icon: Users, badge: customersCount },
      { id: "billing" as const, icon: CreditCard, badge: null },
      { id: "coupons" as const, icon: Ticket, badge: null },
      { id: "settings" as const, icon: Settings, badge: null },
      { id: "automation-outbox" as const, icon: Bell, badge: null },
      { id: "reports" as const, icon: LayoutDashboard, badge: null },
      { id: "support" as const, icon: User, badge: null },
    ] as Array<{ id: AdminScreen; icon: any; badge: number | null }>;
    return all.filter((item) => accessibleScreens.includes(item.id));
  }, [summary, accessibleScreens]);

  const defaultLabels: Record<AdminScreen, string> = {
    dashboard: "Dashboard",
    providers: "Providers",
    branches: "Branches",
    categories: "Categories",
    products: "Products",
    "hot-offers": "Hot Offers",
    orders: "Orders",
    customers: "Customers",
    coupons: "Coupons",
    billing: "Billing",
    settings: "Settings",
    "delivery-drivers": "Delivery Drivers",
    "automation-outbox": "Automation Outbox",
    reports: "Profit Reports",
    support: "Support",
  };

  const labelFor = (id: AdminScreen) => t(`menu.${id}`, { defaultValue: defaultLabels[id] });

  const SidebarMenuContent = () => (
    <>
      {/* Brand / Header */}
      <div className="p-6 border-b bg-sidebar text-sidebar-foreground border-sidebar-border">
        <div
          className={`flex items-center ${
            i18n.language === "ar" ? "space-x-reverse" : ""
          } space-x-3`}
        >
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-primary/10 flex items-center justify-center shadow-sm">
            <BrandLogo size={36} />
          </div>
          <div>
            <h1 className="font-poppins text-xl text-foreground font-semibold">
              {t("common.app_name")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("common.admin_panel")}</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="px-3 py-4 bg-sidebar text-sidebar-foreground">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const active = derivedScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleMenuItemClick(item.id)}
                className={[
                  "flex items-center justify-between w-full p-3 rounded-lg transition-all",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground border-r-2 border-sidebar-primary"
                    : "hover:bg-muted text-foreground",
                ].join(" ")}
              >
                <div
                  className={`flex items-center ${
                    i18n.language === "ar" ? "space-x-reverse" : ""
                  } space-x-3`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{labelFor(item.id)}</span>
                </div>
                {item.badge && (
                  <Badge
                    variant="secondary"
                    className="bg-muted text-muted-foreground text-xs"
                  >
                    {item.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );

    const LanguageSwitch = () => (
    <Button
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
      onClick={() => i18n.changeLanguage(i18n.language === "en" ? "ar" : "en")}
      title={i18n.language === "en" ? "Switch to Arabic" : "Switch to English"}
    >
      <Globe className="w-4 h-4" />
      <span>{i18n.language === "en" ? "AR" : "EN"}</span>
    </Button>
  );

  const renderScreen = () => {
    const p = { adminState, updateAdminState } as any;
    const secondary = pathSegments[1];
    const tertiary = pathSegments[2];

    if (derivedScreen === "settings" && secondary === "delivery-zones") {
      return <DeliveryZonesManagement />;
    }

    switch (derivedScreen) {
      case "dashboard":
        return (
          <React.Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
            <DashboardOverview {...p} />
          </React.Suspense>
        );
      case "providers":
        return <ProvidersManagement />;
      case "branches":
        return <BranchesManagement />;
      case "categories":
        return <CategoriesManagement {...p} />;
      case "products":
        if (secondary === "manage") {
          return (
            <React.Suspense fallback={<div className="p-6 text-sm text-muted-foreground">{t("app.loading", "Loading...")}</div>}>
              <ProductsManagement productId={tertiary} onDone={() => navigate("/products")} />
            </React.Suspense>
          );
        }
        return <FasketProducts />;
      case "hot-offers":
        return <HotOffersList {...p} />;
      case "orders":
        return <OrdersManagement initialOrderId={secondary} />;
      case "customers":
        return <CustomersManagement />;
      case "billing":
        return <BillingManagement />;
      case "coupons":
        return <CouponsManagement {...p} />;
      case "settings":
        return <SettingsManagement {...p} initialSection={secondary} />;
      case "delivery-drivers":
        return <DeliveryDriversManagement />;
      case "automation-outbox":
        return (
          <RequireCapability capability="automation:view">
            <AutomationOutboxPage />
          </RequireCapability>
        );
      case "reports":
        return (
          <RequireCapability capability="reports:profit">
            <ProfitReportsPage />
          </RequireCapability>
        );
      case "support":
        return (
          <RequireCapability capability="support:view">
            <SupportQueriesPage />
          </RequireCapability>
        );
      default:
        return <DashboardOverview {...p} />;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background text-foreground">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 border-r bg-sidebar text-sidebar-foreground border-sidebar-border">
          <SidebarMenuContent />
        </aside>

        {/* Mobile Sidebar */}
        <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground">
            <SidebarMenuContent />
          </SheetContent>
        </Sheet>

        {/* Main Column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <div className="bg-card text-card-foreground border-b border-border px-4 lg:px-6 py-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile Menu Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden p-2"
                  onClick={() => setIsMobileSidebarOpen(true)}
                >
                  <Menu className="w-5 h-5" />
                </Button>

                <h2 className="font-poppins text-xl lg:text-2xl truncate font-semibold">
                  {labelFor(derivedScreen)}
                </h2>
              </div>

              <div
                className={`flex flex-wrap items-center ${
                  i18n.language === "ar" ? "gap-2" : "gap-2"
                } lg:gap-4 md:justify-end`}
              >
                {/* Search */}
                <div className="relative hidden md:block">
                  <Search
                    className={`absolute ${
                      i18n.language === "ar" ? "right-3" : "left-3"
                    } top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4`}
                  />
                  <Input
                    placeholder={t("common.search_placeholder") as string}
                    value={lookupTerm}
                    onChange={(e) => setLookupTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && lookupTerm.trim()) {
                        lookupMutation.mutate(lookupTerm.trim());
                      }
                    }}
                    className={`pl-10 w-48 lg:w-64 h-10 bg-[var(--input-background)] border-border rounded-lg ${
                      i18n.language === "ar" ? "pr-10 pl-3 text-right" : ""
                    }`}
                  />
                </div>

                {/* Language */}
                <LanguageSwitch />

                {/* Notifications */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="relative p-2">
                      <Bell className="w-5 h-5" />
                      <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground">
                        {notifications.length}
                      </Badge>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    <div className="p-3 border-b border-border">
                      <h3 className="font-medium">{t("settings.notifications")}</h3>
                    </div>
                    {notifications.map((n) => {
                      const toScreen: AdminScreen = n.type === "order" ? "orders" : n.type === "stock" ? "products" : "dashboard";
                      return (
                        <DropdownMenuItem
                          key={n.id}
                          className="p-3 border-b last:border-b-0 border-border cursor-pointer"
                          onClick={() => {
                            if (toScreen === "orders" && (n as any).payload?.orderId) {
                              const orderId = (n as any).payload?.orderId;
                              if (orderId) {
                                navigate(`/orders/${orderId}`);
                                updateAdminState({ currentScreen: "orders", selectedOrder: orderId });
                              }
                            } else if (toScreen === "products" && (n as any).payload?.productId) {
                              updateAdminState({ currentScreen: "products", selectedProduct: (n as any).payload.productId });
                            } else {
                              handleMenuItemClick(toScreen);
                            }
                          }}
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">{n.title}</p>
                            <p className="text-sm text-muted-foreground">{n.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">{n.time}</p>
                          </div>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* User */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="flex items-center gap-2 lg:gap-3 p-2 hover:bg-muted rounded-lg"
                      variant="ghost"
                    >
                      <div
                        className={`${
                          i18n.language === "ar" ? "text-left" : "text-right"
                        } hidden sm:block`}
                      >
                        <p className="font-medium text-sm">{user?.name || t("common.admin_user")}</p>
                        <p className="text-xs text-muted-foreground">{user?.email || user?.phone || t("common.admin_email")}</p>
                      </div>
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-primary-foreground text-sm font-medium">A</span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem>
                      <User className="w-4 h-4 mr-2" />
                      {t("common.profile")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateAdminState({ currentScreen: "settings" })}>
                      <Settings className="w-4 h-4 mr-2" />
                      {t("settings.title")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={async () => {
                        await signOut();
                      }}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      {t("common.logout")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto bg-background">{renderScreen()}</div>
        </div>
      </div>
    </SidebarProvider>
  );
}
