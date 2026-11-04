"use client";

import { Languages } from "lucide-react";

import { LANGS } from "@/lib/i18n/dictionaries";
import { useI18n } from "./I18nProvider";

/** Bascule FR / MG, mémorisée dans le navigateur. */
export function LanguageSwitch({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useI18n();

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-1.5 py-1 text-xs ${className}`}
      role="group"
      aria-label={t("common.language")}
    >
      <Languages className="ml-1 h-3.5 w-3.5 text-gray-500" aria-hidden />
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          aria-pressed={lang === l.code}
          title={l.label}
          className={`rounded-full px-2 py-0.5 font-semibold transition ${
            lang === l.code ? "bg-blue-800 text-white" : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}
