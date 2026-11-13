"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Languages } from "lucide-react";

import { LANGS } from "@/lib/i18n/dictionaries";
import { useI18n } from "./I18nProvider";

/** Sélecteur de langue en liste déroulante : on clique sur l'icône, les langues s'affichent à la verticale. */
export function LanguageSwitch({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fermeture : clic à l'extérieur ou touche Échap
  useEffect(() => {
    if (!open) return;

    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  return (
    <div ref={ref} className={`relative ${className}`} data-no-translate>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("common.language")}
        title={t("common.language")}
        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
      >
        <Languages className="h-4 w-4 text-gray-500" aria-hidden />
        <span>{current.short}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open && (
        <ul
          role="menu"
          className="absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-2xl border border-gray-200 bg-white py-1 shadow-2xl"
        >
          {LANGS.map((l) => {
            const active = lang === l.code;

            return (
              <li key={l.code} role="none">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    setLang(l.code);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm transition ${
                    active ? "bg-blue-50 font-semibold text-blue-800" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="w-6 text-xs font-bold">{l.short}</span>
                  <span className="flex-1">{l.label}</span>
                  {active && <Check className="h-4 w-4" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
