"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { DEFAULT_LANG, type Lang } from "@/lib/i18n/dictionaries";
import { LANG_STORAGE_KEY, isLang, translate } from "@/lib/i18n/translate";

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>, fallback?: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  // Lecture après hydratation (évite tout écart serveur/client)
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
      if (isLang(saved)) setLangState(saved);
    } catch {
      /* stockage indisponible : on reste en français */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      /* ignoré */
    }
  }, []);

  const value = useMemo<I18nValue>(
    () => ({ lang, setLang, t: (key, vars, fallback) => translate(lang, key, vars, fallback) }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Hors provider (tests, pages publiques) : français, sans erreur. */
export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  return ctx ?? { lang: DEFAULT_LANG, setLang: () => {}, t: (key, vars, fallback) => translate(DEFAULT_LANG, key, vars, fallback) };
}
