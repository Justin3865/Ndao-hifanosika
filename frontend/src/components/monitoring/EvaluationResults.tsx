"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { canSeeBudget } from "@/lib/crud";
import { getStoredRole } from "@/lib/access";
import { exportSheetsCsv, exportSheetsExcel, type ExportSheet } from "@/lib/exportTable";
import {
  DEFAULT_WEIGHTS,
  fmtPct,
  loadWeights,
  monitorProject,
  PROJECT_STATUS_LABEL,
  TREND_LABEL,
  type ObjectiveNode,
  type ProjectMonitoring,
  type RawProject,
} from "@/lib/monitoring";
import { fullName, INTERNSHIP_STATUS_LABEL, type InternshipMonitoring } from "@/lib/internshipMonitoring";
import {
  errorMessage,
  fetchAllObjectives,
  fetchAllProjectsForMonitoring,
  fetchInternshipsMonitoring,
} from "@/services/monitoring.service";
import { GapBadge, SeProgress, trendTone } from "./parts";

const n = (v: number | null | undefined) => (v === null || v === undefined ? "" : Math.round(v * 10) / 10);
const day = (v?: string | null) => (v ? String(v).slice(0, 10) : "");

/** Bouton de téléchargement d'une seule ligne (un projet ou un stagiaire) : CSV ou Excel. */
function RowDownload({ file, sheet }: { file: string; sheet: () => ExportSheet }) {
  const [open, setOpen] = useState(false);
  const stamp = new Date().toISOString().slice(0, 10);
  const slug = file.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const item = "block w-full px-3 py-1.5 text-left text-xs font-medium text-gray-700 hover:bg-gray-100";

  return (
    <div className="relative inline-block">
      <button
        type="button"
        title="Télécharger"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600"
      >
        <Download className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-28 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            <button type="button" className={item} onClick={() => { exportSheetsCsv(`${slug}-${stamp}.csv`, [sheet()]); setOpen(false); }}>
              CSV
            </button>
            <button type="button" className={item} onClick={() => { exportSheetsExcel(`${slug}-${stamp}.xls`, [sheet()]); setOpen(false); }}>
              Excel
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Block({ title, subtitle, action, children }: { title: string; subtitle: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

const th = "px-3 py-2 font-semibold";
const td = "px-3 py-2 text-gray-700";

/**
 * Résultats du suivi & évaluation (avancement prévu / réel) affichés dans la page Évaluations :
 * un bloc pour les projets, un bloc séparé pour les stagiaires. Mêmes calculs que /suivi-evaluation.
 */
export function useEvaluationResults(enabled: boolean) {
  const [projects, setProjects] = useState<RawProject[]>([]);
  const [objectives, setObjectives] = useState<Record<number, ObjectiveNode[]>>({});
  const [internships, setInternships] = useState<InternshipMonitoring[]>([]);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [internshipsError, setInternshipsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);

  useEffect(() => {
    if (!enabled) return;
    setWeights(loadWeights());
    let cancelled = false;

    (async () => {
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
  }, [enabled]);

  // Le plus récent (dernier créé) en premier : id décroissant
  const monitored: ProjectMonitoring[] = useMemo(
    () =>
      [...projects]
        .sort((a, b) => Number(b.id) - Number(a.id))
        .map((p) => monitorProject(p, { weights, objectives: objectives[p.id] ?? null })),
    [projects, objectives, weights]
  );

  const sortedInternships = useMemo(
    () => [...internships].sort((a, b) => Number(b.id) - Number(a.id)),
    [internships]
  );

  const projectSheetFor = (list: ProjectMonitoring[]): ExportSheet => {
    const showBudget = canSeeBudget(getStoredRole());
    return {
      name: "Résultats projets",
      headers: [
        "Projet", "Code", "Statut", "Prévu (%)", "Réel (%)", "Écart (points)", "Tendance", "Score",
        "Activités terminées", "Activités (total)", "Activités en retard", "Jalons faits", "Jalons (total)",
        "Jalons en retard", "Évaluations", "Indicateurs", "Bénéficiaires", "Cible bénéficiaires", "Alertes",
        ...(showBudget ? ["Budget"] : []),
      ],
      rows: list.map((m) => [
        m.project.name, m.project.code, PROJECT_STATUS_LABEL[m.project.status] ?? m.project.status,
        n(m.plannedProgress), n(m.actualProgress), n(m.gap), TREND_LABEL[m.trend], n(m.score),
        m.counts.activitiesDone, m.counts.activities, m.counts.activitiesLate, m.counts.milestonesDone,
        m.counts.milestones, m.counts.milestonesOverdue, m.counts.evaluations, m.counts.indicators,
        m.beneficiaries.total, m.beneficiaries.target ?? "", m.alerts.length,
        ...(showBudget ? [m.project.budget ?? ""] : []),
      ]),
    };
  };

  const internshipSheetFor = (list: InternshipMonitoring[]): ExportSheet => ({
    name: "Résultats stagiaires",
    headers: [
      "Stagiaire", "Stage / thème", "Projet", "Statut", "Établissement", "Début", "Fin", "Tuteur",
      "Prévu (%)", "Réel (%)", "Écart (points)", "Tendance", "Tâches terminées", "Tâches (total)",
      "Tâches en retard", "Rapports manquants", "Évaluations", "Moyenne évaluations (/20)", "Présence (%)", "Alertes",
    ],
    rows: list.map((i) => [
      fullName(i.student), i.theme || i.title, i.project ? `${i.project.code} — ${i.project.name}` : "",
      INTERNSHIP_STATUS_LABEL[i.status] ?? i.status, i.institution ?? "", day(i.startDate), day(i.endDate),
      i.supervisor ? fullName(i.supervisor) : "", n(i.plannedProgress), n(i.actualProgress), n(i.gap),
      TREND_LABEL[i.trend], i.tasks.completed, i.tasks.total, i.tasks.overdue, i.reports.missing,
      i.evaluations.count, n(i.evaluations.averageOn20), n(i.presence.rate), i.alerts.length,
    ]),
  });

  const projectSheet = () => projectSheetFor(monitored);
  const internshipSheet = () => internshipSheetFor(sortedInternships);

  return {
    loading,
    projectsError,
    internshipsError,
    monitored,
    sortedInternships,
    projectSheet,
    internshipSheet,
    projectSheetFor,
    internshipSheetFor,
  };
}

export type EvaluationResultsData = ReturnType<typeof useEvaluationResults>;

export default function EvaluationResults({ data }: { data: EvaluationResultsData }) {
  const { loading, projectsError, internshipsError, monitored, sortedInternships } = data;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Spinner /> Calcul des résultats du suivi…
      </div>
    );
  }

  // Aucun accès ni aux projets ni aux stagiaires : rien à afficher
  if (projectsError && internshipsError) return null;

  return (
    <div className="space-y-6">
      {!projectsError && (
        <Block
          title={`Résultats par projet (${monitored.length})`}
          subtitle="Avancement réel comparé à l'avancement prévu, calculé depuis le suivi & évaluation."
        >
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className={th}>Projet</th>
                  <th className={`${th} w-56`}>Avancement (réel / prévu)</th>
                  <th className={th}>Écart</th>
                  <th className={th}>Score</th>
                  <th className={th}>Évaluations</th>
                  <th className={th}>Statut</th>
                  <th className={`${th} text-right`}>Télécharger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {monitored.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-500">Aucun projet.</td></tr>
                )}
                {monitored.map((m) => (
                  <tr key={m.project.id} className="hover:bg-gray-50">
                    <td className={td}>
                      <Link href={`/suivi-evaluation/${m.project.id}`} className="font-medium text-gray-900 hover:text-blue-700 hover:underline">
                        {m.project.name}
                      </Link>
                      <p className="text-xs text-gray-500">{m.project.code}</p>
                    </td>
                    <td className={td}>
                      <SeProgress value={m.actualProgress} planned={m.plannedProgress} tone={trendTone[m.trend].bar} />
                      <p className="mt-1 text-xs text-gray-500">Réel {fmtPct(m.actualProgress)} · Prévu {fmtPct(m.plannedProgress)}</p>
                    </td>
                    <td className={td}><div className="w-max whitespace-nowrap [&_*]:whitespace-nowrap"><GapBadge gap={m.gap} trend={m.trend} /></div></td>
                    <td className={td}>{m.score === null ? "—" : `${Math.round(m.score)}/100`}</td>
                    <td className={td}>{m.counts.evaluations}</td>
                    <td className={td}>{PROJECT_STATUS_LABEL[m.project.status] ?? m.project.status}</td>
                    <td className={`${td} text-right`}>
                      <RowDownload file={`projet-${m.project.code || m.project.name}`} sheet={() => data.projectSheetFor([m])} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Block>
      )}

      {!internshipsError && (
        <Block
          title={`Résultats par stagiaire (${sortedInternships.length})`}
          subtitle="Avancement du stage : tâches, rapports, évaluations et présence."
        >
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className={th}>Stagiaire</th>
                  <th className={`${th} w-56`}>Avancement (réel / prévu)</th>
                  <th className={th}>Écart</th>
                  <th className={th}>Tâches</th>
                  <th className={th}>Moy. éval.</th>
                  <th className={th}>Statut</th>
                  <th className={`${th} text-right`}>Télécharger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedInternships.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-500">Aucun stagiaire.</td></tr>
                )}
                {sortedInternships.map((i) => (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className={td}>
                      <Link href={`/suivi-evaluation/stagiaires/${i.id}`} className="font-medium text-gray-900 hover:text-blue-700 hover:underline">
                        {fullName(i.student)}
                      </Link>
                      <p className="text-xs text-gray-500">{i.theme || i.title}</p>
                    </td>
                    <td className={td}>
                      <SeProgress value={i.actualProgress} planned={i.plannedProgress} tone={trendTone[i.trend].bar} />
                      <p className="mt-1 text-xs text-gray-500">Réel {fmtPct(i.actualProgress)} · Prévu {fmtPct(i.plannedProgress)}</p>
                    </td>
                    <td className={td}><div className="w-max whitespace-nowrap [&_*]:whitespace-nowrap"><GapBadge gap={i.gap} trend={i.trend} /></div></td>
                    <td className={td}>{i.tasks.completed}/{i.tasks.total}</td>
                    <td className={td}>{i.evaluations.averageOn20 === null ? "—" : `${i.evaluations.averageOn20}/20`}</td>
                    <td className={td}>{INTERNSHIP_STATUS_LABEL[i.status] ?? i.status}</td>
                    <td className={`${td} text-right`}>
                      <RowDownload file={`stagiaire-${fullName(i.student)}`} sheet={() => data.internshipSheetFor([i])} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Block>
      )}
    </div>
  );
}
