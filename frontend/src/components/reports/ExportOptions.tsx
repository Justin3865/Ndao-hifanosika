"use client";

import { FileSpreadsheet, FileText, FileDown } from "lucide-react";

interface ExportOptionsProps {
  onExport?: (format: "pdf" | "excel" | "csv") => void;
  loading?: boolean;
}

export default function ExportOptions({
  onExport,
  loading = false,
}: ExportOptionsProps) {
  const options = [
    {
      format: "pdf" as const,
      label: "PDF",
      description: "Document prêt à imprimer",
      icon: FileText,
    },
    {
      format: "excel" as const,
      label: "Excel",
      description: "Données exploitables",
      icon: FileSpreadsheet,
    },
    {
      format: "csv" as const,
      label: "CSV",
      description: "Données tabulaires",
      icon: FileDown,
    },
  ];

  return (
    <div className="rounded-xl border bg-white p-5">
      <h3 className="text-lg font-semibold">
        Options d'export
      </h3>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {options.map((option) => {
          const Icon = option.icon;

          return (
            <button
              key={option.format}
              type="button"
              disabled={loading}
              onClick={() => onExport?.(option.format)}
              className="rounded-xl border p-4 text-left hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50"
            >
              <Icon className="h-6 w-6 text-blue-600" />

              <p className="mt-3 font-semibold">
                Export {option.label}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                {option.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}