"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import api from "@/lib/axios";
import { errorMessage } from "@/lib/crud";

export function useInsight<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(path)
      .then((res) => setData(res.data?.data ?? null))
      .catch((err) => setError(errorMessage(err, "Analyse indisponible.")))
      .finally(() => setLoading(false));
  }, [path]);

  return { data, loading, error };
}

export const LEVEL_STYLE: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  LOW: "bg-green-100 text-green-700",
  GOOD: "bg-green-100 text-green-700",
  WATCH: "bg-amber-100 text-amber-700",
  CRITICAL: "bg-red-100 text-red-700",
  UNKNOWN: "bg-gray-100 text-gray-600",
};

export const LEVEL_LABEL: Record<string, string> = {
  HIGH: "Élevé",
  MEDIUM: "Moyen",
  LOW: "Faible",
  GOOD: "Bon",
  WATCH: "À surveiller",
  CRITICAL: "Critique",
  UNKNOWN: "Non évalué",
};

export function LevelBadge({ level }: { level: string }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${LEVEL_STYLE[level] ?? LEVEL_STYLE.UNKNOWN}`}>
      {LEVEL_LABEL[level] ?? level}
    </span>
  );
}

export function InsightHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="space-y-1">
      <Link href="/ai" className="text-sm font-medium text-blue-700 hover:underline">
        ← Analyses IA
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="text-sm text-gray-500">{subtitle}</p>
    </div>
  );
}

export function State({ loading, error, children }: { loading: boolean; error: string; children: ReactNode }) {
  if (loading) return <p className="text-gray-500">Calcul en cours...</p>;
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;
  return <>{children}</>;
}

export const METHOD_NOTE =
  "Indicateurs calculés en direct par règles et statistiques sur vos données réelles (pas de modèle de machine learning entraîné). Ils aident à décider mais ne remplacent pas l'analyse humaine.";
