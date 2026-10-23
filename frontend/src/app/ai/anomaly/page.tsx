"use client";

import Link from "next/link";
import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { InsightHeader, LevelBadge, METHOD_NOTE, State, useInsight } from "@/components/insights/parts";

interface Anomaly {
  type: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  detail: string;
  link: string;
  source?: "rules" | "isolation-forest";
  score?: number;
}

interface Engine {
  name: string;
  used: boolean;
  latencyMs: number | null;
  samples: Record<string, number>;
  flagged: number;
  reason: string | null;
  checkedAt: string;
}

export default function AiAnomalyPage() {
  const { data, loading, error, raw } = useInsight<Anomaly[]>("/ai/anomalies");
  const engine = (raw?.engine ?? null) as Engine | null;
  const [severity, setSeverity] = useState("");

  const rows = (data ?? []).filter((a) => !severity || a.severity === severity);

  return (
    <AppLayout>
      <div className="space-y-6">
        <InsightHeader title="Détection d'anomalies" subtitle="Retards, dépassements de budget, objectifs en retard et scores atypiques." />

        <State loading={loading} error={error}>
          {engine && (
            <div className={`rounded-2xl border p-4 text-sm ${engine.used ? "border-green-200 bg-green-50 text-green-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
              <p className="font-semibold">
                {engine.used ? "Isolation Forest actif" : "Isolation Forest non utilisé — règles statistiques seulement"}
              </p>
              <p className="mt-1 text-xs">
                {engine.used
                  ? `Service IA joint en ${engine.latencyMs} ms · éléments analysés : ${Object.entries(engine.samples).map(([k, n]) => `${k} ${n}`).join(", ")} · ${engine.flagged} anomalie(s) détectée(s) par le modèle · vérifié à ${new Date(engine.checkedAt).toLocaleTimeString("fr-FR")}`
                  : `Raison : ${engine.reason ?? "service IA indisponible"}. Démarrez le service Python et vérifiez AI_SERVICE_URL dans le .env du backend.`}
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {[["", "Toutes"], ["HIGH", "Critiques"], ["MEDIUM", "Moyennes"], ["LOW", "Faibles"]].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSeverity(value)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  severity === value ? "bg-blue-800 text-white" : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
            <span className="ml-auto text-sm text-gray-500">{rows.length} anomalie(s)</span>
          </div>

          {rows.length === 0 && (
            <div className="rounded-2xl border border-dashed border-green-300 bg-green-50 p-10 text-center text-green-800">
              Aucune anomalie détectée. 🎉
            </div>
          )}

          <div className="space-y-3">
            {rows.map((a, index) => (
              <Link key={`${a.type}-${index}`} href={a.link} className="flex items-start justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-300">
                <div>
                  <p className="font-semibold text-gray-900">
                    {a.title}
                    {a.source === "isolation-forest" && (
                      <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">IA · score {a.score}</span>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">{a.detail}</p>
                </div>
                <LevelBadge level={a.severity} />
              </Link>
            ))}
          </div>
        </State>

        <p className="text-xs text-gray-400">
          {engine?.used
            ? "Les anomalies « IA » viennent d'un modèle Isolation Forest (non supervisé) qui compare chaque projet, jalon et activité aux autres ; les autres viennent de règles métier. Un score élevé signale un élément atypique, pas forcément une erreur."
            : METHOD_NOTE}
        </p>
      </div>
    </AppLayout>
  );
}
