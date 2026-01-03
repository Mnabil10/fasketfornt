import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useTranslation } from "react-i18next";
import { registerProvider } from "../../services/auth.service";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../common/BrandLogo";
import { useDirection } from "../../hooks/useDirection";
import { getAdminErrorMessage } from "../../lib/errors";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { toast } from "sonner";

function normalizeDigits(value: string) {
  return value
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

function cleanPhone(raw: string) {
  const cleaned = normalizeDigits(raw).replace(/\s|\u200e|\u200f|\u202a|\u202b|\u202c|\u202d|\u202e/g, "");
  return cleaned.replace(/(?!^)\+/g, "").trim();
}

const schema = z.object({
  name: z.string({ required_error: "validation.required" }).transform((v) => v.trim()).min(2, "validation.required"),
  phone: z
    .string({ required_error: "validation.required" })
    .transform((v) => normalizeDigits(v).trim())
    .refine((v) => /^(\+?\d{8,15})$/.test(cleanPhone(v)), { message: "validation.phone" }),
  email: z
    .string()
    .optional()
    .transform((v) => (v ? v.trim().toLowerCase() : ""))
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), { message: "validation.email" }),
  password: z
    .string({ required_error: "validation.required" })
    .min(8, { message: "validation.password" })
    .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), { message: "validation.password" }),
  providerName: z.string({ required_error: "validation.required" }).transform((v) => v.trim()).min(2, "validation.required"),
  providerNameAr: z.string().optional(),
  providerType: z.string({ required_error: "validation.required" }),
  branchName: z.string().optional(),
  branchAddress: z.string().optional(),
  branchCity: z.string().optional(),
  branchRegion: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const PROVIDER_TYPES = [
  { value: "SUPERMARKET", label: "Supermarket" },
  { value: "PHARMACY", label: "Pharmacy" },
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "SERVICE", label: "Service" },
  { value: "OTHER", label: "Other" },
];

export default function ProviderSignUp() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  useDirection();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      password: "",
      providerName: "",
      providerNameAr: "",
      providerType: "SUPERMARKET",
      branchName: "",
      branchAddress: "",
      branchCity: "",
      branchRegion: "",
    },
    mode: "onSubmit",
  });

  const renderError = (message?: string) =>
    message ? <p className="text-xs text-red-600 mt-1">{t(message, { defaultValue: message })}</p> : null;

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      setLoading(true);
      await registerProvider({
        name: values.name,
        phone: cleanPhone(values.phone),
        email: values.email || undefined,
        password: values.password,
        providerName: values.providerName,
        providerNameAr: values.providerNameAr || undefined,
        providerType: values.providerType,
        branchName: values.branchName || undefined,
        branchAddress: values.branchAddress || undefined,
        branchCity: values.branchCity || undefined,
        branchRegion: values.branchRegion || undefined,
      });
      toast.success(t("auth.signup_pending", "Account created. Waiting for admin approval."));
      navigate("/login", { replace: true });
    } catch (error) {
      setServerError(getAdminErrorMessage(error, t, t("auth.signup_failed", "Signup failed")));
    } finally {
      setLoading(false);
    }
  }

  const providerType = watch("providerType");

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <BrandLogo size={42} />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center mb-1">{t("auth.provider_signup", "Provider signup")}</h1>
          <p className="text-sm text-center text-gray-600 mb-6">
            {t("auth.provider_signup_subtitle", "Create your provider account")}
          </p>

          {serverError && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {serverError}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">{t("auth.owner_name", "Owner name")}</label>
                <Input className={`h-11 ${i18n.language === "ar" ? "text-right" : ""}`} {...register("name")} />
                {renderError(errors.name?.message)}
              </div>
              <div>
                <label className="block text-sm mb-1">{t("auth.phone", "Phone")}</label>
                <Input className={`h-11 ${i18n.language === "ar" ? "text-right" : ""}`} {...register("phone")} />
                {renderError(errors.phone?.message)}
              </div>
              <div>
                <label className="block text-sm mb-1">{t("auth.email", "Email")}</label>
                <Input className={`h-11 ${i18n.language === "ar" ? "text-right" : ""}`} {...register("email")} />
                {renderError(errors.email?.message)}
              </div>
              <div>
                <label className="block text-sm mb-1">{t("auth.password", "Password")}</label>
                <Input type="password" className={`h-11 ${i18n.language === "ar" ? "text-right" : ""}`} {...register("password")} />
                {renderError(errors.password?.message)}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">{t("providers.name", "Provider name")}</label>
                  <Input className={`h-11 ${i18n.language === "ar" ? "text-right" : ""}`} {...register("providerName")} />
                  {renderError(errors.providerName?.message)}
                </div>
                <div>
                  <label className="block text-sm mb-1">{t("providers.nameAr", "Provider name (AR)")}</label>
                  <Input className={`h-11 ${i18n.language === "ar" ? "text-right" : ""}`} {...register("providerNameAr")} />
                </div>
                <div>
                  <label className="block text-sm mb-1">{t("providers.type", "Provider type")}</label>
                  <Select value={providerType} onValueChange={(val) => setValue("providerType", val)}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDER_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {t(`providers.types.${type.value}`, type.label)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {renderError(errors.providerType?.message)}
                </div>
                <div>
                  <label className="block text-sm mb-1">{t("branches.name", "Branch name")}</label>
                  <Input className={`h-11 ${i18n.language === "ar" ? "text-right" : ""}`} {...register("branchName")} />
                </div>
                <div>
                  <label className="block text-sm mb-1">{t("branches.city", "City")}</label>
                  <Input className={`h-11 ${i18n.language === "ar" ? "text-right" : ""}`} {...register("branchCity")} />
                </div>
                <div>
                  <label className="block text-sm mb-1">{t("branches.region", "Region")}</label>
                  <Input className={`h-11 ${i18n.language === "ar" ? "text-right" : ""}`} {...register("branchRegion")} />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm mb-1">{t("branches.address", "Address")}</label>
                <Input className={`h-11 ${i18n.language === "ar" ? "text-right" : ""}`} {...register("branchAddress")} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button type="submit" className="h-11" disabled={loading}>
                {loading ? t("common.saving", "Saving...") : t("auth.create_account", "Create account")}
              </Button>
              <Button type="button" variant="ghost" className="h-11" onClick={() => navigate("/login")}>
                {t("auth.back_to_login", "Back to login")}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
