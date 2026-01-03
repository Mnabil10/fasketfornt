import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useTranslation } from "react-i18next";
import { adminLogin } from "../../services/auth.service";
import { useAuth } from "../../auth/AuthProvider";
import { Link, useLocation, useNavigate, type Location } from "react-router-dom";
import BrandLogo from "../common/BrandLogo";
import { useDirection } from "../../hooks/useDirection";
import { getAdminErrorMessage, getErrorCode } from "../../lib/errors";

function normalizeDigits(value: string) {
  return value
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

function cleanPhone(raw: string) {
  const cleaned = normalizeDigits(raw).replace(/\s|\u200e|\u200f|\u202a|\u202b|\u202c|\u202d|\u202e/g, "");
  return cleaned.replace(/(?!^)\+/g, "").trim();
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase());
}

const identifierSchema = z
  .string({ required_error: "validation.required" })
  .transform((v) => normalizeDigits(v).trim())
  .refine((v) => !!v, { message: "validation.required" })
  .refine((v) => isEmail(v) || /^(\+?\d{8,15})$/.test(cleanPhone(v)), { message: "validation.identifier" })
  .transform((v) => (isEmail(v) ? v.toLowerCase() : cleanPhone(v)));

const passwordSchema = z
  .string({ required_error: "validation.required" })
  .min(8, { message: "validation.password" })
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), { message: "validation.password" });

const otpSchema = z
  .string()
  .optional()
  .transform((v) => (v ? v.trim() : ""))
  .refine((v) => v === "" || /^\d{4,8}$/.test(v), { message: "auth.invalid_otp" });

const schema = z.object({
  identifier: identifierSchema,
  password: passwordSchema,
  otp: otpSchema,
});

type FormValues = z.infer<typeof schema>;

export default function SignIn() {
  const { t, i18n } = useTranslation();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location } | undefined)?.from?.pathname || "/";
  useDirection();

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [requireOtp, setRequireOtp] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: "", password: "", otp: "" },
    mode: "onSubmit",
  });

  const renderError = (message?: string) =>
    message ? <p className="text-xs text-red-600 mt-1">{t(message, { defaultValue: message })}</p> : null;

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const otp = requireOtp ? watch("otp" as any) : undefined;
    if (requireOtp && (!otp || String(otp).trim().length < 4)) {
      setServerError(t("auth.otp_required", "Enter the 2FA code to continue"));
      return;
    }

    try {
      setLoading(true);
      const identifier = values.identifier;
      setValue("identifier", identifier, { shouldValidate: false });

      const res = await adminLogin(identifier, values.password, otp as string | undefined);
      const normalizedRole = (res.user?.role || "").toUpperCase();
      if (!["ADMIN", "STAFF", "OPS_MANAGER", "FINANCE", "PROVIDER"].includes(normalizedRole)) {
        setServerError(t("auth.not_admin") as string);
        return;
      }

      signIn({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        user: { ...res.user, role: normalizedRole },
      });
      setRequireOtp(false);
      navigate(from, { replace: true });
    } catch (e: unknown) {
      const code = getErrorCode(e);
      if (code === "AUTH_ACCOUNT_DISABLED") {
        setServerError(t("auth.account_pending", "Account pending admin approval"));
      } else if (code === "INVALID_CREDENTIALS") {
        setServerError(t("errors.INVALID_CREDENTIALS", "Incorrect email or password"));
      } else if (code === "AUTH_2FA_REQUIRED") {
        setRequireOtp(true);
        setServerError(t("auth.otp_required", "Two-factor code required. Check your authenticator app."));
      } else if (code === "INVALID_OTP") {
        setRequireOtp(true);
        setServerError(t("auth.invalid_otp", "Invalid 2FA code. Try again."));
      } else {
        setServerError(getAdminErrorMessage(e, t, t("auth.login_failed", "Login failed. Check your phone and password.")));
      }
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

          {serverError && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {serverError}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div>
              <label className="block text-sm mb-1">
                {t("auth.identifier_label", "Phone or Email")} <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                placeholder={t("auth.identifier_placeholder", "+201234567890 or user@fasket.com") as string}
                className={`h-11 ${i18n.language === "ar" ? "text-right" : ""}`}
                inputMode="email"
                {...register("identifier")}
              />
              {renderError(errors.identifier?.message)}
              <p className="text-xs text-muted-foreground mt-1">{t("validation.phone")}</p>
            </div>

            <div>
              <label className="block text-sm mb-1">
                {t("auth.password")} <span className="text-rose-500">*</span>
              </label>
              <Input
                type="password"
                placeholder="********"
                className={`h-11 ${i18n.language === "ar" ? "text-right" : ""}`}
                {...register("password")}
              />
              {renderError(errors.password?.message)}
              <p className="text-xs text-muted-foreground mt-1">{t("validation.password")}</p>
            </div>

            {requireOtp && (
              <div>
                <label className="block text-sm mb-1">
                  {t("auth.otp_label", "2FA code")} <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder={t("auth.otp_placeholder", "Enter your 6-digit code") as string}
                  maxLength={6}
                  className={`h-11 ${i18n.language === "ar" ? "text-right" : ""}`}
                  {...register("otp" as any)}
                />
                <p className="text-xs text-muted-foreground mt-1">{t("auth.otp_hint", "Open your authenticator app to view the code.")}</p>
              </div>
            )}

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? t("auth.signing_in") : t("auth.sign_in_btn")}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-600">
            {t("auth.provider_signup_cta", "Need a provider account?")}{" "}
            <Link to="/provider-signup" className="text-primary hover:underline">
              {t("auth.provider_signup_link", "Create one")}
            </Link>
          </div>

          <div className="flex items-center justify-between mt-6 text-sm text-gray-600">
            <span>{t("auth.footer_note")}</span>
            <button
              className="underline"
              onClick={() => i18n.changeLanguage(i18n.language === "en" ? "ar" : "en")}
            >
              {i18n.language === "en" ? t("settings.arabic", "Arabic") : t("settings.english", "English")}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-4">
          {t("common.app_name")} • {t("common.admin_panel")}
        </p>
      </div>
    </div>
  );
}
