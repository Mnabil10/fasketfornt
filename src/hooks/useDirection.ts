import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export function useDirection() {
  const { i18n } = useTranslation();
  const dir = i18n.dir();

  useEffect(() => {
    const root = document.documentElement;
    root.dir = dir;
    root.lang = i18n.language;
    document.body.dataset.dir = dir;
    document.body.classList.toggle("rtl", dir === "rtl");
  }, [dir, i18n.language]);

  return { dir, isRTL: dir === "rtl" } as const;
}
