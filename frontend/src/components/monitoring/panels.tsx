"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Bot, CheckCircle2, Info, Settings2, ShieldAlert, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  COMPONENT_LABEL,
  DEFAULT_WEIGHTS,
  fmtPct,
  saveWeights,
  type AlertLevel,
  type ComponentKey,
  type HistoryPoint,
  type Insight,
  type SeAlert,
  type Weights,
} from "@/lib/monitoring";
import { EmptyState, Pill, SeProgress, Section } from "./parts";
import type { AiAnalysis } from "@/services/monitoring.service";

// ------------------------------------------------------------
// ALERTES
// ------------------------------------------------------------

const alertStyle: Record<AlertLevel, { icon: typeof Info; box: string; pill: string; label: string }> = {
  critical: { icon: ShieldAlert, box: "border-red-200 bg-red-50", pill: "bg-red-100 text-red-700", label: "Critique" },
  warning: { icon: AlertTriangle, box: "border-amber-200 bg-amber-50", pill: "bg-amber-100 text-amber-700", label: "Attention" },
  info: { icon: Info, box: "border-blue-100 bg-blue-50", pill: "bg-blue-100 text-blue-700", label: "Info" },
};

export function AlertsPanel({
  alerts,
  showProject = false,
  limit,
}: {
  alerts: SeAlert[];
  showProject?: boolean;
  limit?: number;
}) {
  const [filter, setFilter] = useState<AlertLevel | "all">("all");
  const filtered = alerts.filter((a) => filter === "all" || a.level === filter);
  const shown = limit ? filtered.slice(0, limit) : filtered;
  const count = (l: AlertLevel) => alerts.filter((a) => a.level === l).length;

  return (
    <Section
      title="Alertes S&E"
      subtitle="Générées automatiquement à partir des données"
      action={
        <div className="flex gap-1 text-xs">
          {(["all", "critical", "warning", "info"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-2.5 py-1 font-medium transition",
                filter === f ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {f === "all" ? `Toutes (${alerts.length})` : `${alertStyle[f].label} (${count(f)})`}
            </button>
          ))}
        </div>
      }
    >
      {shown.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 className="h-5 w-5" /> Aucune alerte : les données sont cohérentes.
        </div>
      ) : (
        <ul className="space-y-2">
          {shown.map((a) => {
            const s = alertStyle[a.level];
            const Icon = s.icon;
            const content = (
              <div className={cn("flex items-start gap-3 rounded-xl border p-3", s.box)}>
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-700" />
                <div className="min-w-0 flex-1 text-sm">
                  <div className="mb-0.5 flex flex-wrap items-center gap-2">
                    <Pill className={s.pill}>{s.label}</Pill>
                    <Pill className="bg-white/70 text-slate-600">{a.category}</Pill>
                    {showProject && <span className="truncate text-xs font-semibold text-slate-700">{a.projectName}</span>}
                  </div>
                  <p className="text-slate-800">{a.message}</p>
                </div>
              </div>
            );
            return (
              <li key={a.id}>
                {showProject && a.href ? <Link href={a.href}>{content}</Link> : content}
              </li>
            );
          })}
        </ul>
      )}
      {limit && filtered.length > limit && (
        <p className="mt-3 text-center text-xs text-slate-500">+ {filtered.length - limit} autre(s) alerte(s)</p>
      )}
    </Section>
  );
}

// ------------------------------------------------------------
// ANALYSE AUTOMATIQUE
// ------------------------------------------------------------

const riskTone = {
  Faible: "bg-emerald-100 text-emerald-700",
  Moyen: "bg-amber-100 text-amber-700",
  Élevé: "bg-red-100 text-red-700",
} as const;

