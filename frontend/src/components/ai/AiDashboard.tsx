"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import api from "@/lib/axios";
import { errorMessage } from "@/lib/crud";
import {
  BarList,
  ChartCard,
  DonutChart,
  Histogram,
  LEVEL_COLORS,
  LineChart,
  PALETTE,
  SEVERITY_COLORS,
  STATUS_COLORS,
  riskBinColor,
  scoreBinColor,
} from "./charts";

interface Slice {
  key: string;
  label: string;
  value: number;
}

export interface DashboardData {
  engine: "python-db" | "python" | "typescript";
  generatedAt: string;
  totals: {
    projects: number;
    activeProjects: number;
    beneficiaries: number;
    anomalies: number;
    criticalAnomalies: number;
    highRiskBeneficiaries: number;
    avgPerformance: number | null;
    avgEvaluation: number | null;
  };
  anomaliesBySeverity: Slice[];
  anomaliesByScope: Slice[];
  anomaliesByType: Slice[];
  projectsByStatus: Slice[];
  performanceHistogram: Array<{ label: string; value: number }>;
  performanceByProject: Array<Slice & { level: string }>;
  dropoutLevels: Slice[];
  dropoutHistogram: Array<{ label: string; value: number }>;
  evaluationTrend: Array<{ label: string; value: number; count: number }>;
  anomalyTrend: { labels: string[]; series: Array<{ key: string; name: string; values: number[] }>; hasHistory: boolean };
  vulnerability?: { total: number; suspected: number; levels: Slice[]; histogram: Array<{ label: string; value: number }> };
  models?: Array<{ name: string; accuracy: number; f1: number; auc: number; sampleSize: number; trainedAt: string }>;
}

export const ENGINE_LABELS: Record<string, { text: string; tone: string }> = {
  "python-db": { text: "Python · lecture directe de la base", tone: "bg-green-100 text-green-700" },
  python: { text: "Python · données envoyées par le backend", tone: "bg-emerald-100 text-emerald-700" },
  typescript: { text: "Calcul local (service Python indisponible)", tone: "bg-amber-100 text-amber-700" },
};

const TREND_COLORS: Record<string, string> = { open: "#ef4444", detected: "#f59e0b", resolved: "#10b981" };
const RISK_COLORS: Record<string, string> = { HIGH: "#ef4444", MEDIUM: "#f59e0b", LOW: "#10b981" };

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs font-medium text-gray-600">{label}</p>
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

