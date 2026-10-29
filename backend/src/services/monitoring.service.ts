import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { postPython } from "./pyLive.service";

/**
 * Suivi & Évaluation — calculs côté serveur (source de vérité PostgreSQL).
 *
 * Chaîne automatique :
 *   Activité → Jalon → Indicateur → Résultat → Projet → Snapshot → Analyse IA
 * Les règles sont les mêmes que celles du frontend (src/lib/monitoring.ts).
 */

const DAY = 86_400_000;

export const DEFAULT_WEIGHTS = {
  activities: 30,
  milestones: 20,
  indicators: 25,
  beneficiaries: 10,
  budget: 10,
  evaluations: 5,
} as const;

export type ComponentKey = keyof typeof DEFAULT_WEIGHTS;

// ------------------------------------------------------------
// Outils
// ------------------------------------------------------------

export function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const clamp = (n: number, min = 0, max = 100) => Math.min(Math.max(n, min), max);

function avg(values: Array<number | null | undefined>): number | null {
  const list = values.filter((v): v is number => typeof v === "number");
  return list.length ? list.reduce((a, b) => a + b, 0) / list.length : null;
}

export function timeInfo(start?: Date | null, end?: Date | null, now = new Date()) {
  if (!start || !end || end <= start) {
    return { totalDays: null, elapsedDays: null, remainingDays: null, elapsedPct: null as number | null };
  }
  const total = Math.round((end.getTime() - start.getTime()) / DAY);
  const elapsed = Math.round((now.getTime() - start.getTime()) / DAY);
  return {
    totalDays: total,
    elapsedDays: clamp(elapsed, 0, total),
    remainingDays: Math.max(total - elapsed, 0),
    elapsedPct: clamp((elapsed / total) * 100),
  };
}

export function trendOf(gap: number | null): "AHEAD" | "ON_TRACK" | "LATE" | "CRITICAL" | "UNKNOWN" {
  if (gap === null) return "UNKNOWN";
  if (gap >= 5) return "AHEAD";
  if (gap > -10) return "ON_TRACK";
  if (gap > -20) return "LATE";
  return "CRITICAL";
}

/** Statut d'activité déduit de l'avancement (0 → PLANNED, 100 → COMPLETED). */
export function statusFromProgress(progress: number, current: string): "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" {
  if (current === "CANCELLED") return "CANCELLED";
  if (progress >= 100) return "COMPLETED";
  if (progress > 0) return "IN_PROGRESS";
  return "PLANNED";
}

export function indicatorProgress(i: { baseline: number | null; target: number | null; currentValue: number | null }): number | null {
  if (i.target === null || i.currentValue === null) return null;
  const base = i.baseline ?? 0;
  const span = i.target - base;
  if (span === 0) return i.currentValue >= i.target ? 100 : 0;
  return clamp(((i.currentValue - base) / span) * 100);
}

// ------------------------------------------------------------
// Chargement d'un projet avec tout son contexte S&E
// ------------------------------------------------------------

const PROJECT_INCLUDE = {
  department: true,
  activities: true,
  milestones: true,
  evaluations: true,
  beneficiaries: {
    select: { id: true, gender: true, age: true, vulnerable: true, locality: true, firstName: true, lastName: true, phone: true },
  },
  objectives: {
    orderBy: { order: "asc" as const },
    include: {
      results: {
        orderBy: { order: "asc" as const },
        include: { indicators: { orderBy: { id: "asc" as const } } },
      },
    },
  },
  partnerLinks: { include: { partner: true } },
};

export async function loadProjectContext(projectId: number) {
  return prisma.project.findUnique({ where: { id: projectId }, include: PROJECT_INCLUDE });
}

export async function loadAllProjectContexts() {
  return prisma.project.findMany({ include: PROJECT_INCLUDE, orderBy: { createdAt: "desc" } });
}

type ProjectContext = NonNullable<Awaited<ReturnType<typeof loadProjectContext>>>;

// ------------------------------------------------------------
// Calcul principal
// ------------------------------------------------------------

