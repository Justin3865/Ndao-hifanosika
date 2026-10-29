"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  Heart,
  Search,
  TimerReset,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { AppLayout } from "@/components/layout";
import InternshipsSection from "@/components/monitoring/InternshipsSection";
import { internshipAlertsToSe, type InternshipMonitoring } from "@/lib/internshipMonitoring";
import { Spinner } from "@/components/ui/Spinner";
import {
  analyse,
  COMPONENT_LABEL,
  fmtMoney,
  fmtPct,
  loadWeights,
  monitorProject,
  PROJECT_STATUS_LABEL,
  summarize,
  type ComponentKey,
  type ProjectMonitoring,
  type ProjectStatus,
  type RawProject,
  type Weights,
  DEFAULT_WEIGHTS,
} from "@/lib/monitoring";
import {
  errorMessage,
  fetchAllObjectives,
  fetchAllProjectsForMonitoring,
  fetchInternshipsMonitoring,
} from "@/services/monitoring.service";
import type { ObjectiveNode } from "@/lib/monitoring";
import { AlertsPanel, InsightsPanel, ScorePanel } from "@/components/monitoring/panels";
import ProjectSeCard from "@/components/monitoring/ProjectSeCard";
import { GapBadge, Kpi, Section, SeProgress, trendTone } from "@/components/monitoring/parts";

type StatusFilter = "ALL" | ProjectStatus;

