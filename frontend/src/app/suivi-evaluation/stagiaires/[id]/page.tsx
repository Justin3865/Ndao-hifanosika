"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarClock, CheckCircle2, ClipboardList, FileCheck2, ListChecks, MapPinned, Paperclip, Star, XCircle } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { Spinner } from "@/components/ui/Spinner";
import { fmtDate, fmtPct } from "@/lib/monitoring";
import {
  fullName,
  INTERNSHIP_STATUS_LABEL,
  TASK_STATUS_LABEL,
  internshipAlertsToSe,
  type InternshipMonitoring,
  type InternshipTaskItem,
} from "@/lib/internshipMonitoring";
import { errorMessage, fetchInternshipMonitoring } from "@/services/monitoring.service";
import { AlertsPanel } from "@/components/monitoring/panels";
import { EmptyState, GapBadge, Kpi, Pill, Section, SeProgress, trendTone } from "@/components/monitoring/parts";

const taskTone: Record<InternshipTaskItem["status"], string> = {
  TODO: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  BLOCKED: "bg-red-100 text-red-700",
  CANCELLED: "bg-slate-200 text-slate-500",
};

const CRITERIA: Array<[keyof NonNullable<InternshipMonitoring["evaluationList"]>[number], string]> = [
  ["technicalScore", "Compétences techniques"],
  ["qualityScore", "Qualité du travail"],
  ["autonomyScore", "Autonomie"],
  ["communicationScore", "Communication"],
  ["punctualityScore", "Ponctualité"],
];

/** 28 derniers jours : présent / absent (jours ouvrés) / week-end. */
function presenceGrid(presence: string[]) {
  const set = new Set(presence);
  const days: { key: string; state: "present" | "absent" | "weekend" | "future" }[] = [];
  const today = new Date();
  for (let n = 27; n >= 0; n--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - n));
    const key = d.toISOString().slice(0, 10);
    const wd = d.getUTCDay();
    days.push({ key, state: set.has(key) ? "present" : wd === 0 || wd === 6 ? "weekend" : "absent" });
  }
  return days;
}