export function computeMonitoring(p: ProjectContext, now = new Date()) {
  const time = timeInfo(p.startDate, p.endDate, now);

  const activeActs = p.activities.filter((a) => a.status !== "CANCELLED");
  const actualOf = (a: (typeof p.activities)[number]) =>
    a.status === "COMPLETED" ? 100 : clamp(a.progress ?? 0);
  const plannedOf = (a: (typeof p.activities)[number]) => timeInfo(a.startDate, a.endDate, now).elapsedPct;

  const activitiesPct = avg(activeActs.map(actualOf));
  const milestonesPct = avg(
    p.milestones.map((m) => (m.completedAt ? 100 : clamp(m.progress ?? 0)))
  );

  const results = p.objectives.flatMap((o) => o.results);
  const indicatorsPct = avg(
    results.map((r) => {
      const fromInd = avg(
        r.indicators.map((i) =>
          indicatorProgress({ baseline: i.baseline, target: i.target, currentValue: i.currentValue })
        )
      );
      return fromInd ?? (typeof r.progress === "number" && r.progress > 0 ? clamp(r.progress) : null);
    })
  );

  const target = p.beneficiaryTarget ?? null;
  const beneficiariesPct = target && target > 0 ? clamp((p.beneficiaries.length / target) * 100) : null;

  const planned = num(p.budget);
  const spent = num(p.budgetSpent) ?? (() => {
    const list = p.activities.map((a) => num(a.budgetSpent)).filter((v): v is number => v !== null);
    return list.length ? list.reduce((a, b) => a + b, 0) : null;
  })();
  const executionPct = planned && planned > 0 && spent !== null ? (spent / planned) * 100 : null;

  const evalScores = p.evaluations
    .map((e) => e.score)
    .filter((s): s is number => typeof s === "number" && s >= 0 && s <= 100);
  const evaluationsPct = avg(evalScores);

  const physical = avg([activitiesPct, milestonesPct, indicatorsPct]);
  const budgetScore =
    executionPct !== null && physical !== null ? clamp(100 - Math.max(0, executionPct - physical) * 2) : null;

  const components: Record<ComponentKey, number | null> = {
    activities: activitiesPct,
    milestones: milestonesPct,
    indicators: indicatorsPct,
    beneficiaries: beneficiariesPct,
    budget: budgetScore,
    evaluations: evaluationsPct,
  };

  let sum = 0;
  let wSum = 0;
  (Object.keys(DEFAULT_WEIGHTS) as ComponentKey[]).forEach((k) => {
    const v = components[k];
    if (v === null) return;
    sum += v * DEFAULT_WEIGHTS[k];
    wSum += DEFAULT_WEIGHTS[k];
  });
  const score = wSum > 0 ? sum / wSum : null;

  const plannedProgress = avg(activeActs.map(plannedOf)) ?? time.elapsedPct;
  const actualProgress = physical ?? (p.status === "COMPLETED" ? 100 : null);
  const gap = plannedProgress !== null && actualProgress !== null ? actualProgress - plannedProgress : null;

  const milestonesOverdue = p.milestones.filter(
    (m) => !m.completedAt && (m.progress ?? 0) < 100 && m.dueDate && m.dueDate < now
  ).length;
  const activitiesLate = activeActs.filter(
    (a) => a.status !== "COMPLETED" && a.endDate && a.endDate < now
  ).length;

  return {
    projectId: p.id,
    code: p.code,
    name: p.name,
    status: p.status,
    time,
    plannedProgress,
    actualProgress,
    gap,
    trend: trendOf(gap),
    components,
    score,
    budget: {
      planned,
      spent,
      remaining: planned !== null && spent !== null ? planned - spent : null,
      executionPct,
    },
    beneficiaries: { total: p.beneficiaries.length, target, progress: beneficiariesPct },
    counts: {
      activities: activeActs.length,
      activitiesDone: activeActs.filter((a) => a.status === "COMPLETED").length,
      activitiesLate,
      milestones: p.milestones.length,
      milestonesDone: p.milestones.filter((m) => m.completedAt || (m.progress ?? 0) >= 100).length,
      milestonesOverdue,
      evaluations: p.evaluations.length,
      indicators: results.reduce((a, r) => a + r.indicators.length, 0),
    },
  };
}

export type ProjectMonitoringResult = ReturnType<typeof computeMonitoring>;

// ------------------------------------------------------------
// Snapshots (historique d'avancement) — un point par jour
// ------------------------------------------------------------

export async function recordSnapshot(projectId: number, note?: string) {
  try {
    const project = await loadProjectContext(projectId);
    if (!project) return null;

    const m = computeMonitoring(project);
    if (m.actualProgress === null) return null;

    const planned = Math.round(m.plannedProgress ?? 0);
    const actual = Math.round(m.actualProgress);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const existing = await prisma.projectMonitoringSnapshot.findFirst({
      where: { projectId, recordedAt: { gte: startOfDay } },
      orderBy: { recordedAt: "desc" },
    });

    if (existing) {
      return prisma.projectMonitoringSnapshot.update({
        where: { id: existing.id },
        data: { plannedProgress: planned, actualProgress: actual, gap: actual - planned, recordedAt: new Date(), ...(note ? { note } : {}) },
      });
    }

    return prisma.projectMonitoringSnapshot.create({
      data: { projectId, plannedProgress: planned, actualProgress: actual, gap: actual - planned, note: note ?? null },
    });
  } catch (error) {
    // Un snapshot raté ne doit jamais bloquer la mise à jour métier.
    logger.error("Impossible d'enregistrer le snapshot S&E.", error);
    return null;
  }
}

// ------------------------------------------------------------
// Alertes serveur (mêmes règles que le frontend, version compacte)
// ------------------------------------------------------------

export interface SeAlertDto {
  level: "critical" | "warning" | "info";
  category: string;
  message: string;
}

