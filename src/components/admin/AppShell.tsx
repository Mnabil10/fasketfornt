import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardOverview } from "./screens/DashboardOverview";
import { CategoriesManagement } from "./screens/CategoriesManagement";
import { ProductsManagement } from "./screens/ProductsManagement";
import { OrdersManagement } from "./screens/OrdersManagement";
import { CustomersManagement } from "./screens/CustomersManagement";
import { SettingsManagement } from "./screens/SettingsManagement";
import { logout } from "../../services/auth.service";

type Screen = "dashboard" | "categories" | "products" | "orders" | "customers" | "settings";

export function AppShell() {
  const { t } = useTranslation();
  const [screen, setScreen] = useState<Screen>("dashboard");

  return (
    <div className="min-h-screen grid md:grid-cols-[260px_1fr] bg-background text-foreground">
      <aside className="border-l md:border-l-0 md:border-r p-4 space-y-2">
        <div className="text-xl font-bold mb-4">{t("app.title")}</div>

        <nav className="flex flex-col gap-2">
          <button className={`text-right ${screen==="dashboard"?"font-semibold":""}`} onClick={() => setScreen("dashboard")}>
            {t("nav.dashboard")}
          </button>
          <button className={`text-right ${screen==="categories"?"font-semibold":""}`} onClick={() => setScreen("categories")}>
            {t("nav.categories")}
          </button>
          <button className={`text-right ${screen==="products"?"font-semibold":""}`} onClick={() => setScreen("products")}>
            {t("nav.products")}
          </button>
          <button className={`text-right ${screen==="orders"?"font-semibold":""}`} onClick={() => setScreen("orders")}>
            {t("nav.orders")}
          </button>
          <button className={`text-right ${screen==="customers"?"font-semibold":""}`} onClick={() => setScreen("customers")}>
            {t("nav.customers")}
          </button>
          <button className={`text-right ${screen==="settings"?"font-semibold":""}`} onClick={() => setScreen("settings")}>
            {t("nav.settings")}
          </button>
        </nav>

        <div className="pt-6">
          <button className="text-right text-red-600" onClick={() => { logout(); location.reload(); }}>
            {t("nav.logout")}
          </button>
        </div>
      </aside>

      <main className="p-4">
        {screen === "dashboard"  && <DashboardOverview />}
        {screen === "categories" && <CategoriesManagement />}
        {screen === "products"   && <ProductsManagement />}
        {screen === "orders"     && <OrdersManagement />}
        {screen === "customers"  && <CustomersManagement />}
        {screen === "settings"   && <SettingsManagement />}
      </main>
    </div>
  );
}
