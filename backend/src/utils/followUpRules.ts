/**
 * Règles pures du suivi post-programme (3, 6, 12 mois) — sans accès base, donc testables.
 * Cahier des charges §5.4 : « Suivi post-programme (relance à 3, 6, 12 mois) ».
 */

export const FOLLOW_UP_HORIZONS = [3, 6, 12] as const;
export type FollowUpHorizon = (typeof FOLLOW_UP_HORIZONS)[number];

/** Délai de grâce après l'échéance avant de considérer la relance comme manquée. */
export const GRACE_DAYS = 30;
/** Préavis du rappel envoyé au coordinateur. */
export const REMIND_BEFORE_DAYS = 7;

const DAY = 24 * 60 * 60 * 1000;

/** Ajoute des mois en gardant le jour (31 janvier + 1 mois = 28/29 février). */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

export interface ProgramProject {
  status: string;
  endDate: Date | string | null;
  updatedAt: Date | string;
}

/** Date de fin de parcours : seulement pour un projet clôturé (date de fin, sinon dernière mise à jour). */
export function programEndDate(project: ProgramProject): Date | null {
  if (project.status !== "COMPLETED") return null;
  const raw = project.endDate ?? project.updatedAt;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function computeSchedule(endDate: Date): Array<{ horizonMonths: FollowUpHorizon; dueDate: Date }> {
  return FOLLOW_UP_HORIZONS.map((horizonMonths) => ({ horizonMonths, dueDate: addMonths(endDate, horizonMonths) }));
}

export type FollowUpPhase = "done" | "upcoming" | "due" | "overdue" | "missed";

export function classify(
  followUp: { status: string; dueDate: Date | string },
  now: Date = new Date(),
): FollowUpPhase {
  if (followUp.status === "DONE") return "done";
  if (followUp.status === "MISSED") return "missed";
  const due = new Date(followUp.dueDate).getTime();
  const t = now.getTime();
  if (t > due + GRACE_DAYS * DAY) return "missed";
  if (t > due) return "overdue";
  if (t >= due - REMIND_BEFORE_DAYS * DAY) return "due";
  return "upcoming";
}

export interface FollowUpRow {
  horizonMonths: number;
  status: string;
  occupation?: string | null;
  activityCreated?: boolean | null;
  monthlyIncome?: number | null;
  satisfaction?: number | null;
}

export interface FollowUpSummary {
  horizonMonths: number;
  total: number;
  done: number;
  missed: number;
  pending: number;
  /** % de relances réalisées parmi celles échues ou réalisées */
  responseRate: number | null;
  /** % de répondants en emploi, indépendants ou ayant créé une activité */
  insertionRate: number | null;
  avgSatisfaction: number | null;
  avgMonthlyIncome: number | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const pct = (a: number, b: number) => (b > 0 ? round1((a / b) * 100) : null);
const avg = (xs: number[]) => (xs.length ? round1(xs.reduce((s, x) => s + x, 0) / xs.length) : null);

export function isInserted(row: FollowUpRow): boolean {
  return row.occupation === "EMPLOYED" || row.occupation === "SELF_EMPLOYED" || row.activityCreated === true;
}

/** Indicateurs d'impact à moyen terme, par horizon (3 / 6 / 12 mois). */
export function summarize(rows: FollowUpRow[]): FollowUpSummary[] {
  return FOLLOW_UP_HORIZONS.map((h) => {
    const set = rows.filter((r) => r.horizonMonths === h);
    const done = set.filter((r) => r.status === "DONE");
    const missed = set.filter((r) => r.status === "MISSED");
    return {
      horizonMonths: h,
      total: set.length,
      done: done.length,
      missed: missed.length,
      pending: set.length - done.length - missed.length,
      responseRate: pct(done.length, done.length + missed.length),
      insertionRate: pct(done.filter(isInserted).length, done.length),
      avgSatisfaction: avg(done.map((r) => r.satisfaction).filter((x): x is number => typeof x === "number")),
      avgMonthlyIncome: avg(done.map((r) => r.monthlyIncome).filter((x): x is number => typeof x === "number")),
    };
  });
}
