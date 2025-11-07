// src/components/admin/AdminDashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
const DashboardOverview = React.lazy(() =>
  import("./screens/DashboardOverview").then((m) => ({ default: m.DashboardOverview }))
);
import { CategoriesManagement } from "./screens/CategoriesManagement";
import { ProductsManagement } from "./screens/ProductsManagement";
import { OrdersManagement } from "./screens/OrdersManagement";
import { CustomersManagement } from "./screens/CustomersManagement";
import { SettingsManagement } from "./screens/SettingsManagement";
import { CouponsManagement } from "./screens/CouponsManagement";
import { HotOffersList } from "./screens/HotOffers";
import { useTranslation } from "react-i18next";
import BrandLogo from "../common/BrandLogo";
import { fetchDashboard, type DashboardSummary } from "../../services/dashboard.service";
import { useAuth } from "../../auth/AuthProvider";

export type AdminScreen =
  | "dashboard"
  | "categories"
  | "products"
  | "hot-offers"
  | "orders"
  | "customers"
  | "coupons"
  | "settings";

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
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [adminState, setAdminState] = useState<AdminState>({
    currentScreen: "dashboard",
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Auto set dir/lang (RTL)
  useEffect(() => {
    const dir = i18n.language === "ar" ? "rtl" : "ltr";
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const updateAdminState = (updates: Partial<AdminState>) =>
    setAdminState((prev) => ({ ...prev, ...updates }));

  // Live notifications from recent orders + low stock
  useEffect(() => {
    (async () => {
      try {
        const s = await fetchDashboard();
        setSummary(s);
      } catch (e) {
        // ignore; header/side can render without
      }
    })();
  }, []);

  // If staff lands on dashboard, redirect to products
  useEffect(() => {
    const role = (user?.role || '').toUpperCase();
    if (role !== 'ADMIN' && adminState.currentScreen === 'dashboard') {
      updateAdminState({ currentScreen: 'products' });
    }
  }, [user?.role]);
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
      { id: "categories" as const, icon: Grid3x3, badge: null },
      { id: "products" as const, icon: Package, badge: lowStockCount && lowStockCount > 0 ? lowStockCount : null },
      { id: "hot-offers" as const, icon: Flame, badge: null },
      { id: "orders" as const, icon: ShoppingCart, badge: ordersCount },
      { id: "customers" as const, icon: Users, badge: customersCount },
      { id: "coupons" as const, icon: Ticket, badge: null },
      { id: "settings" as const, icon: Settings, badge: null },
    ] as Array<{ id: AdminScreen; icon: any; badge: number | null }>;
    // Role-based filtering: staff can see customers for password reset
    const role = (user?.role || '').toUpperCase();
    if (role !== 'ADMIN') {
      const allowed: AdminScreen[] = ['categories','products','hot-offers','orders','customers'];
      return all.filter(i => allowed.includes(i.id));
    }
    return all;
  }, [summary, user?.role]);

  const labelFor = (id: AdminScreen) => t(`menu.${id}`);

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
            const active = adminState.currentScreen === item.id;
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
      title={i18n.language === "en" ? "Switch to Arabic" : "التبديل إلى الإنجليزية"}
    >
      <Globe className="w-4 h-4" />
      <span>{i18n.language === "en" ? "عربي" : "EN"}</span>
    </Button>
  );

  const renderScreen = () => {
    const p = { adminState, updateAdminState } as any;
    switch (adminState.currentScreen) {
      case "dashboard":
        return (
          <React.Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
            <DashboardOverview {...p} />
          </React.Suspense>
        );
      case "categories":
        return <CategoriesManagement {...p} />;
      case "products":
        return <ProductsManagement {...p} />;
      case "hot-offers":
        return <HotOffersList {...p} />;
      case "orders":
        return <OrdersManagement {...p} />;
      case "customers":
        return <CustomersManagement {...p} />;
      case "coupons":
        return <CouponsManagement {...p} />;
      case "settings":
        return <SettingsManagement {...p} />;
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
            <div className="flex items-center justify-between gap-4">
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
                  {labelFor(adminState.currentScreen)}
                </h2>
              </div>

              <div
                className={`flex items-center ${
                  i18n.language === "ar" ? "gap-2" : "gap-2"
                } lg:gap-4`}
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
                              updateAdminState({ currentScreen: "orders", selectedOrder: (n as any).payload.orderId });
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
                      onClick={() => {
                        localStorage.removeItem("fasket_admin_token");
                        localStorage.removeItem("fasket_admin_user");
                        location.reload();
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
