"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, Search } from "lucide-react";
import api from "@/lib/axios";
import { roleLabel } from "@/lib/roles";

/** Ligne de la liste : personne (compte, bénéficiaire) ou stage terminé. */
export interface ComboCandidate {
  source: "USER" | "BENEFICIARY" | "INTERNSHIP";
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  cinNumber?: string | null;
  matricule?: string | null;
  role?: string | null;
  subtitle?: string | null;
  stats?: { count: number; label: string; last: string | null };
  alreadyIssued?: boolean;
}

interface Props<T extends ComboCandidate> {
  /** INTERNSHIP | VOLUNTEER | STAFF | TRAINING | BENEFICIARY */
  type: string;
  placeholder?: string;
  onPick: (candidate: T) => void;
}

/**
 * Liste déroulante ET recherche dans le même champ :
 * un clic affiche toutes les personnes de la base pour le type choisi ; en tapant (nom, téléphone, CIN,
 * e-mail, matricule…) la liste se filtre. Même fonctionnement pour tous les types de certificat.
 */
export function CandidateCombobox<T extends ComboCandidate = ComboCandidate>({ type, placeholder, onPick }: Props<T>) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Le type change : on repart d'une liste vide
  useEffect(() => {
    setItems([]);
    setLoaded(false);
    setTerm("");
  }, [type]);

  // Fermeture au clic en dehors
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // Liste complète à l'ouverture, filtrée pendant la frappe (légèrement différée)
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);

    const timer = window.setTimeout(
      () => {
        const q = term.trim();

        api
          .get("/certificates/lookup/candidates", { params: { type, q: q.length >= 2 ? q : undefined } })
          .then((res) => {
            if (!cancelled) setItems((res.data?.data ?? []) as T[]);
          })
          .catch(() => {
            if (!cancelled) setItems([]);
          })
          .finally(() => {
            if (!cancelled) {
              setLoading(false);
              setLoaded(true);
            }
          });
      },
      loaded ? 300 : 0,
    );

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, term, type]);

  const pick = (candidate: T) => {
    onPick(candidate);
    setOpen(false);
    setTerm("");
  };

  return (
    <div ref={box} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-10 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder={placeholder ?? "Cliquer pour voir la liste, ou taper un nom, téléphone, CIN, e-mail…"}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
      />
      {loading ? (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
      ) : (
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      )}

      {open && (
        <div className="absolute z-30 mt-1 max-h-80 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {items.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {items.map((candidate) => (
                <li key={`${candidate.source}-${candidate.id}`}>
                  <button type="button" onClick={() => pick(candidate)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                      {candidate.name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-gray-900">{candidate.name}</span>
                      <span className="block truncate text-xs text-gray-500">
                        {candidate.stats?.label ?? candidate.subtitle ?? ""}
                        {candidate.phone ? ` · ${candidate.phone}` : ""}
                        {candidate.cinNumber ? ` · CIN ${candidate.cinNumber}` : ""}
                        {candidate.email ? ` · ${candidate.email}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-[10px] text-gray-500">
                      {candidate.alreadyIssued && <span className="mb-0.5 block rounded-full bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800">Certificat déjà délivré</span>}
                      <span className="block font-semibold">{candidate.source === "BENEFICIARY" ? "Bénéficiaire" : candidate.source === "INTERNSHIP" ? "Stage terminé" : "Compte"}</span>
                      {candidate.role ? roleLabel(candidate.role) : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            !loading && (
              <p className="px-3 py-3 text-xs text-gray-500">
                {term.trim().length >= 2 ? "Aucun résultat : modifiez la recherche, ou cochez « Cas particulier »." : "Aucune personne trouvée dans la base de données pour ce type."}
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
}