export default function SuiviEvaluationPage() {
  const [projects, setProjects] = useState<RawProject[]>([]);
  const [objectives, setObjectives] = useState<Record<number, ObjectiveNode[]>>({});
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [loading, setLoading] = useState(true);
  const [internships, setInternships] = useState<InternshipMonitoring[]>([]);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [internshipsError, setInternshipsError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");

  useEffect(() => {
    setWeights(loadWeights());
    let cancelled = false;

    (async () => {
      // Projets et stagiaires se chargent séparément : un rôle sans accès
      // aux projets (ex. tuteur) voit quand même ses stagiaires.
      const projectsTask = (async () => {
        const list = await fetchAllProjectsForMonitoring();
        if (cancelled) return;
        setProjects(list);
        const obj = await fetchAllObjectives(list);
        if (!cancelled) setObjectives(obj);
      })();
      const internshipsTask = fetchInternshipsMonitoring().then((list) => {
        if (!cancelled) setInternships(list);
      });

      const [pr, ir] = await Promise.allSettled([projectsTask, internshipsTask]);
      if (cancelled) return;
      if (pr.status === "rejected") setProjectsError(errorMessage(pr.reason));
      if (ir.status === "rejected") setInternshipsError(errorMessage(ir.reason));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Tout est recalculé automatiquement depuis les données brutes
  const monitored: ProjectMonitoring[] = useMemo(
    () => projects.map((p) => monitorProject(p, { weights, objectives: objectives[p.id] ?? null })),
    [projects, objectives, weights]
  );

  const summary = useMemo(() => summarize(monitored, weights), [monitored, weights]);

  const visible = useMemo(
    () =>
      monitored.filter((m) => {
        const okStatus = status === "ALL" || m.project.status === status;
        const q = query.trim().toLowerCase();
        const okQuery = !q || `${m.project.name} ${m.project.code}`.toLowerCase().includes(q);
        return okStatus && okQuery;
      }),
    [monitored, status, query]
  );

  // Analyse globale : on prend les projets en cours les plus risqués
  const topRisk = useMemo(
    () =>
      [...monitored]
        .map((m) => ({ m, insight: analyse(m) }))
        .sort((a, b) => b.insight.riskScore - a.insight.riskScore)[0],
    [monitored]
  );

  const allAlerts = useMemo(() => {
    const rank = { critical: 0, warning: 1, info: 2 } as const;
    return [...summary.alerts, ...internshipAlertsToSe(internships)].sort((a, b) => rank[a.level] - rank[b.level]);
  }, [summary.alerts, internships]);

  const trend = summary.gap === null ? "UNKNOWN" : summary.gap >= 5 ? "AHEAD" : summary.gap > -10 ? "ON_TRACK" : summary.gap > -20 ? "LATE" : "CRITICAL";

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* En-tête */}
        <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 p-5 text-white shadow-md">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-amber-400/25 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
                <BarChart3 className="h-7 w-7 text-amber-300" /> Suivi &amp; Évaluation
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-blue-100">
                Planifier → mesurer → comparer prévu / réel → analyser → décider. Tous les chiffres sont calculés
                automatiquement depuis la base de données.
              </p>
            </div>
            <a href="#stagiaires" className="rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold text-white hover:bg-white/25">
              Stagiaires ↓
            </a>
          </div>
        </header>

        {loading && (
          <div className="flex items-center gap-2 text-slate-500">
            <Spinner /> Calcul du suivi en cours…
          </div>
        )}

        {!loading && projectsError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Suivi des projets indisponible : {projectsError}
          </div>
        )}

        {!loading && !projectsError && (
          <>
            {/* Vue globale */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
              <Kpi label="Projets" value={summary.projects} hint={`${summary.active} en cours · ${summary.completed} terminés`} icon={Briefcase} />
              <Kpi label="En retard" value={summary.late} hint={`${summary.atRisk} à risque élevé`} icon={TimerReset} tone="bg-amber-50 text-amber-700" />
              <Kpi label="Bénéficiaires" value={summary.beneficiaries} hint={summary.beneficiaryTarget ? `Cible : ${summary.beneficiaryTarget}` : undefined} icon={Heart} tone="bg-rose-50 text-rose-700" />
              <Kpi label="Activités" value={`${summary.activitiesDone}/${summary.activities}`} hint={`${summary.activitiesBlockedOrLate} en retard`} icon={Activity} tone="bg-sky-50 text-sky-700" />
              <Kpi label="Évaluations" value={summary.evaluations} icon={ClipboardList} tone="bg-emerald-50 text-emerald-700" />
              <Kpi label="Budget prévu" value={fmtMoney(summary.budgetPlanned)} hint={summary.budgetSpent !== null ? `Dépensé : ${fmtMoney(summary.budgetSpent)}` : "Dépenses non renseignées"} icon={Wallet} tone="bg-violet-50 text-violet-700" />
            </div>

            {/* Avancement global prévu / réel / écart */}
            <Section title="Avancement global" subtitle="Moyenne des projets : avancement réel comparé à l'avancement prévu">
              <SeProgress value={summary.actual} planned={summary.planned} size="lg" tone={trendTone[trend].bar} />
              <div className="mt-3 grid grid-cols-3 gap-3 text-center text-sm">
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Prévu</p><p className="text-xl font-bold">{fmtPct(summary.planned)}</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Réel</p><p className="text-xl font-bold">{fmtPct(summary.actual)}</p></div>
                <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Écart</p><GapBadge gap={summary.gap} trend={trend} /></div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(Object.keys(COMPONENT_LABEL) as ComponentKey[]).map((k) => (
                  <SeProgress key={k} label={COMPONENT_LABEL[k]} value={summary.components[k]} size="sm" />
                ))}
              </div>
            </Section>

            <div className="grid gap-5 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <AlertsPanel alerts={allAlerts} showProject limit={8} />
              </div>
              <ScorePanel score={summary.score} components={summary.components} weights={weights} onWeightsChange={setWeights} />
            </div>

            {topRisk && topRisk.insight.riskScore > 0 && (
              <InsightsPanel
                insight={topRisk.insight}
                title={`Analyse automatique — projet le plus à risque : ${topRisk.m.project.name}`}
              />
            )}

            {/* Liste des projets */}
            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-900">Projets ({visible.length})</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Rechercher un projet…"
                      className="w-56 rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StatusFilter)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="ALL">Tous les statuts</option>
                    {(Object.keys(PROJECT_STATUS_LABEL) as ProjectStatus[]).map((s) => (
                      <option key={s} value={s}>{PROJECT_STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                </div>
              </div>

              {visible.length === 0 ? (
                <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
                  <TriangleAlert className="h-4 w-4" /> Aucun projet ne correspond.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {visible.map((m) => <ProjectSeCard key={m.project.id} m={m} />)}
                </div>
              )}
            </section>

            <p className="flex items-center gap-1 text-xs text-slate-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> Chaîne automatique : activité → jalon → résultat → indicateur → projet → alertes → analyse.
            </p>
          </>
        )}

        {!loading && <InternshipsSection list={internships} error={internshipsError} />}
      </div>
    </AppLayout>
  );
}
