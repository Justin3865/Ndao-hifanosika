"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, FolderKanban, Search } from "lucide-react";
import { LookupItem, fetchLookup } from "@/lib/crud";

/**
 * Sélection des projets auxquels un stagiaire est rattaché.
 * Liste de tous les projets disponibles ; le stagiaire peut en cocher un ou plusieurs.
 * Valeur : identifiants séparés par des virgules (« 1,4,7 »), comme PartnersField / ParticipantsField.
 */
export function ProjectsField({
  label = "Projets",
  value,
  onChange,
  disabled = false,
}: {
  label?: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const [projects, setProjects] = useState<LookupItem[] | null | undefined>(undefined);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;

    fetchLookup("projects")
      .then((data) => alive && setProjects(data))
      .catch(() => alive && setProjects(null));

    return () => {
      alive = false;
    };
  }, []);

  const selected = useMemo(
    () =>
      value
        .split(",")
        .map((v) => Number(v))
        .filter((v) => Number.isInteger(v) && v > 0),
    [value],
  );

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (projects ?? []).filter((p) => !q || p.label.toLowerCase().includes(q));
  }, [projects, search]);

  const toggle = (id: number) =>
    onChange((selected.includes(id) ? selected.filter((v) => v !== id) : [...selected, id]).join(","));

  const allShownSelected = shown.length > 0 && shown.every((p) => selected.includes(p.id));

  const toggleAllShown = () => {
    const ids = shown.map((p) => p.id);
    onChange(
      (allShownSelected ? selected.filter((v) => !ids.includes(v)) : Array.from(new Set([...selected, ...ids]))).join(","),
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <FolderKanban className="h-4 w-4" />
          {label}
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">{selected.length}</span>
        </span>

        {projects && shown.length > 0 && (
          <button
            type="button"
            disabled={disabled}
            onClick={toggleAllShown}
            className="text-xs font-semibold text-blue-700 hover:underline disabled:opacity-50"
          >
            {allShownSelected ? "Tout désélectionner" : "Tout sélectionner"}
          </button>
        )}
      </div>

      {projects === undefined && <p className="text-sm text-gray-500">Chargement des projets...</p>}
      {projects === null && <p className="text-sm text-amber-700">Liste des projets indisponible.</p>}
      {projects && projects.length === 0 && <p className="text-sm text-gray-500">Aucun projet disponible.</p>}

      {projects && projects.length > 0 && (
        <>
          {projects.length > 6 && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Rechercher un projet..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              />
            </div>
          )}

          <div className="grid max-h-56 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
            {shown.map((p) => {
              const on = selected.includes(p.id);

              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(p.id)}
                  aria-pressed={on}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-sm transition disabled:opacity-60 ${
                    on ? "border-blue-600 bg-blue-50 text-blue-900" : "border-gray-200 text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      on ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300"
                    }`}
                  >
                    {on && <Check className="h-3 w-3" />}
                  </span>
                  <span className="truncate">{p.label}</span>
                </button>
              );
            })}
            {shown.length === 0 && <p className="text-sm text-gray-500">Aucun résultat.</p>}
          </div>
        </>
      )}
    </div>
  );
}
