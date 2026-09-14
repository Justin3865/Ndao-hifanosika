"use client";

interface InternshipFiltersProps {
  onChange?: (filters: {
    project: string;
    department: string;
    status: string;
  }) => void;
}

export default function InternshipFilters({
  onChange,
}: InternshipFiltersProps) {
  return (
    <div className="grid gap-4 rounded-xl border bg-white p-4 md:grid-cols-3">
      <select
        className="rounded-lg border px-3 py-2 text-sm"
        onChange={(event) =>
          onChange?.({
            project: event.target.value,
            department: "",
            status: "",
          })
        }
      >
        <option value="">Tous les projets</option>
        <option value="Maison Digitale">
          Maison Digitale
        </option>
        <option value="Kids Preneur">
          Kids Preneur
        </option>
        <option value="Ankizy Innov">
          Ankizy Innov
        </option>
        <option value="Otrikasa">
          Otrikasa
        </option>
      </select>

      <select
        className="rounded-lg border px-3 py-2 text-sm"
        onChange={(event) =>
          onChange?.({
            project: "",
            department: event.target.value,
            status: "",
          })
        }
      >
        <option value="">Tous les départements</option>
        <option value="Direction">Direction</option>
        <option value="DSI">DSI</option>
        <option value="DAF">DAF</option>
        <option value="Communication">
          Communication
        </option>
        <option value="RH">RH</option>
        <option value="S&E">S&E</option>
      </select>

      <select
        className="rounded-lg border px-3 py-2 text-sm"
        onChange={(event) =>
          onChange?.({
            project: "",
            department: "",
            status: event.target.value,
          })
        }
      >
        <option value="">Tous les statuts</option>
        <option value="pending">En attente</option>
        <option value="active">En cours</option>
        <option value="completed">Terminé</option>
        <option value="cancelled">Annulé</option>
      </select>
    </div>
  );
}