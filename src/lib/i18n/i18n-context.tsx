"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { translations, type Locale } from "./translations";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  dir: "ltr" | "rtl";
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const RTL_LOCALES: Locale[] = ["ar"];

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem("app-locale") as Locale | null;
    if (saved && translations[saved]) {
      setLocaleState(saved);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    const dir = RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
    document.documentElement.dir = dir;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("app-locale", l);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      let value = translations[locale]?.[key] || translations.en[key] || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          value = value.replace(`{${k}}`, String(v));
        });
      }
      return value;
    },
    [locale]
  );

  const isRTL = RTL_LOCALES.includes(locale);
  const dir = isRTL ? "rtl" : "ltr";

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, dir, isRTL }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslation must be used inside I18nProvider");
  return ctx;
}
