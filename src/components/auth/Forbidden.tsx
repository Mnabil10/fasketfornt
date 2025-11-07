
import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import { useAuth } from "../../auth/AuthProvider";
import { useNavigate } from "react-router-dom";

export default function Forbidden() {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-2">{t("auth.forbidden_title")}</h1>
        <p className="text-gray-600 mb-6">{t("auth.forbidden_desc")}</p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate("/signin")}>{t("auth.back_to_login")}</Button>
          <Button variant="destructive" onClick={() => { signOut(); navigate("/signin", { replace: true }); }}>
            {t("auth.logout")}
          </Button>
        </div>
      </div>
    </div>
  );
}