export function buildAlerts(p: ProjectContext, m: ProjectMonitoringResult): SeAlertDto[] {
  const out: SeAlertDto[] = [];
  const live = p.status === "ACTIVE";

  if (live && m.trend === "CRITICAL")
    out.push({ level: "critical", category: "Projet", message: `Retard critique : ${Math.abs(Math.round(m.gap ?? 0))} points sous le prévu.` });
  else if (live && m.trend === "LATE")
    out.push({ level: "warning", category: "Projet", message: `Projet en retard : écart de ${Math.round(m.gap ?? 0)} points.` });

  if (m.budget.executionPct !== null) {
    if (m.budget.executionPct > 100)
      out.push({ level: "critical", category: "Budget", message: `Budget dépassé (${Math.round(m.budget.executionPct)} %).` });
    else if (m.actualProgress !== null && m.budget.executionPct - m.actualProgress > 15)
      out.push({ level: "warning", category: "Budget", message: "Exécution budgétaire supérieure à l'avancement physique." });
  }

  if (m.counts.activitiesLate > 0)
    out.push({ level: m.counts.activitiesLate >= 3 ? "critical" : "warning", category: "Activité", message: `${m.counts.activitiesLate} activité(s) en retard.` });
  if (m.counts.milestonesOverdue > 0)
    out.push({ level: "warning", category: "Jalon", message: `${m.counts.milestonesOverdue} jalon(s) dépassé(s).` });

  if (p.startDate && p.endDate && p.endDate < p.startDate)
    out.push({ level: "critical", category: "Données", message: "Dates incohérentes (fin avant début)." });
  const bud = num(p.budget);
  if (bud !== null && bud < 0)
    out.push({ level: "critical", category: "Données", message: "Budget négatif." });
  if (p.evaluations.some((e) => typeof e.score === "number" && (e.score < 0 || e.score > 100)))
    out.push({ level: "critical", category: "Données", message: "Score d'évaluation hors intervalle 0-100." });

  const seen = new Map<string, number>();
  p.beneficiaries.forEach((b) => {
    const k = `${b.firstName}|${b.lastName}|${b.phone ?? ""}`.toLowerCase();
    seen.set(k, (seen.get(k) ?? 0) + 1);
  });
  const dups = [...seen.values()].filter((n) => n > 1).length;
  if (dups > 0) out.push({ level: "warning", category: "Bénéficiaire", message: `${dups} doublon(s) potentiel(s).` });

  return out;
}

// ------------------------------------------------------------
// Analyse IA : ai-service (Python) puis repli local
// ------------------------------------------------------------

export async function analyseProject(projectId: number) {
  const project = await loadProjectContext(projectId);
  if (!project) return null;

  const snapshots = await prisma.projectMonitoringSnapshot.findMany({
    where: { projectId },
    orderBy: { recordedAt: "asc" },
    take: 365,
  });

  const payload = {
    project: {
      id: project.id,
      name: project.name,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      budget: num(project.budget),
      budgetSpent: num(project.budgetSpent),
      beneficiaryTarget: project.beneficiaryTarget,
    },
    activities: project.activities.map((a) => ({
      id: a.id, title: a.title, status: a.status, progress: a.progress,
      startDate: a.startDate, endDate: a.endDate,
      budget: num(a.budget), budgetSpent: num(a.budgetSpent), updatedAt: a.updatedAt,
    })),
    milestones: project.milestones.map((m) => ({
      id: m.id, title: m.title, dueDate: m.dueDate, completedAt: m.completedAt, progress: m.progress,
    })),
    beneficiaries: project.beneficiaries.map((b) => ({
      id: b.id, gender: b.gender, age: b.age, vulnerable: b.vulnerable,
      firstName: b.firstName, lastName: b.lastName, phone: b.phone,
    })),
    evaluations: project.evaluations.map((e) => ({ id: e.id, score: e.score, status: e.status })),
    objectives: project.objectives.map((o) => ({
      id: o.id, title: o.title,
      results: o.results.map((r) => ({
        id: r.id, title: r.title, progress: r.progress,
        indicators: r.indicators.map((i) => ({
          id: i.id, name: i.name, baseline: i.baseline, target: i.target, currentValue: i.currentValue,
          lastCollectedAt: i.lastCollectedAt,
        })),
      })),
    })),
    snapshots: snapshots.map((s) => ({
      recordedAt: s.recordedAt, plannedProgress: s.plannedProgress, actualProgress: s.actualProgress,
    })),
    now: new Date().toISOString(),
  };

  const remote = await postPython<Record<string, unknown>>("/v1/monitoring/analyze", payload);
  if (remote) return { ...remote, engine: "python" };

  // Repli : analyse minimale locale si l'ai-service est arrêté
  const m = computeMonitoring(project);
  const alerts = buildAlerts(project, m);
  const gap = m.gap ?? 0;
  const risk = clamp(Math.round(Math.max(0, -gap) * 1.5 + alerts.filter((a) => a.level === "critical").length * 10));
  return {
    engine: "local-fallback",
    progress: { planned: m.plannedProgress, actual: m.actualProgress, gap: m.gap },
    risk: { score: risk, level: risk >= 55 ? "ELEVE" : risk >= 25 ? "MOYEN" : "FAIBLE", factors: [] },
    forecast: null,
    anomalies: alerts,
    recommendations: [],
    summary: "Service IA indisponible : analyse simplifiée calculée par le backend.",
  };
}
