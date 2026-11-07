"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { ArrowRight, CalendarDays, ClipboardCheck, GraduationCap, ListChecks, MapPinned, Search, TimerReset } from "lucide-react";
import { fmtDate, fmtPct } from "@/lib/monitoring";
import {
  fullName,
  INTERNSHIP_STATUS_LABEL,
  summarizeInternships,
  type InternshipMonitoring,
  type InternshipStatus,
} from "@/lib/internshipMonitoring";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, GapBadge, Kpi, Pill, SeProgress, trendTone } from "./parts";

type Filter = "ALL" | InternshipStatus;

type Detail = { title: string; description?: string; items: InternshipMonitoring[]; extra: (i: InternshipMonitoring) => string };

// Petit lien cliquable placé dans l'indice d'une tuile (n'active pas la tuile parente)
function HintLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="underline decoration-dotted underline-offset-2 hover:text-blue-700 hover:decoration-solid"
    >
      {children}
    </button>
  );
}

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
            {i.theme ? `Thème : ${i.theme}` : i.title}
            {i.project ? ` · ${i.project.code}` : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Pill className="bg-slate-100 text-slate-700">{INTERNSHIP_STATUS_LABEL[i.status]}</Pill>
          {(i.stagesCount ?? 1) > 1 && <span className="text-[10px] font-semibold text-blue-600">{i.stagesCount} stages</span>}
        </div>
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
  const [detail, setDetail] = useState<Detail | null>(null);

  // Listes ouvertes par les tuiles (mêmes règles que `summarizeInternships`)
  const show = (title: string, items: InternshipMonitoring[], extra: (i: InternshipMonitoring) => string, description?: string) =>
    setDetail({ title, items, extra, description });
  const isLate = (i: InternshipMonitoring) => i.trend === "LATE" || i.trend === "CRITICAL";
  const progressText = (i: InternshipMonitoring) => `Avancement ${fmtPct(i.actualProgress)}`;

  const visible = useMemo(
    () =>
      list.filter((i) => {
        const q = query.trim().toLowerCase();
        const text = `${fullName(i.student)} ${i.title} ${i.theme ?? ""} ${i.project?.name ?? ""} ${fullName(i.supervisor)}`.toLowerCase();
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
            <Kpi
              label="Stagiaires"
              value={s.total}
              hint={`${s.inProgress} en cours · ${s.completed} terminés`}
              hintNode={
                <>
                  <HintLink onClick={() => show("Stagiaires en cours", list.filter((i) => i.status === "IN_PROGRESS"), progressText)}>{s.inProgress} en cours</HintLink>
                  {" · "}
                  <HintLink onClick={() => show("Stagiaires terminés", list.filter((i) => i.status === "COMPLETED"), progressText)}>{s.completed} terminés</HintLink>
                </>
              }
              onClick={() => show("Tous les stagiaires", list, (i) => INTERNSHIP_STATUS_LABEL[i.status])}
              icon={GraduationCap}
            />
            <Kpi
              label="Avancement moyen"
              value={fmtPct(s.avgProgress)}
              hint={`${s.late} en retard`}
              hintNode={<HintLink onClick={() => show("Stagiaires en retard", list.filter(isLate), progressText, "Avancement réel inférieur au prévu.")}>{s.late} en retard</HintLink>}
              onClick={() => show("Avancement par stagiaire", list.filter((i) => i.status !== "CANCELLED"), (i) => `Prévu ${fmtPct(i.plannedProgress)} · Réel ${fmtPct(i.actualProgress)}`)}
              icon={TimerReset}
              tone="bg-amber-50 text-amber-700"
              progress={s.avgProgress}
            />
            <Kpi
              label="Tâches"
              value={`${s.tasksDone}/${s.tasksTotal}`}
              hint={`${s.tasksOverdue} en retard · ${s.tasksBlocked} bloquée(s)`}
              hintNode={
                <>
                  <HintLink onClick={() => show("Stagiaires avec des tâches en retard", list.filter((i) => i.tasks.overdue > 0), (i) => `${i.tasks.overdue} tâche(s) en retard sur ${i.tasks.total}`)}>{s.tasksOverdue} en retard</HintLink>
                  {" · "}
                  <HintLink onClick={() => show("Stagiaires avec des tâches bloquées", list.filter((i) => i.tasks.blocked > 0), (i) => `${i.tasks.blocked} tâche(s) bloquée(s) sur ${i.tasks.total}`)}>{s.tasksBlocked} bloquée(s)</HintLink>
                </>
              }
              onClick={() => show("Tâches par stagiaire", list.filter((i) => i.tasks.total > 0), (i) => `${i.tasks.completed}/${i.tasks.total} terminée(s)`)}
              icon={ListChecks}
              tone="bg-sky-50 text-sky-700"
            />
            <Kpi
              label="Présence moyenne"
              value={fmtPct(s.avgPresence)}
              hint={`${s.gpsCheckins} check-in GPS`}
              hintNode={<HintLink onClick={() => show("Check-in GPS par stagiaire", list.filter((i) => i.presence.gpsCheckins > 0), (i) => `${i.presence.gpsCheckins} check-in GPS`)}>{s.gpsCheckins} check-in GPS</HintLink>}
              onClick={() => show("Présence par stagiaire", list, (i) => `Présence ${fmtPct(i.presence.rate)} · ${i.presence.presentDays}/${i.presence.workingDays} jour(s)`)}
              icon={MapPinned}
              tone="bg-emerald-50 text-emerald-700"
              progress={s.avgPresence}
            />
            <Kpi
              label="Évaluations"
              value={s.evaluations}
              onClick={() => show("Évaluations par stagiaire", list.filter((i) => i.evaluations.count > 0), (i) => `${i.evaluations.count} évaluation(s)${i.evaluations.averageOn20 !== null ? ` · moyenne ${i.evaluations.averageOn20}/20` : ""}`)}
              icon={ClipboardCheck}
              tone="bg-violet-50 text-violet-700"
            />
            <Kpi
              label="Rapports manquants"
              value={s.reportsMissing}
              hint={`${s.alerts} alerte(s) stagiaires`}
              hintNode={<HintLink onClick={() => show("Stagiaires avec des alertes", list.filter((i) => i.alerts.length > 0), (i) => `${i.alerts.length} alerte(s)`)}>{s.alerts} alerte(s) stagiaires</HintLink>}
              onClick={() => show("Rapports manquants par stagiaire", list.filter((i) => i.reports.missing > 0), (i) => `${i.reports.missing} rapport(s) manquant(s)`)}
              icon={ClipboardCheck}
              tone="bg-rose-50 text-rose-700"
            />
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

      <Modal isOpen={detail !== null} onClose={() => setDetail(null)} size="lg" title={detail?.title} description={detail?.description}>
        {detail && detail.items.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Aucun stagiaire.</p>}
        {detail && detail.items.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {detail.items.map((i) => (
              <li key={i.id}>
                <Link
                  href={`/suivi-evaluation/stagiaires/${i.id}`}
                  onClick={() => setDetail(null)}
                  className="flex items-center justify-between gap-3 py-3 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{fullName(i.student)}</p>
                    <p className="truncate text-xs text-slate-500">
                      {i.theme ? `Thème : ${i.theme}` : i.title}
                      {i.project ? ` · ${i.project.code}` : ""}
                    </p>
                    <p className="text-xs text-slate-500">{detail.extra(i)}</p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-slate-600">{INTERNSHIP_STATUS_LABEL[i.status]}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </section>
  );
}
