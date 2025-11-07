import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ar from "./locales/ar/translation.json";
import arAdd from "./locales/ar/additions.json";
import en from "./locales/en/translation.json";

function deepMerge<T extends Record<string, any>>(a: T, b: T): T {
  const out: any = Array.isArray(a) ? [...(a as any)] : { ...(a as any) };
  for (const [k, v] of Object.entries(b || {})) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = deepMerge(out[k] || {}, v as any);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

const arMerged = deepMerge(ar as any, arAdd as any);

i18n.use(initReactI18next).init({
  lng: "ar",
  fallbackLng: "ar",
  resources: { ar: { translation: arMerged }, en: { translation: en } },
  interpolation: { escapeValue: false },
});

if (typeof document !== "undefined") {
  document.documentElement.lang = "ar";
  document.documentElement.dir = "rtl";
}

export default i18n;
