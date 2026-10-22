"use client";

import { Download, FileText, Loader2, Printer, X } from "lucide-react";
import { REPORT_PDF_FORMATS, type ReportPdfFormat } from "@/lib/reportPdf";

interface Props {
  mode?: "pdf" | "print";
  title?: string;
  description?: string;
  format: ReportPdfFormat;
  onFormatChange: (format: ReportPdfFormat) => void;
  busy: boolean;
  error: string;
  onConfirm: () => void;
  onClose: () => void;
}

/** Choix du format (A4 / A3) : même fenêtre que celle du certificat. */
export function PdfFormatDialog({
  mode = "pdf",
  title = mode === "print" ? "Format d'impression" : "Choisir le format",
  description,
  format,
  onFormatChange,
  busy,
  error,
  onConfirm,
  onClose,
}: Props) {
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 px-4 print:hidden">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <FileText className="h-5 w-5 text-blue-800" /> {title}
          </h2>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {description && <p className="mt-2 text-xs text-gray-500">{description}</p>}

        <div className="mt-4 space-y-2">
          {(Object.keys(REPORT_PDF_FORMATS) as ReportPdfFormat[]).map((key) => (
            <label
              key={key}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm transition ${
                format === key ? "border-blue-800 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="report-pdf-format"
                value={key}
                checked={format === key}
                disabled={busy}
                onChange={() => onFormatChange(key)}
                className="accent-blue-800"
              />
              <span className="font-semibold text-gray-900">{REPORT_PDF_FORMATS[key].label}</span>
            </label>
          ))}
        </div>

        {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-800 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-900 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "print" ? <Printer className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          {busy ? "Génération..." : mode === "print" ? `Imprimer en ${format}` : "Télécharger le PDF"}
        </button>
      </div>
    </div>
  );
}
