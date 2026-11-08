// src/utils/departmentDashboardRules.ts
// Règles pures (sans base de données) du tableau de bord par département (cahier des charges §5.5).
// Séparées du service pour être testables sans Prisma.

export type DashboardSection = "RH" | "DAF" | "IMPACT";

/**
 * Sections visibles par rôle (cahier §4 et §5.5) :
 *  - RH            : évaluations, objectifs, stages ;
 *  - DAF           : budget indicatif par projet ;
 *  - COMMUNICATION : impact, statistiques agrégées et anonymisées ;
 *  - COORDINATOR   : impact de ses projets uniquement (le périmètre est appliqué par le service) ;
 *  - DIRECTION / ADMIN : vue consolidée (les trois sections).
 * Tout autre rôle : aucune section (le front garde alors le tableau de bord générique).
 */
export function sectionsForRole(role: string): DashboardSection[] {
  switch (String(role ?? "").trim().toUpperCase()) {
    case "ADMIN":
    case "DIRECTION":
      return ["RH", "DAF", "IMPACT"];
    case "RH":
      return ["RH"];
    case "DAF":
      return ["DAF"];
    case "COMMUNICATION":
    case "COORDINATOR":
      return ["IMPACT"];
    default:
      return [];
  }
}

/** Pourcentage entier 0..100 ; null si le dénominateur est nul ou invalide. */
export function pct(part: number, total: number): number | null {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return null;
  return Math.round((part / total) * 100);
}

const num = (v: unknown): number => {
  const n = typeof v === "object" && v !== null && "toNumber" in v ? (v as { toNumber(): number }).toNumber() : Number(v);
  return Number.isFinite(n) ? n : 0;
};

export interface BudgetRowInput {
  id: number;
  name: string;
  code?: string | null;
  status?: string | null;
  budget: unknown;
  budgetSpent: unknown;
}

export interface BudgetRow {
  id: number;
  name: string;
  code: string | null;
  status: string | null;
  budget: number;
  spent: number;
  remaining: number;
  rate: number | null;
  overBudget: boolean;
}

/** Synthèse budgétaire indicative (le DAF garde ses outils comptables : cahier §3.2). */
export function budgetSummary(rows: BudgetRowInput[]) {
  const projects: BudgetRow[] = rows.map((r) => {
    const budget = num(r.budget);
    const spent = num(r.budgetSpent);
    return {
      id: r.id,
      name: r.name,
      code: r.code ?? null,
      status: r.status ?? null,
      budget,
      spent,
      remaining: budget - spent,
      rate: pct(spent, budget),
      overBudget: budget > 0 && spent > budget,
    };
  });
  const withBudget = projects.filter((p) => p.budget > 0);
  const totalBudget = withBudget.reduce((s, p) => s + p.budget, 0);
  const totalSpent = projects.reduce((s, p) => s + p.spent, 0);
  return {
    totalBudget,
    totalSpent,
    remaining: totalBudget - totalSpent,
    rate: pct(totalSpent, totalBudget),
    projectsCount: projects.length,
    withoutBudget: projects.length - withBudget.length,
    overBudget: projects.filter((p) => p.overBudget).length,
    // les plus consommés d'abord : ce sont ceux qu'un DAF regarde en premier
    projects: [...projects].sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1)).slice(0, 8),
  };
}

/** Compte les occurrences d'une clé ; les clés absentes valent 0. */
export function tally<T extends string>(values: Array<string | null | undefined>, keys: readonly T[]): Record<T, number> {
  const out = Object.fromEntries(keys.map((k) => [k, 0])) as Record<T, number>;
  for (const v of values) if (v && (keys as readonly string[]).includes(v)) out[v as T] += 1;
  return out;
}

/** Une relance post-programme compte comme « insertion » si la personne travaille ou a créé une activité. */
export function isInserted(f: { occupation?: string | null; activityCreated?: boolean | null }): boolean {
  return f.occupation === "EMPLOYED" || f.occupation === "SELF_EMPLOYED" || f.activityCreated === true;
}

export function mean(values: Array<number | null | undefined>): number | null {
  const v = values.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  if (v.length === 0) return null;
  return Math.round((v.reduce((s, x) => s + x, 0) / v.length) * 10) / 10;
}

/** Une campagne est en retard si sa date de fin est passée alors qu'elle n'est ni clôturée ni annulée. */
export function isCampaignLate(c: { endDate?: Date | string | null; status: string }, now: Date = new Date()): boolean {
  if (!c.endDate) return false;
  const s = String(c.status).toUpperCase();
  if (s === "CLOSED" || s === "COMPLETED" || s === "CANCELLED" || s === "DRAFT") return false;
  return new Date(c.endDate).getTime() < now.getTime();
}
