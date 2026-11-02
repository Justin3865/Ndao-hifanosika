"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Search, Users, X } from "lucide-react";
import { LookupItem, fetchLookup } from "@/lib/crud";

/** Liste d'identifiants stockée sous forme « 1,4,7 » (même convention que PartnersField). */
export const parseParticipantIds = (value: string): number[] =>
  value
    .split(",")
    .map((v) => Number(v))
    .filter((v) => Number.isInteger(v) && v > 0);

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

/**
 * Sélection des participants (stagiaires) d'une activité.
 * Sert au formulaire « Modifier / Ajouter une activité » et à « Ajouter avancement projet ».
 */
export function ParticipantsField({
  label = "Participants",
  value,
  onChange,
  compact = false,
  disabled = false,
  selectedOnly = false,
}: {
  label?: string;
  /** Identifiants séparés par des virgules : « 1,4,7 » */
  value: string;
  onChange: (next: string) => void;
  /** Liste plus basse (utilisée dans la fenêtre d'avancement) */
  compact?: boolean;
  disabled?: boolean;
  /** N'affiche que les participants choisis (avec « Modifier la liste » pour ouvrir la liste complète) */
  selectedOnly?: boolean;
}) {
  const [people, setPeople] = useState<LookupItem[] | null | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [picking, setPicking] = useState(!selectedOnly);

  useEffect(() => {
    let alive = true;

    fetchLookup("students")
      .then((data) => alive && setPeople(data))
      .catch(() => alive && setPeople(null));

    return () => {
      alive = false;
    };
  }, []);

  const selected = useMemo(() => parseParticipantIds(value), [value]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (people ?? []).filter((p) => !q || p.label.toLowerCase().includes(q));
  }, [people, search]);

  const toggle = (id: number) =>
    onChange((selected.includes(id) ? selected.filter((v) => v !== id) : [...selected, id]).join(","));

  const chosen = (people ?? []).filter((p) => selected.includes(p.id));

  const allShownSelected = shown.length > 0 && shown.every((p) => selected.includes(p.id));

  const toggleAllShown = () => {
    const ids = shown.map((p) => p.id);
    onChange((allShownSelected ? selected.filter((v) => !ids.includes(v)) : Array.from(new Set([...selected, ...ids]))).join(","));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <Users className="h-4 w-4" />
          {label}
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">{selected.length}</span>
        </span>

        {people && picking && shown.length > 0 && (
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

      {selectedOnly && people && (
        <div className="space-y-2">
          {chosen.length === 0 && <p className="text-sm text-gray-500">Aucun participant pour cette activité.</p>}
          <div className="flex flex-wrap gap-1.5">
            {chosen.map((p) => (
              <span key={p.id} className="inline-flex items-center gap-1 rounded-full border border-blue-600 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-900">
                {p.label}
                {picking && (
                  <button type="button" disabled={disabled} onClick={() => toggle(p.id)} aria-label={`Retirer ${p.label}`} className="hover:text-red-600">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
          <button type="button" onClick={() => setPicking((v) => !v)} className="text-xs font-semibold text-blue-700 hover:underline">
            {picking ? "Masquer la liste complète" : "Modifier la liste"}
          </button>
        </div>
      )}

      {people === undefined && <p className="text-sm text-gray-500">Chargement des stagiaires...</p>}
      {people === null && <p className="text-sm text-amber-700">Liste des stagiaires indisponible pour votre rôle.</p>}
      {people && people.length === 0 && <p className="text-sm text-gray-500">Aucun stagiaire enregistré.</p>}

      {people && people.length > 0 && picking && (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className={inputClass}
              placeholder="Rechercher un stagiaire..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              // Entrée ne doit pas envoyer tout le formulaire
              onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
            />
          </div>

          <div className={`grid gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2 ${compact ? "max-h-40" : "max-h-56"}`}>
            {shown.map((p) => {
              const on = selected.includes(p.id);

              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(p.id)}
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
