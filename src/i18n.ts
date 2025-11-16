import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ar from "./locales/ar/translation.json";
import en from "./locales/en/translation.json";

i18n.use(initReactI18next).init({
  lng: "ar",
  fallbackLng: "en",
  resources: { ar: { translation: ar }, en: { translation: en } },
  interpolation: { escapeValue: false },
});

if (typeof document !== "undefined") {
  document.documentElement.lang = "ar";
  document.documentElement.dir = "rtl";
}

export default i18n;
