"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowLeft, CalendarClock, ClipboardList, Flag, Heart, Target, Wallet } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { Spinner } from "@/components/ui/Spinner";
import { Tabs } from "@/components/ui/Tabs";
import {
  analyse,
  DEFAULT_WEIGHTS,
  fmtDate,
  fmtMoney,
  fmtPct,
  loadHistory,
  loadWeights,
  monitorProject,
  PROJECT_STATUS_LABEL,
  recordHistory,
  type HistoryPoint,
  type ObjectiveNode,
  type RawProject,
  type Weights,
} from "@/lib/monitoring";
import {
  errorMessage,
  fetchAnalysis,
  fetchObjectives,
  fetchProjectForMonitoring,
  fetchSnapshots,
  type AiAnalysis,
} from "@/services/monitoring.service";
import { AiAnalysisPanel, AlertsPanel, HistoryChart, InsightsPanel, ScorePanel } from "@/components/monitoring/panels";
import { GapBadge, Kpi, Pill, Section, SeProgress, trendTone } from "@/components/monitoring/parts";
import {
  ActivitiesTab,
  BeneficiariesTab,
  BudgetTab,
  EvaluationsTab,
  MilestonesTab,
  ObjectivesTab,
} from "@/components/monitoring/ProjectTabs";

export default function ProjectMonitoringPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [project, setProject] = useState<RawProject | null>(null);
  const [objectives, setObjectives] = useState<ObjectiveNode[] | null>(null);
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [serverHistory, setServerHistory] = useState<HistoryPoint[] | null>(null);
  const [ai, setAi] = useState<AiAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setWeights(loadWeights());
    let cancelled = false;

    (async () => {
      try {
        const [p, tree] = await Promise.all([fetchProjectForMonitoring(id), fetchObjectives(id)]);
        if (cancelled) return;
        setProject(p);
        setObjectives(tree);
        // Historique serveur et analyse IA : non bloquants
        fetchSnapshots(id).then((h) => !cancelled && setServerHistory(h));
        fetchAnalysis(id).then((a) => !cancelled && setAi(a));
      } catch (e) {
        if (!cancelled) setError(errorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const m = useMemo(
    () => (project ? monitorProject(project, { weights, objectives }) : null),
    [project, weights, objectives]
  );
  const insight = useMemo(() => (m ? analyse(m) : null), [m]);

  // Historique : un point par jour (en attendant l'API snapshots)
  useEffect(() => {
    if (!m) return;
    setHistory(recordHistory(m));
  }, [m?.project.id, m?.actualProgress, m?.plannedProgress]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (project && history.length === 0) setHistory(loadHistory(project.id));
  }, [project]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading)
    return (
      <AppLayout>
        <div className="flex items-center gap-2 text-slate-500"><Spinner /> Chargement du suivi…</div>
      </AppLayout>
    );

  if (error || !m || !insight)
    return (
      <AppLayout>
        <Link href="/suivi-evaluation" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-700">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error ?? "Projet introuvable."}</div>
      </AppLayout>
    );

  const p = m.project;
  const c = m.counts;

  return (
    <AppLayout>
      <div className="space-y-5">
        <Link href="/suivi-evaluation" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Suivi &amp; Évaluation
        </Link>

        {/* En-tête projet + avancement global */}
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-500">{p.code}{p.department ? ` · ${p.department.name}` : ""}</p>
              <h1 className="text-2xl font-bold text-slate-900">{p.name}</h1>
              {p.objective && <p className="mt-1 max-w-3xl text-sm text-slate-600">{p.objective}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill className="bg-slate-100 text-slate-700">{PROJECT_STATUS_LABEL[p.status]}</Pill>
              <GapBadge gap={m.gap} trend={m.trend} />
            </div>
          </div>

          <div className="mt-5">
            <SeProgress value={m.actualProgress} planned={m.plannedProgress} label="Avancement global" size="lg" tone={trendTone[m.trend].bar} />
            <div className="mt-3 grid grid-cols-2 gap-3 text-center text-sm sm:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Prévu</p><p className="text-lg font-bold">{fmtPct(m.plannedProgress)}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Réel</p><p className="text-lg font-bold">{fmtPct(m.actualProgress)}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Temps écoulé</p><p className="text-lg font-bold">{fmtPct(m.time.elapsedPct)}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Jours restants</p><p className="text-lg font-bold">{m.time.remainingDays ?? "—"}</p></div>
            </div>
            <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
              <CalendarClock className="h-3.5 w-3.5" />
              {fmtDate(p.startDate)} → {fmtDate(p.endDate)}
              {m.time.totalDays !== null && ` · durée ${m.time.totalDays} jours`}
            </p>
          </div>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Kpi label="Activités" value={`${c.activitiesDone}/${c.activities}`} hint={`${c.activitiesLate} en retard`} icon={Activity} tone="bg-sky-50 text-sky-700" progress={m.components.activities} />
          <Kpi label="Jalons" value={`${c.milestonesDone}/${c.milestones}`} hint={`${c.milestonesOverdue} dépassé(s)`} icon={Flag} tone="bg-indigo-50 text-indigo-700" progress={m.components.milestones} />
          <Kpi label="Indicateurs" value={c.indicators} hint={m.components.indicators === null ? "Non définis" : fmtPct(m.components.indicators)} icon={Target} tone="bg-emerald-50 text-emerald-700" progress={m.components.indicators} />
          <Kpi label="Bénéficiaires" value={`${m.beneficiaries.total}${m.beneficiaries.target ? `/${m.beneficiaries.target}` : ""}`} icon={Heart} tone="bg-rose-50 text-rose-700" progress={m.components.beneficiaries} />
          <Kpi label="Budget" value={m.budget.executionPct === null ? "—" : fmtPct(m.budget.executionPct)} hint={fmtMoney(m.budget.planned)} icon={Wallet} tone="bg-violet-50 text-violet-700" progress={m.budget.executionPct} />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <Section title="Évolution de l'avancement" subtitle="Prévu vs réel dans le temps">
              <HistoryChart points={serverHistory && serverHistory.length >= 2 ? serverHistory : history} />
            </Section>
            <AlertsPanel alerts={m.alerts} />
          </div>
          <div className="space-y-5">
            <ScorePanel score={m.score} components={m.components} weights={weights} onWeightsChange={setWeights} />
            <AiAnalysisPanel analysis={ai} />
            <InsightsPanel insight={insight} />
          </div>
        </div>

        {/* Détails */}
        <Section title="Détail du suivi">
          <Tabs
            defaultTab="objectifs"
            tabs={[
              { id: "objectifs", label: "Objectifs & indicateurs", content: <ObjectivesTab tree={objectives} /> },
              { id: "activites", label: `Activités (${c.activities})`, content: <ActivitiesTab m={m} /> },
              { id: "jalons", label: `Jalons (${c.milestones})`, content: <MilestonesTab m={m} /> },
              { id: "beneficiaires", label: `Bénéficiaires (${m.beneficiaries.total})`, content: <BeneficiariesTab m={m} /> },
              { id: "budget", label: "Budget", content: <BudgetTab m={m} /> },
              { id: "evaluations", label: `Évaluations (${c.evaluations})`, content: <EvaluationsTab m={m} /> },
            ]}
          />
        </Section>

        <p className="flex items-center gap-1 text-xs text-slate-400">
          <ClipboardList className="h-3.5 w-3.5" /> Les chiffres sont recalculés à chaque chargement depuis les données du projet.
        </p>
      </div>
    </AppLayout>
  );
}
