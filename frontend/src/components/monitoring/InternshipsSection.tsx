"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CalendarDays, ClipboardCheck, GraduationCap, ListChecks, MapPinned, Search, TimerReset } from "lucide-react";
import { fmtDate, fmtPct } from "@/lib/monitoring";
import {
  fullName,
  INTERNSHIP_STATUS_LABEL,
  summarizeInternships,
  type InternshipMonitoring,
  type InternshipStatus,
} from "@/lib/internshipMonitoring";
import { EmptyState, GapBadge, Kpi, Pill, SeProgress, trendTone } from "./parts";

type Filter = "ALL" | InternshipStatus;

export function InternshipCard({ i }: { i: InternshipMonitoring }) {
  const critical = i.alerts.filter((a) => a.level === "critical").length;
  const warnings = i.alerts.filter((a) => a.level === "warning").length;
  const c = i.components;

  return (
    <Link
      href={`/suivi-evaluation/stagiaires/${i.id}`}
      className="group block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-slate-900">{fullName(i.student)}</p>
          <p className="truncate text-xs text-slate-500">
            {i.title}
            {i.project ? ` · ${i.project.code}` : ""}
          </p>
        </div>
        <Pill className="bg-slate-100 text-slate-700">{INTERNSHIP_STATUS_LABEL[i.status]}</Pill>
      </div>

      <div className="mt-4">
        <SeProgress value={i.actualProgress} planned={i.plannedProgress} label="Avancement du stage" size="lg" tone={trendTone[i.trend].bar} />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>Temps écoulé {fmtPct(i.time.elapsedPct)}</span>
          <GapBadge gap={i.gap} trend={i.trend} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
        <SeProgress label="Tâches" value={c.tasks} size="sm" />
        <SeProgress label="Rapports" value={c.reports} size="sm" />
        <SeProgress label="Évaluations" value={c.evaluations} size="sm" />
        <SeProgress label="Présence" value={c.presence} size="sm" />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-sm font-bold text-slate-900">{i.tasks.completed}/{i.tasks.total}</p>
          <p className="text-slate-500">Tâches</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <p className={`text-sm font-bold ${i.tasks.overdue ? "text-red-600" : "text-slate-900"}`}>{i.tasks.overdue}</p>
          <p className="text-slate-500">En retard</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-sm font-bold text-slate-900">{i.presence.gpsCheckins}</p>
          <p className="text-slate-500">GPS</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" />
          {fmtDate(i.startDate)} → {fmtDate(i.endDate)}
        </span>
        <span className="flex items-center gap-2">
          {critical > 0 && <span className="font-semibold text-red-600">{critical} critique(s)</span>}
          {warnings > 0 && <span className="font-semibold text-amber-600">{warnings} alerte(s)</span>}
          <ArrowRight className="h-4 w-4 text-blue-600 transition group-hover:translate-x-1" />
        </span>
      </div>
      {i.supervisor && <p className="mt-2 truncate text-[11px] text-slate-400">Tuteur : {fullName(i.supervisor)}</p>}
    </Link>
  );
}

export default function InternshipsSection({ list, error }: { list: InternshipMonitoring[]; error?: string | null }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Filter>("ALL");
  const s = useMemo(() => summarizeInternships(list), [list]);

  const visible = useMemo(
    () =>
      list.filter((i) => {
        const q = query.trim().toLowerCase();
        const text = `${fullName(i.student)} ${i.title} ${i.project?.name ?? ""} ${fullName(i.supervisor)}`.toLowerCase();
        return (status === "ALL" || i.status === status) && (!q || text.includes(q));
      }),
    [list, query, status]
  );

  return (
    <section id="stagiaires" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <GraduationCap className="h-5 w-5 text-blue-600" /> Stagiaires ({visible.length})
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un stagiaire…"
              className="w-56 rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value as Filter)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            <option value="ALL">Tous les statuts</option>
            {(Object.keys(INTERNSHIP_STATUS_LABEL) as InternshipStatus[]).map((k) => (
              <option key={k} value={k}>{INTERNSHIP_STATUS_LABEL[k]}</option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
            <Kpi label="Stagiaires" value={s.total} hint={`${s.inProgress} en cours · ${s.completed} terminés`} icon={GraduationCap} />
            <Kpi label="Avancement moyen" value={fmtPct(s.avgProgress)} hint={`${s.late} en retard`} icon={TimerReset} tone="bg-amber-50 text-amber-700" progress={s.avgProgress} />
            <Kpi label="Tâches" value={`${s.tasksDone}/${s.tasksTotal}`} hint={`${s.tasksOverdue} en retard · ${s.tasksBlocked} bloquée(s)`} icon={ListChecks} tone="bg-sky-50 text-sky-700" />
            <Kpi label="Présence moyenne" value={fmtPct(s.avgPresence)} hint={`${s.gpsCheckins} check-in GPS`} icon={MapPinned} tone="bg-emerald-50 text-emerald-700" progress={s.avgPresence} />
            <Kpi label="Évaluations" value={s.evaluations} icon={ClipboardCheck} tone="bg-violet-50 text-violet-700" />
            <Kpi label="Rapports manquants" value={s.reportsMissing} hint={`${s.alerts} alerte(s) stagiaires`} icon={ClipboardCheck} tone="bg-rose-50 text-rose-700" />
          </div>

          {visible.length === 0 ? (
            <EmptyState>Aucun stagiaire ne correspond.</EmptyState>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((i) => <InternshipCard key={i.id} i={i} />)}
            </div>
          )}
        </>
      )}
    </section>
  );
}
