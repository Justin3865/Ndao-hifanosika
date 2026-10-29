"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtGap, fmtPct, TREND_LABEL, type Trend } from "@/lib/monitoring";

// ------------------------------------------------------------
// Couleurs selon la valeur / la tendance
// ------------------------------------------------------------

export const trendTone: Record<Trend, { text: string; bg: string; bar: string; ring: string }> = {
  AHEAD: { text: "text-emerald-700", bg: "bg-emerald-50", bar: "bg-emerald-500", ring: "ring-emerald-200" },
  ON_TRACK: { text: "text-blue-700", bg: "bg-blue-50", bar: "bg-blue-500", ring: "ring-blue-200" },
  LATE: { text: "text-amber-700", bg: "bg-amber-50", bar: "bg-amber-500", ring: "ring-amber-200" },
  CRITICAL: { text: "text-red-700", bg: "bg-red-50", bar: "bg-red-500", ring: "ring-red-200" },
  UNKNOWN: { text: "text-slate-600", bg: "bg-slate-100", bar: "bg-slate-400", ring: "ring-slate-200" },
};

export const valueTone = (v: number | null) =>
  v === null ? "bg-slate-300" : v >= 75 ? "bg-emerald-500" : v >= 40 ? "bg-blue-500" : "bg-amber-500";

// ------------------------------------------------------------
// Barre d'avancement avec repère "prévu"
// ------------------------------------------------------------

export function SeProgress({
  value,
  planned,
  label,
  size = "md",
  tone,
  className,
}: {
  value: number | null;
  planned?: number | null;
  label?: string;
  size?: "sm" | "md" | "lg";
  tone?: string;
  className?: string;
}) {
  const h = size === "sm" ? "h-1.5" : size === "lg" ? "h-4" : "h-2.5";
  const v = value === null ? 0 : Math.min(Math.max(value, 0), 100);

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <div className="mb-1 flex items-center justify-between gap-2 text-xs">
          <span className="font-medium text-slate-600">{label}</span>
          <span className="font-semibold text-slate-800">{fmtPct(value)}</span>
        </div>
      )}
      <div className={cn("relative w-full overflow-hidden rounded-full bg-slate-200", h)}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", tone ?? valueTone(value))}
          style={{ width: `${v}%` }}
        />
        {typeof planned === "number" && (
          <span
            title={`Prévu : ${Math.round(planned)} %`}
            className="absolute top-0 h-full w-0.5 bg-slate-900/70"
            style={{ left: `${Math.min(Math.max(planned, 0), 100)}%` }}
          />
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Badge d'écart / tendance
// ------------------------------------------------------------

export function GapBadge({ gap, trend }: { gap: number | null; trend: Trend }) {
  const t = trendTone[trend];
  const Icon = trend === "AHEAD" ? ArrowUpRight : trend === "LATE" || trend === "CRITICAL" ? ArrowDownRight : Minus;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1", t.bg, t.text, t.ring)}>
      <Icon className="h-3.5 w-3.5" />
      {TREND_LABEL[trend]}
      {gap !== null && <span className="opacity-80">({fmtGap(gap)})</span>}
    </span>
  );
}

// ------------------------------------------------------------
// Tuile KPI
// ------------------------------------------------------------

export function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  tone = "text-blue-700 bg-blue-50",
  progress,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: LucideIcon;
  tone?: string;
  progress?: number | null;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
        </div>
        {Icon && (
          <span className={cn("rounded-xl p-2", tone)}>
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
      {progress !== undefined && <SeProgress value={progress} size="sm" className="mt-3" />}
    </div>
  );
}

// ------------------------------------------------------------
// Section / carte
// ------------------------------------------------------------

export function Section({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", className)}>
      {children}
    </span>
  );
}