export default function InternshipMonitoringPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [data, setData] = useState<InternshipMonitoring | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetchInternshipMonitoring(id)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(errorMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [id]);

  const grid = useMemo(() => presenceGrid(data?.presenceDays ?? []), [data]);

  const back = (
    <Link href="/suivi-evaluation#stagiaires" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline">
      <ArrowLeft className="h-4 w-4" /> Suivi &amp; Évaluation
    </Link>
  );

  if (loading)
    return <AppLayout><div className="flex items-center gap-2 text-slate-500"><Spinner /> Chargement du suivi du stagiaire…</div></AppLayout>;

  if (error || !data)
    return (
      <AppLayout>
        {back}
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error ?? "Stage introuvable."}</div>
      </AppLayout>
    );

  const t = data.tasks;
  const c = data.components;

  return (
    <AppLayout>
      <div className="space-y-5">
        {back}

        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-500">
                {data.project ? `${data.project.code} · ${data.project.name}` : "Sans projet"}
                {data.institution ? ` · ${data.institution}` : ""}
              </p>
              <h1 className="text-2xl font-bold text-slate-900">{fullName(data.student)}</h1>
              <p className="text-sm text-slate-600">{data.title}</p>
              {data.theme && (
                <p className="mt-1 text-sm font-semibold text-blue-800">
                  Thème : « {data.theme} »
                  {data.department ? <span className="font-normal text-slate-500"> · Département {data.department.name}</span> : null}
                  <span className="font-normal text-slate-500"> · Avancement du thème {data.actualProgress === null ? "—" : `${Math.round(data.actualProgress)} %`}</span>
                </p>
              )}
              <p className="mt-1 text-xs text-slate-500">Tuteur : {fullName(data.supervisor)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill className="bg-slate-100 text-slate-700">{INTERNSHIP_STATUS_LABEL[data.status]}</Pill>
              <GapBadge gap={data.gap} trend={data.trend} />
              <Link href={`/internships/${data.id}`} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                Fiche du stage
              </Link>
            </div>
          </div>

          <div className="mt-5">
            <SeProgress value={data.actualProgress} planned={data.plannedProgress} label="Avancement du stage" size="lg" tone={trendTone[data.trend].bar} />
            <div className="mt-3 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Prévu</p><p className="text-lg font-bold">{fmtPct(data.plannedProgress)}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Réel</p><p className="text-lg font-bold">{fmtPct(data.actualProgress)}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Temps écoulé</p><p className="text-lg font-bold">{fmtPct(data.time.elapsedPct)}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Jours restants</p><p className="text-lg font-bold">{data.time.remainingDays ?? "—"}</p></div>
            </div>
            <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
              <CalendarClock className="h-3.5 w-3.5" /> {fmtDate(data.startDate)} → {fmtDate(data.endDate)}
            </p>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Kpi label="Tâches" value={t.total} hint={`${t.completed} terminées · ${t.inProgress} en cours`} icon={ListChecks} tone="bg-sky-50 text-sky-700" progress={c.tasks} />
          <Kpi label="En retard / bloquées" value={`${t.overdue} / ${t.blocked}`} hint="tâches" icon={XCircle} tone="bg-red-50 text-red-700" />
          <Kpi label="Rapports" value={data.reports.total} hint={`${data.reports.missing} manquant(s)`} icon={FileCheck2} tone="bg-indigo-50 text-indigo-700" progress={c.reports} />
          <Kpi label="Évaluations" value={data.evaluations.count} hint={data.evaluations.averageOn20 === null ? "Aucune note" : `Moyenne ${data.evaluations.averageOn20.toFixed(1)}/20`} icon={Star} tone="bg-violet-50 text-violet-700" progress={c.evaluations} />
          <Kpi label="Présence" value={fmtPct(c.presence)} hint={`${data.presence.presentDays}/${data.presence.workingDays} jours · ${data.presence.gpsCheckins} GPS`} icon={MapPinned} tone="bg-emerald-50 text-emerald-700" progress={c.presence} />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <AlertsPanel alerts={internshipAlertsToSe([data])} />

            <Section title="Tâches" subtitle="Avancement, échéances, rapport et preuve">
              {!data.taskList?.length ? (
                <EmptyState>Aucune tâche assignée.</EmptyState>
              ) : (
                <ul className="space-y-2">
                  {data.taskList.map((task) => {
                    const late = task.status !== "COMPLETED" && task.status !== "CANCELLED" && task.dueDate && new Date(task.dueDate) < new Date();
                    return (
                      <li key={task.id} className="rounded-xl border border-slate-200 p-3">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-slate-900">{task.title}</p>
                          <div className="flex items-center gap-1.5">
                            {late && <Pill className="bg-red-100 text-red-700">En retard</Pill>}
                            <Pill className={taskTone[task.status]}>{TASK_STATUS_LABEL[task.status]}</Pill>
                          </div>
                        </div>
                        <SeProgress value={task.status === "COMPLETED" ? 100 : task.progress} size="sm" />
                        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>Échéance {fmtDate(task.dueDate)}</span>
                          {task.completedAt && <span>Terminée le {fmtDate(task.completedAt)}</span>}
                          <span className={`flex items-center gap-1 ${task.hasReport ? "text-emerald-600" : ""}`}>
                            <ClipboardList className="h-3 w-3" /> {task.hasReport ? "Rapport ✓" : "Sans rapport"}
                          </span>
                          <span className={`flex items-center gap-1 ${task.hasEvidence ? "text-emerald-600" : ""}`}>
                            <Paperclip className="h-3 w-3" /> {task.hasEvidence ? "Preuve ✓" : "Sans preuve"}
                          </span>
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>

            <Section title="Évaluations" subtitle="Notes sur 20 par critère">
              {!data.evaluationList?.length ? (
                <EmptyState>Aucune évaluation enregistrée.</EmptyState>
              ) : (
                <div className="space-y-4">
                  {data.evaluationList.map((ev) => (
                    <div key={ev.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="font-semibold text-slate-900">{ev.title}</p>
                        <span className="text-sm font-bold text-slate-900">
                          {ev.overallScore === null ? "—" : `${ev.overallScore.toFixed(1)}/20`}
                        </span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {CRITERIA.map(([key, label]) => {
                          const v = ev[key] as number | null;
                          return <SeProgress key={key} label={`${label}${v === null ? "" : ` (${v}/20)`}`} value={v === null ? null : (v / 20) * 100} size="sm" />;
                        })}
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{fmtDate(ev.evaluatedAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>

          <div className="space-y-5">
            <Section title="Composantes du score" subtitle="Tâches 40 % · Rapports 20 % · Évaluations 20 % · Présence 20 %">
              <div className="space-y-3">
                <SeProgress label="Tâches" value={c.tasks} />
                <SeProgress label="Rapports" value={c.reports} />
                <SeProgress label="Évaluations" value={c.evaluations} />
                <SeProgress label="Présence" value={c.presence} />
                <SeProgress label="Preuves (tâches terminées)" value={data.evidencePct} size="sm" />
              </div>
            </Section>

            <Section title="Présence GPS — 28 derniers jours" subtitle="Un jour est « présent » si une mission GPS a été lancée">
              <div className="grid grid-cols-7 gap-1.5">
                {grid.map((d) => (
                  <div
                    key={d.key}
                    title={`${fmtDate(d.key)} — ${d.state === "present" ? "présent" : d.state === "absent" ? "absent" : "week-end"}`}
                    className={`flex aspect-square items-center justify-center rounded-md text-[10px] font-semibold ${
                      d.state === "present" ? "bg-emerald-500 text-white" : d.state === "absent" ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {d.state === "present" ? <CheckCircle2 className="h-3.5 w-3.5" /> : new Date(d.key).getUTCDate()}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Présent</span>
                <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-red-100" /> Absent</span>
                <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-slate-100" /> Week-end</span>
              </div>
              <p className="mt-3 text-xs text-slate-500">{data.presence.gpsCheckins} mission(s) · {data.presence.gpsPoints} point(s) GPS</p>
            </Section>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
