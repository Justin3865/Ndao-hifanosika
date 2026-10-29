"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import {
  fmtDate,
  fmtPct,
  PROJECT_STATUS_LABEL,
  type ProjectMonitoring,
} from "@/lib/monitoring";
import { GapBadge, Pill, SeProgress, trendTone } from "./parts";

export default function ProjectSeCard({ m }: { m: ProjectMonitoring }) {
  const p = m.project;
  const critical = m.alerts.filter((a) => a.level === "critical").length;
  const warnings = m.alerts.filter((a) => a.level === "warning").length;

  return (
    <Link
      href={`/suivi-evaluation/${p.id}`}
      className="group block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500">{p.code}</p>
          <h3 className="truncate text-base font-bold text-slate-900">{p.name}</h3>
        </div>
        <Pill className="bg-slate-100 text-slate-700">{PROJECT_STATUS_LABEL[p.status]}</Pill>
      </div>

      <div className="mt-4">
        <SeProgress
          value={m.actualProgress}
          planned={m.plannedProgress}
          label="Avancement global"
          size="lg"
          tone={trendTone[m.trend].bar}
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>Prévu {fmtPct(m.plannedProgress)} · Réel {fmtPct(m.actualProgress)}</span>
          <GapBadge gap={m.gap} trend={m.trend} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-base font-bold text-slate-900">{m.counts.activitiesDone}/{m.counts.activities}</p>
          <p className="text-slate-500">Activités</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-base font-bold text-slate-900">{m.beneficiaries.total}{m.beneficiaries.target ? `/${m.beneficiaries.target}` : ""}</p>
          <p className="text-slate-500">Bénéficiaires</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-base font-bold text-slate-900">{m.score === null ? "—" : Math.round(m.score)}</p>
          <p className="text-slate-500">Score S&E</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" />
          {fmtDate(p.startDate)} → {fmtDate(p.endDate)}
        </span>
        <span className="flex items-center gap-2">
          {critical > 0 && <span className="font-semibold text-red-600">{critical} critique(s)</span>}
          {warnings > 0 && <span className="font-semibold text-amber-600">{warnings} alerte(s)</span>}
          <ArrowRight className="h-4 w-4 text-blue-600 transition group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
