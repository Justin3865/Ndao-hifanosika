"use client";

import { PHASE_COLORS, PHASE_LABELS, Phase, VERDICT_COLORS, fmt20 } from "@/lib/finalEvaluation";

export const card = "rounded-2xl border border-gray-200 bg-white p-6 shadow-sm";
export const th = "px-2 py-3 font-semibold";

export function VerdictTag({ verdict }: { verdict: string | null }) {
  if (!verdict) return <span className="text-sm text-gray-400">—</span>;

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${VERDICT_COLORS[verdict] ?? "bg-gray-100 text-gray-700"}`}>
      {verdict}
    </span>
  );
}

export function PhaseTag({ phase }: { phase: Phase }) {
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${PHASE_COLORS[phase]}`}>{PHASE_LABELS[phase]}</span>;
}

/** Barre de note sur 20. */
export function ScoreBar({ value }: { value: number | null }) {
  if (value === null) return <span className="text-sm text-gray-400">Non évalué</span>;

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-200">
        <div className="h-full bg-blue-600" style={{ width: `${Math.min(100, Math.max(0, (value / 20) * 100))}%` }} />
      </div>
      <span className="shrink-0 text-sm font-semibold text-gray-900">{fmt20(value)}</span>
    </div>
  );
}

/** Barre de pourcentage (0-100). */
export function PercentBar({ value }: { value: number | null }) {
  if (value === null) return <span className="text-sm text-gray-400">Pas de donnée</span>;

  const tone = value >= 75 ? "bg-green-500" : value >= 60 ? "bg-blue-600" : value >= 40 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full ${tone}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
      <span className="w-9 shrink-0 text-sm font-medium text-gray-900">{Math.round(value)}%</span>
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className={card}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
