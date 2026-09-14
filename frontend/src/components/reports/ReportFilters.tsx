"use client";

import { Search, RotateCcw } from "lucide-react";

interface ReportFiltersProps {
  search: string;
  project: string;
  status: string;
  period: string;
  onSearchChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPeriodChange: (value: string) => void;
  onReset?: () => void;
}

export default function ReportFilters({
  search,
  project,
  status,
  period,
  onSearchChange,
  onProjectChange,
  onStatusChange,
  onPeriodChange,
  onReset,
}: ReportFiltersProps) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />

          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher..."
            className="w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm"
          />
        </div>

        <select
          value={project}
          onChange={(e) => onProjectChange(e.target.value)}
          className="rounded-lg border bg-white px-3 py-2.5 text-sm"
        >
          <option value="">Tous les projets</option>
          <option value="Maison Digitale">Maison Digitale</option>
          <option value="Kids Preneur">Kids Preneur</option>
          <option value="Ankizy Innov">Ankizy Innov</option>
          <option value="Otrikasa">Otrikasa</option>
        </select>

        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="rounded-lg border bg-white px-3 py-2.5 text-sm"
        >
          <option value="">Tous les statuts</option>
          <option value="draft">Brouillon</option>
          <option value="generated">Généré</option>
          <option value="validated">Validé</option>
          <option value="archived">Archivé</option>
        </select>

        <div className="flex gap-2">
          <input
            value={period}
            onChange={(e) => onPeriodChange(e.target.value)}
            placeholder="Période"
            className="min-w-0 flex-1 rounded-lg border px-3 py-2.5 text-sm"
          />

          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="rounded-lg border p-2.5 hover:bg-gray-50"
              title="Réinitialiser"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}