// src/lib/i18n/translate.ts — fonction pure (testable sans React)
import { DEFAULT_LANG, dictionaries, type Lang, type TranslationKey } from "./dictionaries";

export const LANG_STORAGE_KEY = "ndao.lang";

export function isLang(value: unknown): value is Lang {
  return value === "fr" || value === "mg";
}

/**
 * Traduit une clé. Repli : langue par défaut puis `fallback` puis la clé elle-même
 * (une clé manquante n'affiche donc jamais « undefined »).
 * Variables : t("hello {name}", {name: "Rado"}).
 */
export function translate(lang: Lang, key: string, vars?: Record<string, string | number>, fallback?: string): string {
  const own = (dictionaries[lang] as Record<string, string>)[key];
  const ref = (dictionaries[DEFAULT_LANG] as Record<string, string>)[key];
  let text = own ?? ref ?? fallback ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.split(`{${k}}`).join(String(v));
  return text;
}

export type { TranslationKey };
