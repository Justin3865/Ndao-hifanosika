"use client";

interface EvaluationFiltersProps {
  onChange?: (filters: {
    campaign: string;
    status: string;
    period: string;
  }) => void;
}

export default function EvaluationFilters({
  onChange,
}: EvaluationFiltersProps) {
  const update = (
    campaign: string,
    status: string,
    period: string
  ) => {
    onChange?.({
      campaign,
      status,
      period,
    });
  };

  return (
    <div className="grid gap-4 rounded-xl border bg-white p-4 md:grid-cols-3">
      <select
        className="rounded-lg border px-3 py-2 text-sm"
        onChange={(e) =>
          update(e.target.value, "", "")
        }
      >
        <option value="">Toutes les campagnes</option>
        <option value="CAMP-001">
          Évaluation annuelle 2026
        </option>
        <option value="CAMP-002">
          Kids Preneur
        </option>
        <option value="CAMP-003">
          Ankizy Innov
        </option>
      </select>

      <select
        className="rounded-lg border px-3 py-2 text-sm"
        onChange={(e) =>
          update("", e.target.value, "")
        }
      >
        <option value="">Tous les statuts</option>
        <option value="completed">Terminées</option>
        <option value="pending">En attente</option>
      </select>

      <select
        className="rounded-lg border px-3 py-2 text-sm"
        onChange={(e) =>
          update("", "", e.target.value)
        }
      >
        <option value="">Toutes les périodes</option>
        <option value="month">Ce mois</option>
        <option value="quarter">Ce trimestre</option>
        <option value="year">Cette année</option>
      </select>
    </div>
  );
}