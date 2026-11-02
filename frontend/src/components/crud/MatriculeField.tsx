"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";

/**
 * Matricule du stagiaire (N° d'inscription, ex. NH-2026-STG-0001) dans le formulaire d'un stage.
 * - stagiaire déjà inscrit : son matricule est repris (modifiable, contrôlé à l'enregistrement) ;
 * - sinon : le prochain matricule libre est proposé (modifiable avant l'enregistrement).
 * C'est aussi le N° imprimé sur ses certificats de stage.
 */

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-mono outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export function MatriculeField({
  label,
  personId,
  value,
  onChange,
}: {
  label: string;
  /** Identifiant du stagiaire choisi dans la liste ("" = nouveau stagiaire). */
  personId: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    api
      .get("/internships/matricule", { params: { studentId: personId || undefined } })
      .then((res) => {
        if (cancelled) return;

        setLocked(Boolean(res.data?.data?.assigned));
        onChange(String(res.data?.data?.matricule ?? ""));
      })
      .catch(() => {
        if (!cancelled) setLocked(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // onChange change à chaque rendu : seul le stagiaire choisi relance la lecture
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId]);

  return (
    <label className="block space-y-1 text-sm font-medium text-gray-700">
      {label}
      <input
        className={inputClass}
        placeholder={loading ? "Chargement..." : "NH-2026-STG-0001"}
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
      />
      <span className="block text-xs font-normal text-gray-500">
        {locked
          ? "Matricule déjà attribué à ce stagiaire : vous pouvez le modifier (format NH-2026-STG-0001) ; le N° de ses certificats suivra."
          : "Proposé automatiquement ; il sera le N° d'inscription du stagiaire et de ses certificats de stage (modifiable)."}
      </span>
    </label>
  );
}