/** Tableau de bord statistique : courbes, diagrammes circulaires et histogrammes de toutes les analyses IA. */
export function AiDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await api.get("/ai/dashboard", { timeout: 90_000 });
      setData(res.data?.data ?? null);
      setError("");
    } catch (err) {
      setError(errorMessage(err, "Impossible de charger le tableau de bord."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();

    const timer = window.setInterval(() => void load(), 5 * 60_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const engine = data ? ENGINE_LABELS[data.engine] : null;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Tableau de bord statistique</h2>
          <p className="text-xs text-gray-500">Résultats de toutes les estimations : anomalies, performance, risque d&apos;abandon, évaluations, vulnérabilité.</p>
        </div>

        <div className="flex items-center gap-2">
          {engine && <span className={`rounded-full px-3 py-1 text-xs font-medium ${engine.tone}`}>{engine.text}</span>}
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Actualiser
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {loading && !data && <p className="text-sm text-gray-500">Calcul des graphiques…</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Kpi label="Projets" value={data.totals.projects} hint={`${data.totals.activeProjects} actifs`} />
            <Kpi label="Bénéficiaires" value={data.totals.beneficiaries} />
            <Kpi label="Anomalies" value={data.totals.anomalies} hint={`${data.totals.criticalAnomalies} critiques`} />
            <Kpi label="Performance moyenne" value={data.totals.avgPerformance === null ? "—" : `${data.totals.avgPerformance}/100`} />
            <Kpi label="Score moyen d'évaluation" value={data.totals.avgEvaluation === null ? "—" : `${data.totals.avgEvaluation}/100`} />
            <Kpi label="Abandon à risque élevé" value={data.totals.highRiskBeneficiaries} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard
              className="lg:col-span-2"
              title="Évolution des anomalies (30 jours)"
              subtitle={
                data.anomalyTrend.hasHistory
                  ? "Courbes : anomalies ouvertes, détectées et résolues chaque jour."
                  : "Historique en cours de constitution : lancez « Analyser et notifier maintenant » ou attendez l'analyse automatique."
              }
            >
              <LineChart
                labels={data.anomalyTrend.labels}
                series={data.anomalyTrend.series.map((serie) => ({ name: serie.name, values: serie.values, color: TREND_COLORS[serie.key] ?? PALETTE[0] }))}
              />
            </ChartCard>

            <ChartCard title="Anomalies par gravité" subtitle="Diagramme circulaire" empty={data.totals.anomalies === 0 && "Aucune anomalie détectée."}>
              <DonutChart
                centerValue={data.totals.anomalies}
                centerLabel="anomalies"
                slices={data.anomaliesBySeverity.map((s) => ({ label: s.label, value: s.value, color: SEVERITY_COLORS[s.key] }))}
              />
            </ChartCard>

            <ChartCard title="Anomalies par catégorie" subtitle="Projet, jalon, activité, évaluation, bénéficiaire, stage…" empty={data.anomaliesByScope.length === 0 && "Aucune anomalie détectée."}>
              <BarList items={data.anomaliesByScope.map((s) => ({ label: s.label, value: s.value }))} />
            </ChartCard>

            <ChartCard className="lg:col-span-2" title="Types d'anomalies les plus fréquents" empty={data.anomaliesByType.length === 0 && "Aucune anomalie détectée."}>
              <BarList items={data.anomaliesByType.map((s) => ({ label: s.label, value: s.value }))} />
            </ChartCard>

            <ChartCard title="Distribution des scores de performance" subtitle="Histogramme : nombre de projets par tranche de 10 points" empty={data.performanceByProject.length === 0 && "Pas encore de score de performance."}>
              <Histogram bins={data.performanceHistogram} binColor={scoreBinColor} />
            </ChartCard>

            <ChartCard title="Score de performance par projet" subtitle="Les 20 projets les plus fragiles" empty={data.performanceByProject.length === 0 && "Pas encore de score de performance."}>
              <BarList
                max={100}
                suffix="/100"
                items={data.performanceByProject.map((p) => ({ label: p.label, value: p.value, color: LEVEL_COLORS[p.level] ?? LEVEL_COLORS.UNKNOWN }))}
              />
            </ChartCard>

            <ChartCard title="Risque d'abandon" subtitle="Diagramme circulaire des bénéficiaires par niveau" empty={data.totals.beneficiaries === 0 && "Aucun bénéficiaire enregistré."}>
              <DonutChart
                centerValue={data.totals.beneficiaries}
                centerLabel="bénéficiaires"
                slices={data.dropoutLevels.map((s) => ({ label: s.label, value: s.value, color: RISK_COLORS[s.key] }))}
              />
            </ChartCard>

            <ChartCard title="Distribution du risque d'abandon" subtitle="Histogramme par tranche de 10 points" empty={data.totals.beneficiaries === 0 && "Aucun bénéficiaire enregistré."}>
              <Histogram bins={data.dropoutHistogram} binColor={riskBinColor} />
            </ChartCard>

            <ChartCard title="Évaluations : score moyen par mois" subtitle="Courbe d'évolution des notes" empty={data.evaluationTrend.length === 0 && "Aucune évaluation notée."}>
              <LineChart
                yMax={100}
                unit="/100"
                area
                labels={data.evaluationTrend.map((p) => p.label)}
                series={[{ name: "Score moyen", color: "#6366f1", values: data.evaluationTrend.map((p) => p.value) }]}
              />
            </ChartCard>

            <ChartCard title="Projets par statut" subtitle="Diagramme circulaire" empty={data.projectsByStatus.length === 0 && "Aucun projet."}>
              <DonutChart
                centerValue={data.totals.projects}
                centerLabel="projets"
                slices={data.projectsByStatus.map((s, i) => ({ label: s.label, value: s.value, color: STATUS_COLORS[s.key] ?? PALETTE[i % PALETTE.length] }))}
              />
            </ChartCard>

            {data.vulnerability && (
              <>
                <ChartCard
                  title="Vulnérabilité des ménages"
                  subtitle={`${data.vulnerability.total} ménages notés · ${data.vulnerability.suspected} à vérifier (score ≥ 75, non classés vulnérables)`}
                  empty={data.vulnerability.total === 0 && "Aucun ménage noté."}
                >
                  <DonutChart
                    centerValue={data.vulnerability.total}
                    centerLabel="ménages"
                    slices={data.vulnerability.levels.map((s) => ({ label: s.label, value: s.value, color: RISK_COLORS[s.key] }))}
                  />
                </ChartCard>

                <ChartCard title="Distribution des scores de vulnérabilité" subtitle="Histogramme par tranche de 10 points" empty={data.vulnerability.total === 0 && "Aucun ménage noté."}>
                  <Histogram bins={data.vulnerability.histogram} binColor={riskBinColor} />
                </ChartCard>
              </>
            )}

            {data.models && data.models.length > 0 && (
              <ChartCard className="lg:col-span-2" title="Fiabilité des modèles d'apprentissage" subtitle="Exactitude, F1 et AUC (en %) du dernier entraînement">
                <BarList
                  max={100}
                  suffix=" %"
                  items={data.models.flatMap((model, index) => [
                    { label: `${model.name} · exactitude`, value: Math.round(model.accuracy * 100), color: PALETTE[index % PALETTE.length] },
                    { label: `${model.name} · F1`, value: Math.round(model.f1 * 100), color: PALETTE[(index + 3) % PALETTE.length] },
                    { label: `${model.name} · AUC`, value: Math.round(model.auc * 100), color: PALETTE[(index + 5) % PALETTE.length] },
                  ])}
                />
              </ChartCard>
            )}
          </div>
        </>
      )}
    </section>
  );
}
