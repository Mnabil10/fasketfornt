import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useTranslation } from "react-i18next";
import { adminLogin } from "../../services/auth.service";
import { useAuth } from "../../auth/AuthProvider";
import { useLocation, useNavigate } from "react-router-dom";
import { ShoppingCartIcon } from "lucide-react";
import BrandLogo from "../common/BrandLogo";
import { useDirection } from "../../hooks/useDirection";

// 1) Helpers: trim + إزالة مسافات خفية + تحويل أرقام عربية/فارسي إلى لاتيني
function normalizeDigits(s: string) {
  const map: Record<string, string> = {
    // Arabic-Indic ٠١٢٣٤٥٦٧٨٩
    "٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9",
    // Eastern-Arabic (Persian) ۰۱۲۳۴۵۶۷۸۹
    "۰":"0","۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9"
  };
  return s.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (d) => map[d] ?? d);
}
function cleanPhone(raw: string) {
  // إزالة مسافات بيضاء + محارف تحكّم + تحويل أرقام عربية
  const t = normalizeDigits(raw).replace(/\s|\u200E|\u200F|\u202A|\u202B|\u202C|\u202D|\u202E/g, "");
  // السماح بـ + في أول الرقم فقط وباقيها أرقام
  return t.replace(/(?!^)\+/g, "").trim();
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase());
}

// 2) Identifier schema: phone or email
const identifierSchema = z
  .string()
  .transform((v) => normalizeDigits(v).trim())
  .refine((v) => {
    if (!v) return false;
    if (isEmail(v)) return true;
    const cleaned = cleanPhone(v);
    return /^(\+?\d{8,15})$/.test(cleaned);
  }, { message: "invalid_identifier" })
  .transform((v) => (isEmail(v) ? v.toLowerCase() : cleanPhone(v)));

const schema = z.object({
  identifier: identifierSchema,
  password: z.string().min(4, { message: "invalid_password" }).max(128)
});

type FormValues = z.infer<typeof schema>;

export default function SignIn() {
  const { t, i18n } = useTranslation();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const from = location.state?.from?.pathname || "/";
  useDirection();

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: "", password: "" },
    mode: "onSubmit"
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      setLoading(true);
      // نضمن تنظيف الرقم قبل الإرسال
      const identifier = values.identifier;
      setValue("identifier", identifier, { shouldValidate: false });

      const res = await adminLogin(identifier, values.password);

      // لو الحساب مش ADMIN نمنع الدخول
      const normalizedRole = (res.user?.role || "").toUpperCase();
      if (!["ADMIN", "STAFF"].includes(normalizedRole)) {
        setServerError(t("auth.not_admin") as string);
        return;
      }

      signIn({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        user: { ...res.user, role: normalizedRole }
      });
      navigate(from, { replace: true });
    } catch (e: any) {
      // إظهار رسالة الخادم لو موجودة
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        (i18n.language === "ar" ? "فشل تسجيل الدخول" : "Login failed");
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <BrandLogo size={42} />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center mb-1">{t("auth.sign_in_title")}</h1>
          <p className="text-sm text-center text-gray-600 mb-6">{t("auth.sign_in_subtitle")}</p>

          {/* Server error (credentials/role) */}
          {serverError && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {serverError}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div>
              <label className="block text-sm mb-1">
                {t("auth.identifier_label", "Phone or Email")}
              </label>
              <Input
                type="text"
                placeholder={t("auth.identifier_placeholder", "+201234567890 or user@fasket.com") as string}
                className={`h-11 ${i18n.language === "ar" ? "text-right" : ""}`}
                {...register("identifier")}
              />
              {errors.identifier && (
                <p className="text-xs text-red-600 mt-1">
                  {t("auth.invalid_identifier", "Enter a valid phone number or email")}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm mb-1">{t("auth.password")}</label>
              <Input
                type="password"
                placeholder="••••••••"
                className={`h-11 ${i18n.language === "ar" ? "text-right" : ""}`}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-red-600 mt-1">{t("auth.invalid_password")}</p>
              )}
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? t("auth.signing_in") : t("auth.sign_in_btn")}
            </Button>
          </form>

          <div className="flex items-center justify-between mt-6 text-sm text-gray-600">
            <span>{t("auth.footer_note")}</span>
            <button
              className="underline"
              onClick={() => i18n.changeLanguage(i18n.language === "en" ? "ar" : "en")}
            >
              {i18n.language === "en" ? "عربي" : "EN"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-4">
          {t("common.app_name")} · {t("common.admin_panel")}
        </p>
      </div>
    </div>
  );
}
