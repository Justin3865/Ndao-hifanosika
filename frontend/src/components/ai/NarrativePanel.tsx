"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import api from "@/lib/axios";
import { errorMessage } from "@/lib/crud";

interface Narrative {
  title: string;
  paragraphs: string[];
  source: "rules" | "llm" | "typescript";
  disclaimer: string;
}

const SOURCE_LABEL: Record<Narrative["source"], string> = {
  rules: "Rédigée par règles (service IA)",
  llm: "Reformulée par un modèle de langage (service IA)",
  typescript: "Rédigée par règles (repli local, service IA indisponible)",
};

/** Synthèse narrative automatique (cahier §5.5 / §5.7) — toujours présentée comme une aide à la décision. */
export function NarrativePanel() {
  const [period, setPeriod] = useState("");
  const [data, setData] = useState<Narrative | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/ai/narrative", { params: period.trim() ? { period: period.trim() } : {} });
      setData(res.data?.data ?? null);
    } catch (err) {
      setError(errorMessage(err, "Synthèse indisponible."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Sparkles className="h-5 w-5 text-amber-500" /> Synthèse narrative
          </h2>
          <p className="text-sm text-gray-500">Texte rédigé automatiquement à partir des indicateurs du moment.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="Période (ex. T3 2026)"
            maxLength={80}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Générer
          </button>
        </div>
      </div>

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {data && (
        <article className="mt-4 space-y-2 text-sm leading-relaxed text-gray-800">
          <h3 className="font-semibold text-gray-900">{data.title}</h3>
          {data.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <p className="pt-2 text-xs text-gray-500">
            {SOURCE_LABEL[data.source]} — {data.disclaimer}
          </p>
        </article>
      )}
    </section>
  );
}
