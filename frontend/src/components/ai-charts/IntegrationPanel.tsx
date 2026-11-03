"use client";

import Link from "next/link";
import { ArrowRight, GraduationCap, Link2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import api from "@/lib/axios";
import { errorMessage } from "@/lib/crud";
import { IntegrationDashboardBlock, IntegrationOverview, fetchIntegrationOverview, refreshIntegration } from "@/lib/integration";
import { BarChart, ChartCard, Donut, GroupedBars, Legend, PALETTE, SEVERITY_COLOR } from "./charts";

const fmt20 = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${v}/20`);
const fmtPct = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${Math.round(v)} %`);

const SEVERITY_STYLE: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  LOW: "bg-green-100 text-green-700",
};
const SEVERITY_LABEL: Record<string, string> = { HIGH: "Critique", MEDIUM: "Moyenne", LOW: "Faible" };

/**
 * « Données reliées » : montre comment stagiaires, projets, Suivi & Évaluation et Évaluation finale
 * alimentent les Analyses IA (mêmes chiffres que les pages sources) + les graphiques correspondants.
 * À placer dans /ai (page « Analyses IA »).
 */
export function IntegrationPanel() {
  const [overview, setOverview] = useState<IntegrationOverview | null>(null);
  const [block, setBlock] = useState<IntegrationDashboardBlock | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [spin, setSpin] = useState(false);

  const load = useCallback(async () => {
    try {
      const [o, d] = await Promise.all([
        fetchIntegrationOverview(),
        api.get("/ai/dashboard").then((res) => (res.data?.data?.integration ?? null) as IntegrationDashboardBlock | null).catch(() => null),
      ]);
      setOverview(o);
      setBlock(d);
      setError("");
    } catch (err) {
      setError(errorMessage(err, "Données reliées indisponibles."));
    } finally {
      setLoading(false);
      setSpin(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Rafraîchit quand une analyse temps réel se termine (déclenchée par un nouvel avancement)
  useEffect(() => {
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  if (loading) return <p className="text-sm text-gray-500">Calcul des données reliées...</p>;
  if (error) return <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{error}</div>;
  if (!overview) return null;

  const t = overview.totals;
  const kpis: Array<[string, string, string?]> = [
    ["Stagiaires", String(t.internPersons), t.internRows > t.internPersons ? `${t.internRows} stages enregistrés` : `${t.internsDone} stage(s) terminé(s)`],
    ["Stagiaires notés", `${t.internsEvaluated}/${t.internPersons}`, `moyenne ${fmt20(t.avgInternScore)}`],
    ["Projets notés", `${t.projectsEvaluated}/${t.projects}`, `moyenne ${fmt20(t.avgProjectScore)}`],
    ["Avancement S&E", fmtPct(t.avgActual), `prévu ${fmtPct(t.avgPlanned)}`],
    ["Stagiaires à risque", String(t.internsAtRisk), `${t.weakInterns} sous 10/20`],
    ["Projets en retard", String(t.lateProjects), "écart ≤ −20 pts (S&E)"],
  ];

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Link2 className="h-5 w-5 text-blue-500" /> Données reliées à l&apos;IA
          </h2>
          <p className="text-xs text-gray-500">
            Stagiaires, projets, Suivi &amp; Évaluation et Évaluation finale alimentent la performance, les anomalies, la synthèse et les alertes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSpin(true);
            void refreshIntegration().finally(() => void load());
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${spin ? "animate-spin" : ""}`} /> Recalculer
        </button>
      </div>

      <div className="flex flex-wrap items-stretch gap-2">
        {overview.flow.map((step, index) => (
          <div key={step.to} className="flex items-center gap-2">
            <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm" title={step.route}>
              <p className="font-semibold text-gray-900">{step.from}</p>
              <p className="text-gray-500">{step.via}</p>
            </div>
            {index < overview.flow.length - 1 && <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map(([label, value, hint]) => (
          <div key={label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase text-gray-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
            {hint && <p className="text-xs text-gray-500">{hint}</p>}
          </div>
        ))}
      </div>

      {block && (
        <div className="grid gap-5 lg:grid-cols-2">
          <ChartCard title="Évaluation finale des projets" subtitle="Note /20 (les plus faibles d'abord)">
            <BarChart data={block.finalByProject.map((p) => ({ label: p.label, value: p.value, color: SEVERITY_COLOR[p.level] }))} height={220} max={20} format={(v) => `${v}`} />
          </ChartCard>

          <ChartCard title="Notes des stagiaires" subtitle="Note /20, une barre par stagiaire">
            <BarChart data={block.internScores.map((i) => ({ label: i.label.split(" ")[0], value: i.value, color: SEVERITY_COLOR[i.level] }))} height={220} max={20} format={(v) => `${v}`} />
          </ChartCard>

          <ChartCard title="Répartition des notes de stage" subtitle="Nombre de stagiaires par tranche de 2 points">
            <BarChart data={block.internScoreHistogram} color={PALETTE.purple} height={200} histogram />
          </ChartCard>

          <ChartCard title="Risque des stagiaires" subtitle="Retards, présence, note">
            <div className="flex justify-center">
              <Donut
                data={block.internRisk.map((r) => ({ label: r.label, value: r.value, color: SEVERITY_COLOR[r.key] }))}
                center={`${block.totals.internPersons}`}
              />
            </div>
          </ChartCard>

          <div className="lg:col-span-2">
            <ChartCard title="Suivi & Évaluation : prévu / réel" subtitle="Projets actifs, avancement en %">
              <GroupedBars
                categories={block.progressByProject.map((p) => p.label)}
                series={[
                  { name: "Prévu", color: PALETTE.slate, values: block.progressByProject.map((p) => p.planned ?? 0) },
                  { name: "Réel", color: PALETTE.blue, values: block.progressByProject.map((p) => p.actual ?? 0) },
                ]}
                max={100}
                format={(v) => `${Math.round(v)}`}
              />
              <Legend items={[{ label: "Prévu", color: PALETTE.slate }, { label: "Réel", color: PALETTE.blue }]} />
            </ChartCard>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-semibold text-gray-900">
            <GraduationCap className="h-4 w-4 text-amber-500" /> Anomalies issues des stagiaires, du S&amp;E et de l&apos;évaluation finale
          </h3>
          <span className="text-xs text-gray-500">{overview.anomalies.total} au total · {overview.anomalies.high} critique(s)</span>
        </div>

        {overview.anomalies.top.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune anomalie détectée par le pont pour le moment.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {overview.anomalies.top.map((a) => (
              <li key={a.key} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{a.title}</p>
                  <p className="text-xs text-gray-500">{a.detail}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_STYLE[a.severity]}`}>{SEVERITY_LABEL[a.severity]}</span>
                  <Link href={a.link} className="text-xs font-medium text-blue-600 hover:underline">Voir</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