export function InsightsPanel({ insight, title = "Analyse automatique" }: { insight: Insight; title?: string }) {
  return (
    <Section
      title={title}
      subtitle="Calculée à partir des données S&E (règles). Analyses prédictives détaillées dans le module IA."
      action={
        <Link href="/ai" className="inline-flex items-center gap-1 rounded-lg border border-violet-200 px-2.5 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-50">
          <Sparkles className="h-3.5 w-3.5" /> Module IA
        </Link>
      }
    >
      <div className="mb-3 flex items-center gap-3">
        <span className="rounded-xl bg-violet-100 p-2 text-violet-700"><Bot className="h-5 w-5" /></span>
        <div>
          <p className="text-xs text-slate-500">Risque de retard</p>
          <Pill className={riskTone[insight.riskLevel]}>{insight.riskLevel} · {insight.riskScore}/100</Pill>
        </div>
      </div>

      <ul className="space-y-2 text-sm text-slate-700">
        {insight.messages.map((m, i) => (
          <li key={i} className="flex gap-2"><span className="text-violet-500">•</span>{m}</li>
        ))}
      </ul>

      {insight.recommendations.length > 0 && (
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Recommandations</p>
          <ul className="space-y-1 text-sm text-slate-700">
            {insight.recommendations.map((r, i) => (
              <li key={i} className="flex gap-2"><span className="text-emerald-600">→</span>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

// ------------------------------------------------------------
// SCORE S&E + pondérations configurables
// ------------------------------------------------------------

export function ScorePanel({
  score,
  components,
  weights,
  onWeightsChange,
}: {
  score: number | null;
  components: Record<ComponentKey, number | null>;
  weights: Weights;
  onWeightsChange: (w: Weights) => void;
}) {
  const [editing, setEditing] = useState(false);
  const keys = Object.keys(DEFAULT_WEIGHTS) as ComponentKey[];
  const total = keys.reduce((a, k) => a + (weights[k] || 0), 0);

  const update = (k: ComponentKey, v: number) => {
    const next = { ...weights, [k]: Math.max(0, Math.min(100, v || 0)) };
    onWeightsChange(next);
    saveWeights(next);
  };

  return (
    <Section
      title="Score S&E global"
      subtitle="Pondérations configurables (composantes sans donnée ignorées)"
      action={
        <button
          onClick={() => setEditing((e) => !e)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          <Settings2 className="h-3.5 w-3.5" /> {editing ? "Terminer" : "Pondérations"}
        </button>
      }
    >
      <div className="mb-4 flex items-end gap-2">
        <span className="text-4xl font-extrabold text-slate-900">{score === null ? "—" : Math.round(score)}</span>
        <span className="pb-1 text-sm text-slate-500">/ 100</span>
      </div>

      <ul className="space-y-3">
        {keys.map((k) => (
          <li key={k}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">{COMPONENT_LABEL[k]}</span>
              {editing ? (
                <label className="flex items-center gap-1 text-slate-500">
                  poids
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={weights[k]}
                    onChange={(e) => update(k, Number(e.target.value))}
                    className="w-14 rounded-md border border-slate-300 px-1.5 py-0.5 text-right text-slate-800"
                  />
                  %
                </label>
              ) : (
                <span className="text-slate-500">poids {weights[k]} %</span>
              )}
            </div>
            <SeProgress value={components[k]} size="sm" label={undefined} />
            <p className="mt-0.5 text-right text-[11px] text-slate-500">
              {components[k] === null ? "Aucune donnée" : fmtPct(components[k])}
            </p>
          </li>
        ))}
      </ul>

      {editing && (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
          <span>Total des poids : <b>{total} %</b> {total !== 100 && "(re-normalisé automatiquement)"}</span>
          <button
            onClick={() => { onWeightsChange(DEFAULT_WEIGHTS); saveWeights(DEFAULT_WEIGHTS); }}
            className="font-semibold text-blue-700 hover:underline"
          >
            Réinitialiser
          </button>
        </div>
      )}
    </Section>
  );
}

// ------------------------------------------------------------
// HISTORIQUE D'AVANCEMENT (SVG, prévu vs réel)
// ------------------------------------------------------------

export function HistoryChart({ points }: { points: HistoryPoint[] }) {
  if (points.length < 2) {
    return (
      <EmptyState>
        L&apos;historique se construit automatiquement à chaque consultation (1 point par jour).
        Revenez demain pour voir l&apos;évolution.
      </EmptyState>
    );
  }

  const W = 640, H = 220, P = 32;
  const x = (i: number) => P + (i / (points.length - 1)) * (W - P * 2);
  const y = (v: number) => H - P - (v / 100) * (H - P * 2);
  const line = (key: "planned" | "actual") =>
    points
      .map((p, i) => (p[key] === null ? null : `${x(i)},${y(p[key] as number)}`))
      .filter(Boolean)
      .join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g}>
            <line x1={P} x2={W - P} y1={y(g)} y2={y(g)} stroke="#e2e8f0" strokeWidth={1} />
            <text x={4} y={y(g) + 4} fontSize={10} fill="#94a3b8">{g}%</text>
          </g>
        ))}
        <polyline points={line("planned")} fill="none" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 4" />
        <polyline points={line("actual")} fill="none" stroke="#2563eb" strokeWidth={3} />
        {points.map((p, i) =>
          p.actual === null ? null : <circle key={i} cx={x(i)} cy={y(p.actual)} r={3.5} fill="#2563eb" />
        )}
        <text x={x(0)} y={H - 8} fontSize={10} fill="#64748b">{new Date(points[0].date).toLocaleDateString("fr-FR")}</text>
        <text x={x(points.length - 1)} y={H - 8} fontSize={10} fill="#64748b" textAnchor="end">
          {new Date(points[points.length - 1].date).toLocaleDateString("fr-FR")}
        </text>
      </svg>
      <div className="mt-1 flex gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1"><i className="h-0.5 w-5 bg-blue-600" /> Réel</span>
        <span className="flex items-center gap-1"><i className="h-0.5 w-5 border-t-2 border-dashed border-slate-400" /> Prévu</span>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// ANALYSE IA (ai-service Python : risque, prévision, anomalies)
// ------------------------------------------------------------

const aiRiskTone = { FAIBLE: "bg-emerald-100 text-emerald-700", MOYEN: "bg-amber-100 text-amber-700", ELEVE: "bg-red-100 text-red-700" } as const;
const aiRiskLabel = { FAIBLE: "Faible", MOYEN: "Moyen", ELEVE: "Élevé" } as const;

export function AiAnalysisPanel({ analysis }: { analysis: AiAnalysis | null }) {
  if (!analysis)
    return (
      <Section title="Analyse IA" subtitle="Service ai-service">
        <EmptyState>Analyse IA indisponible pour le moment (service arrêté ou droits insuffisants).</EmptyState>
      </Section>
    );

  const f = analysis.forecast;
  return (
    <Section
      title="Analyse IA"
      subtitle={analysis.engine === "local-fallback" ? "Analyse simplifiée (service IA arrêté)" : "Calculée par le service IA sur les données PostgreSQL"}
      action={
        <Pill className={aiRiskTone[analysis.risk.level]}>
          Risque {aiRiskLabel[analysis.risk.level]} · {analysis.risk.score}/100
        </Pill>
      }
    >
      <p className="text-sm text-slate-700">{analysis.summary}</p>

      {f && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-slate-50 p-2">
            <p className="text-sm font-bold text-slate-900">{f.projectedFinalProgress === null ? "—" : `${Math.round(f.projectedFinalProgress)} %`}</p>
            <p className="text-slate-500">À la date de fin</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2">
            <p className="text-sm font-bold text-slate-900">{f.projectedCompletionDate ? new Date(f.projectedCompletionDate).toLocaleDateString("fr-FR") : "—"}</p>
            <p className="text-slate-500">Achèvement estimé</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2">
            <p className={cn("text-sm font-bold", (f.delayDays ?? 0) > 0 ? "text-red-600" : "text-emerald-600")}>
              {f.delayDays === null ? "—" : `${f.delayDays > 0 ? "+" : ""}${f.delayDays} j`}
            </p>
            <p className="text-slate-500">Écart (confiance {f.confidence})</p>
          </div>
        </div>
      )}

      {analysis.risk.factors.length > 0 && (
        <div className="mt-4">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Facteurs de risque</p>
          <ul className="space-y-1 text-sm text-slate-700">
            {analysis.risk.factors.map((x, i) => (
              <li key={i} className="flex justify-between gap-3"><span>{x.factor}</span><b className="text-slate-500">+{x.points}</b></li>
            ))}
          </ul>
        </div>
      )}

      {analysis.recommendations.length > 0 && (
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Recommandations</p>
          <ul className="space-y-1 text-sm text-slate-700">
            {analysis.recommendations.map((r, i) => (
              <li key={i} className="flex gap-2"><span className="text-emerald-600">→</span>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}
