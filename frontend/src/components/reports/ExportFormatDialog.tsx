"use client";

import { useEffect } from "react";
import { FileJson, FileSpreadsheet, FileText, X } from "lucide-react";
import { EXPORT_FORMATS, type ExportFormat } from "@/lib/exportFormats";

const ICONS = { xlsx: FileSpreadsheet, csv: FileText, json: FileJson } as const;

interface Props {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onPick: (format: ExportFormat) => void;
}

/** Petite fenêtre « Choisir le format » : Excel, CSV ou JSON. */
export function ExportFormatDialog({ open, title, subtitle, onClose, onPick }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Choisir le format d'export">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">{subtitle ?? "Choisissez le format du fichier à télécharger."}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2">
          {EXPORT_FORMATS.map((format) => {
            const Icon = ICONS[format.id];
            return (
              <button
                key={format.id}
                type="button"
                onClick={() => onPick(format.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
              >
                <Icon className="h-6 w-6 shrink-0 text-blue-700" />
                <span>
                  <span className="block font-semibold text-gray-900">{format.label}</span>
                  <span className="block text-xs text-gray-500">{format.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
