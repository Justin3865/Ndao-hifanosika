"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";

/**
 * Matricule d'un projet (NH-2026-PRJ-0001) ou d'un bénéficiaire (NH-2026-BEN-0001).
 * - à la création : le prochain matricule libre est proposé automatiquement (modifiable) ;
 * - à la modification : la valeur enregistrée est affichée telle quelle (modifiable).
 */

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-mono outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export function EntityMatriculeField({
  endpoint,
  label,
  required,
  isEdit,
  value,
  onChange,
  placeholder,
  help,
}: {
  /** "/projects", "/beneficiaries" ou "/enrollment" (matricule d'enquête) */
  endpoint: string;
  label: string;
  required?: boolean;
  isEdit: boolean;
  value: string;
  onChange: (next: string) => void;
  /** Exemple affiché quand le champ est vide (par défaut NH-2026-PRJ-0001) */
  placeholder?: string;
  /** Texte d'aide sous le champ */
  help?: string;
}) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit || value) return;

    let cancelled = false;
    setLoading(true);

    api
      .get(`${endpoint}/next-code`)
      .then((res) => {
        if (!cancelled) onChange(String(res.data?.data?.code ?? ""));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // proposé une seule fois à l'ouverture du formulaire de création
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, isEdit]);

  return (
    <label className="block space-y-1 text-sm font-medium text-gray-700">
      {label}
      {required ? " *" : ""}
      <input
        className={inputClass}
        placeholder={loading ? "Chargement..." : placeholder ?? "NH-2026-PRJ-0001"}
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
      />
      <span className="block text-xs font-normal text-gray-500">
        {help ?? "Proposé automatiquement ; modifiable. Il identifie l'enregistrement de façon unique."}
      </span>
    </label>
  );
}
