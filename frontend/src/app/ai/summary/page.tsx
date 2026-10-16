"use client";

import { CheckCircle2, Printer } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { InsightHeader, State, useInsight } from "@/components/insights/parts";

interface Summary {
  headline: string;
  highlights: string[];
  recommendations: string[];
  generatedAt: string;
  method: string;
}

export default function AiSummaryPage() {
  const { data, loading, error } = useInsight<Summary>("/ai/summary");

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <InsightHeader title="Synthèse intelligente" subtitle="Résumé automatique de la situation globale." />

        <State loading={loading} error={error}>
          {data && (
            <article className="space-y-6 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-xl font-bold text-blue-900">{data.headline}</h2>
                <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-sm print:hidden">
                  <Printer className="h-4 w-4" /> Imprimer
                </button>
              </div>

              <section>
                <h3 className="mb-2 font-semibold text-gray-900">Points clés</h3>
                <ul className="space-y-2 text-gray-700">
                  {data.highlights.map((line) => <li key={line}>• {line}</li>)}
                </ul>
              </section>

              <section>
                <h3 className="mb-2 font-semibold text-gray-900">Recommandations</h3>
                <ul className="space-y-2">
                  {data.recommendations.map((line) => (
                    <li key={line} className="flex gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-900">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {line}
                    </li>
                  ))}
                </ul>
              </section>

              <p className="border-t border-gray-100 pt-4 text-xs text-gray-400">
                Généré le {new Date(data.generatedAt).toLocaleString("fr-FR")} — {data.method}
              </p>
            </article>
          )}
        </State>
      </div>
    </AppLayout>
  );
}
