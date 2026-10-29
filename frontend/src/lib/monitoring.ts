// src/lib/monitoring.ts
// ============================================================
// SUIVI & ÉVALUATION — cœur de calcul (fonctions pures)
//
// Source de vérité unique : toutes les pages S&E appellent ces
// fonctions à partir des données PostgreSQL (via l'API). Rien n'est
// saisi à la main quand il peut être calculé :
//   Activité → Jalon → Résultat → Indicateur → Projet → Alertes → IA
// ============================================================

// ------------------------------------------------------------
// TYPES BRUTS (forme renvoyée par le backend actuel)
// ------------------------------------------------------------

export type ProjectStatus =
  | "DRAFT"
  | "ACTIVE"
  | "SUSPENDED"
  | "COMPLETED"
  | "CANCELLED";

export type ActivityStatus =
  | "PLANNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export interface RawActivity {
  id: number;
  projectId: number;
  title: string;
  description?: string | null;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: ActivityStatus;
  budget?: number | string | null;
  /** Optionnel : sera fourni par l'API S&E (0-100) */
  progress?: number | null;
  /** Optionnel : budget réellement utilisé */
  budgetSpent?: number | string | null;
  updatedAt?: string | null;
}

export interface RawMilestone {
  id: number;
  projectId: number;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  progress: number;
}

export interface RawBeneficiary {
  id: number;
  projectId: number;
  firstName: string;
  lastName: string;
  gender?: "MALE" | "FEMALE" | "OTHER" | null;
  age?: number | null;
  phone?: string | null;
  email?: string | null;
  vulnerable?: boolean;
  locality?: string | null;
  zoneId?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface RawEvaluation {
  id: number;
  projectId: number;
  title: string;
  score?: number | null;
  status: string;
  evaluatedAt?: string | null;
}

export interface RawProject {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  objective?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: ProjectStatus;
  budget?: number | string | null;
  /** Optionnel : budget consommé (API S&E) */
  budgetSpent?: number | string | null;
  beneficiaryTarget?: number | null;
  department?: { id: number; name: string } | null;
  createdBy?: { firstName: string; lastName: string } | null;
  activities?: RawActivity[];
  milestones?: RawMilestone[];
  beneficiaries?: RawBeneficiary[];
  evaluations?: RawEvaluation[];
}

// ------------------------------------------------------------
// Objectifs → Résultats → Indicateurs (modèles Prisma existants)
// ------------------------------------------------------------

export interface Indicator {
  id: number;
  name: string;
  description?: string | null;
  unit?: string | null;
  baseline?: number | null;
  target?: number | null;
  currentValue?: number | null;
  source?: string | null;
  frequency?: string | null;
  lastCollectedAt?: string | null;
}

export interface ResultNode {
  id: number;
  title: string;
  description?: string | null;
  progress?: number | null;
  indicators: Indicator[];
}

export interface ObjectiveNode {
  id: number;
  title: string;
  description?: string | null;
  results: ResultNode[];
}

// ------------------------------------------------------------
// OUTILS
// ------------------------------------------------------------

export const clamp = (n: number, min = 0, max = 100) =>
  Math.min(Math.max(n, min), max);

export const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const avg = (values: Array<number | null | undefined>): number | null => {
  const list = values.filter((v): v is number => typeof v === "number");
  if (!list.length) return null;
  return list.reduce((a, b) => a + b, 0) / list.length;
};

const DAY = 86_400_000;
const parse = (d?: string | null) => (d ? new Date(d) : null);

export const round = (n: number | null, digits = 0): number | null =>
  n === null ? null : Number(n.toFixed(digits));

// ------------------------------------------------------------
// TEMPS (automatique : durée, écoulé, restant)
// ------------------------------------------------------------

export interface TimeInfo {
  totalDays: number | null;
  elapsedDays: number | null;
  remainingDays: number | null;
  elapsedPct: number | null;
  started: boolean;
  finished: boolean;
}

export function timeInfo(
  start?: string | null,
  end?: string | null,
  now = new Date()
): TimeInfo {
  const s = parse(start);
  const e = parse(end);

  if (!s || !e || e <= s) {
    return {
      totalDays: null,
      elapsedDays: null,
      remainingDays: null,
      elapsedPct: null,
      started: !!s && s <= now,
      finished: !!e && e < now,
    };
  }

  const total = Math.round((e.getTime() - s.getTime()) / DAY);
  const elapsed = Math.round((now.getTime() - s.getTime()) / DAY);

  return {
    totalDays: total,
    elapsedDays: clamp(elapsed, 0, total),
    remainingDays: Math.max(total - elapsed, 0),
    elapsedPct: clamp((elapsed / total) * 100),
    started: s <= now,
    finished: e < now,
  };
}

// ------------------------------------------------------------
// ACTIVITÉS
// ------------------------------------------------------------

export function activityActual(a: RawActivity): number | null {
  if (a.status === "CANCELLED") return null; // exclue du calcul
  if (a.status === "COMPLETED") return 100;
  const p = typeof a.progress === "number" ? clamp(a.progress) : null;
  if (p !== null && (p > 0 || a.status === "PLANNED")) return p;
  return a.status === "IN_PROGRESS" ? 50 : 0;
}

/** Avancement prévu = part du temps écoulé entre début et fin prévus. */
export function activityPlanned(a: RawActivity, now = new Date()): number | null {
  if (a.status === "CANCELLED") return null;
  return timeInfo(a.startDate, a.endDate, now).elapsedPct;
}

export function isActivityLate(a: RawActivity, now = new Date()): boolean {
  if (a.status === "COMPLETED" || a.status === "CANCELLED") return false;
  const end = parse(a.endDate);
  return !!end && end < now;
}

export type ActivityDisplayStatus =
  | "PLANNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "LATE"
  | "CANCELLED";

export const activityDisplayStatus = (
  a: RawActivity,
  now = new Date()
): ActivityDisplayStatus => (isActivityLate(a, now) ? "LATE" : a.status);

// ------------------------------------------------------------
// JALONS
// ------------------------------------------------------------

export const milestoneActual = (m: RawMilestone) =>
  m.completedAt ? 100 : clamp(m.progress ?? 0);

export function isMilestoneOverdue(m: RawMilestone, now = new Date()): boolean {
  if (m.completedAt || milestoneActual(m) >= 100) return false;
  const due = parse(m.dueDate);
  return !!due && due < now;
}

export function milestoneDelayDays(m: RawMilestone, now = new Date()): number {
  const due = parse(m.dueDate);
  if (!due) return 0;
  const ref = m.completedAt ? new Date(m.completedAt) : now;
  return Math.max(Math.round((ref.getTime() - due.getTime()) / DAY), 0);
}

// ------------------------------------------------------------
// INDICATEURS : (réel - baseline) / (cible - baseline), plafonné à 100
// ------------------------------------------------------------

export function indicatorProgress(i: Indicator): number | null {
  const target = toNum(i.target);
  const current = toNum(i.currentValue);
  if (target === null || current === null) return null;
  const base = toNum(i.baseline) ?? 0;
  const span = target - base;
  if (span === 0) return current >= target ? 100 : 0;
  return clamp(((current - base) / span) * 100);
}

export const resultProgress = (r: ResultNode): number | null => {
  const fromIndicators = avg(r.indicators.map(indicatorProgress));
  return fromIndicators ?? (typeof r.progress === "number" ? clamp(r.progress) : null);
};

export const allIndicators = (tree: ObjectiveNode[]): Indicator[] =>
  tree.flatMap((o) => o.results.flatMap((r) => r.indicators));

// ------------------------------------------------------------
// BÉNÉFICIAIRES / BUDGET / ÉVALUATIONS
// ------------------------------------------------------------

export interface BeneficiaryStats {
  total: number;
  target: number | null;
  progress: number | null;
  women: number;
  men: number;
  other: number;
  unknownGender: number;
  youth: number; // < 25 ans
  vulnerable: number;
  byLocality: Record<string, number>;
}

export function beneficiaryStats(
  list: RawBeneficiary[],
  target?: number | null
): BeneficiaryStats {
  const byLocality: Record<string, number> = {};
  let women = 0, men = 0, other = 0, unknownGender = 0, youth = 0, vulnerable = 0;

  for (const b of list) {
    if (b.gender === "FEMALE") women++;
    else if (b.gender === "MALE") men++;
    else if (b.gender === "OTHER") other++;
    else unknownGender++;
    if (typeof b.age === "number" && b.age < 25) youth++;
    if (b.vulnerable) vulnerable++;
    const loc = b.locality?.trim() || "Non renseignée";
    byLocality[loc] = (byLocality[loc] ?? 0) + 1;
  }

  const t = toNum(target);
  return {
    total: list.length,
    target: t,
    progress: t && t > 0 ? clamp((list.length / t) * 100) : null,
    women, men, other, unknownGender, youth, vulnerable, byLocality,
  };
}

export interface BudgetInfo {
  planned: number | null;
  spent: number | null;
  remaining: number | null;
  executionPct: number | null;
}

export function budgetInfo(p: RawProject): BudgetInfo {
  const planned = toNum(p.budget);
  const spentProject = toNum(p.budgetSpent);
  const spentActivities = (p.activities ?? [])
    .map((a) => toNum(a.budgetSpent))
    .filter((v): v is number => v !== null);

  const spent =
    spentProject ??
    (spentActivities.length ? spentActivities.reduce((a, b) => a + b, 0) : null);

  return {
    planned,
    spent,
    remaining: planned !== null && spent !== null ? planned - spent : null,
    executionPct:
      planned && planned > 0 && spent !== null ? (spent / planned) * 100 : null,
  };
}

export function evaluationAverage(list: RawEvaluation[]): number | null {
  return avg(
    list
      .filter((e) => typeof e.score === "number" && e.score >= 0 && e.score <= 100)
      .map((e) => e.score as number)
  );
}

// ------------------------------------------------------------
// SCORE S&E GLOBAL — pondérations configurables
// ------------------------------------------------------------

export type ComponentKey =
  | "activities"
  | "milestones"
  | "indicators"
  | "beneficiaries"
  | "budget"
  | "evaluations";

export type Weights = Record<ComponentKey, number>;

export const DEFAULT_WEIGHTS: Weights = {
  activities: 30,
  milestones: 20,
  indicators: 25,
  beneficiaries: 10,
  budget: 10,
  evaluations: 5,
};

export const COMPONENT_LABEL: Record<ComponentKey, string> = {
  activities: "Activités",
  milestones: "Jalons",
  indicators: "Indicateurs / résultats",
  beneficiaries: "Bénéficiaires",
  budget: "Budget",
  evaluations: "Évaluations",
};

const WEIGHTS_KEY = "ndao-se-weights";

export function loadWeights(): Weights {
  if (typeof window === "undefined") return DEFAULT_WEIGHTS;
  try {
    const raw = JSON.parse(localStorage.getItem(WEIGHTS_KEY) ?? "null");
    if (raw && typeof raw === "object") return { ...DEFAULT_WEIGHTS, ...raw };
  } catch {
    /* ignore */
  }
  return DEFAULT_WEIGHTS;
}

export function saveWeights(w: Weights) {
  if (typeof window === "undefined") return;
  localStorage.setItem(WEIGHTS_KEY, JSON.stringify(w));
}

/** Les composantes sans donnée sont ignorées et les poids re-normalisés. */
export function computeScore(
  components: Record<ComponentKey, number | null>,
  weights: Weights = DEFAULT_WEIGHTS
): number | null {
  let sum = 0;
  let wSum = 0;
  (Object.keys(weights) as ComponentKey[]).forEach((k) => {
    const v = components[k];
    if (v === null || v === undefined) return;
    sum += v * weights[k];
    wSum += weights[k];
  });
  return wSum > 0 ? sum / wSum : null;
}

// ------------------------------------------------------------
// ÉCART PRÉVU / RÉEL
// ------------------------------------------------------------

export type Trend = "AHEAD" | "ON_TRACK" | "LATE" | "CRITICAL" | "UNKNOWN";

export function trendOf(gap: number | null): Trend {
  if (gap === null) return "UNKNOWN";
  if (gap >= 5) return "AHEAD";
  if (gap > -10) return "ON_TRACK";
  if (gap > -20) return "LATE";
  return "CRITICAL";
}

export const TREND_LABEL: Record<Trend, string> = {
  AHEAD: "En avance",
  ON_TRACK: "Dans les temps",
  LATE: "En retard",
  CRITICAL: "Retard critique",
  UNKNOWN: "Non évaluable",
};

// ------------------------------------------------------------
// ALERTES & QUALITÉ DES DONNÉES (automatiques)
// ------------------------------------------------------------

export type AlertLevel = "critical" | "warning" | "info";
export type AlertCategory =
  | "Projet"
  | "Activité"
  | "Jalon"
  | "Budget"
  | "Bénéficiaire"
  | "Stagiaire"
  | "GPS"
  | "Données";

export interface SeAlert {
  id: string;
  level: AlertLevel;
  category: AlertCategory;
  message: string;
  projectId: number;
  projectName: string;
  href?: string;
}

// ------------------------------------------------------------
// RÉSULTAT CALCULÉ PAR PROJET
// ------------------------------------------------------------

export interface ProjectMonitoring {
  project: RawProject;
  time: TimeInfo;
  plannedProgress: number | null;
  actualProgress: number | null;
  gap: number | null;
  trend: Trend;
  components: Record<ComponentKey, number | null>;
  score: number | null;
  budget: BudgetInfo;
  beneficiaries: BeneficiaryStats;
  counts: {
    activities: number;
    activitiesDone: number;
    activitiesInProgress: number;
    activitiesLate: number;
    activitiesPlanned: number;
    milestones: number;
    milestonesDone: number;
    milestonesOverdue: number;
    evaluations: number;
    indicators: number;
  };
  alerts: SeAlert[];
}

export function monitorProject(
  p: RawProject,
  opts: {
    weights?: Weights;
    objectives?: ObjectiveNode[] | null;
    now?: Date;
  } = {}
): ProjectMonitoring {
  const now = opts.now ?? new Date();
  const weights = opts.weights ?? DEFAULT_WEIGHTS;
  const activities = p.activities ?? [];
  const milestones = p.milestones ?? [];
  const beneficiaries = p.beneficiaries ?? [];
  const evaluations = p.evaluations ?? [];
  const tree = opts.objectives ?? [];

  const time = timeInfo(p.startDate, p.endDate, now);

  // --- composantes --------------------------------------------------
  const activitiesPct = avg(activities.map(activityActual));
  const milestonesPct = avg(milestones.map(milestoneActual));
  const inds = allIndicators(tree);
  const indicatorsPct = avg(
    tree.flatMap((o) => o.results.map(resultProgress))
  );
  const benef = beneficiaryStats(beneficiaries, p.beneficiaryTarget);
  const budget = budgetInfo(p);
  const evalAvg = evaluationAverage(evaluations);

  // avancement physique (hors budget) servant de "réel"
  const physical = avg([activitiesPct, milestonesPct, indicatorsPct]);

  // Budget : on pénalise un budget consommé plus vite que l'avancement
  const budgetScore =
    budget.executionPct !== null && physical !== null
      ? clamp(100 - Math.max(0, budget.executionPct - physical) * 2)
      : null;

  const components: Record<ComponentKey, number | null> = {
    activities: activitiesPct,
    milestones: milestonesPct,
    indicators: indicatorsPct,
    beneficiaries: benef.progress,
    budget: budgetScore,
    evaluations: evalAvg,
  };

  const score = computeScore(components, weights);

  // --- prévu / réel / écart ----------------------------------------
  const plannedFromActivities = avg(activities.map((a) => activityPlanned(a, now)));
  const planned = plannedFromActivities ?? time.elapsedPct;
  const actual = physical ?? (p.status === "COMPLETED" ? 100 : null);
  const gap = planned !== null && actual !== null ? actual - planned : null;

  // --- compteurs -----------------------------------------------------
  const active = activities.filter((a) => a.status !== "CANCELLED");
  const counts = {
    activities: active.length,
    activitiesDone: active.filter((a) => a.status === "COMPLETED").length,
    activitiesInProgress: active.filter((a) => a.status === "IN_PROGRESS").length,
    activitiesLate: active.filter((a) => isActivityLate(a, now)).length,
    activitiesPlanned: active.filter((a) => a.status === "PLANNED").length,
    milestones: milestones.length,
    milestonesDone: milestones.filter((m) => milestoneActual(m) >= 100).length,
    milestonesOverdue: milestones.filter((m) => isMilestoneOverdue(m, now)).length,
    evaluations: evaluations.length,
    indicators: inds.length,
  };

  const result: ProjectMonitoring = {
    project: p,
    time,
    plannedProgress: planned,
    actualProgress: actual,
    gap,
    trend: trendOf(gap),
    components,
    score,
    budget,
    beneficiaries: benef,
    counts,
    alerts: [],
  };

  result.alerts = buildAlerts(result, now);
  return result;
}

// ------------------------------------------------------------
// GÉNÉRATION DES ALERTES
// ------------------------------------------------------------

function buildAlerts(m: ProjectMonitoring, now: Date): SeAlert[] {
  const p = m.project;
  const out: SeAlert[] = [];
  const base = { projectId: p.id, projectName: p.name };
  const href = `/suivi-evaluation/${p.id}`;
  const push = (
    key: string,
    level: AlertLevel,
    category: AlertCategory,
    message: string
  ) => out.push({ id: `${p.id}:${key}`, level, category, message, href, ...base });

  const live = p.status === "ACTIVE";

  // Projet
  if (live && m.trend === "CRITICAL")
    push("late", "critical", "Projet",
      `Retard critique : avancement réel inférieur de ${Math.abs(Math.round(m.gap ?? 0))} points au prévu.`);
  else if (live && m.trend === "LATE")
    push("late", "warning", "Projet",
      `Projet en retard : écart de ${Math.round(m.gap ?? 0)} points entre réel et prévu.`);

  if (live && m.time.finished && (m.actualProgress ?? 0) < 100)
    push("overdue", "critical", "Projet",
      "La date de fin est dépassée alors que le projet n'est pas terminé.");

  // Budget
  if (m.budget.executionPct !== null) {
    if (m.budget.executionPct > 100)
      push("budget-over", "critical", "Budget",
        `Budget dépassé : ${Math.round(m.budget.executionPct)} % du budget prévu consommé.`);
    else if (m.actualProgress !== null && m.budget.executionPct - m.actualProgress > 15)
      push("budget-gap", "warning", "Budget",
        `Exécution budgétaire (${Math.round(m.budget.executionPct)} %) supérieure à l'avancement physique (${Math.round(m.actualProgress)} %).`);
  }

  // Activités
  const acts = p.activities ?? [];
  if (m.counts.activitiesLate > 0)
    push("acts-late", m.counts.activitiesLate >= 3 ? "critical" : "warning", "Activité",
      `${m.counts.activitiesLate} activité(s) en retard pouvant affecter l'objectif final.`);

  const stale = acts.filter((a) => {
    if (a.status !== "IN_PROGRESS" || !a.updatedAt) return false;
    return (now.getTime() - new Date(a.updatedAt).getTime()) / DAY > 30;
  });
  if (stale.length)
    push("acts-stale", "info", "Activité",
      `${stale.length} activité(s) en cours sans mise à jour depuis plus de 30 jours.`);

  // Jalons
  if (m.counts.milestonesOverdue > 0)
    push("ms-overdue", "warning", "Jalon",
      `${m.counts.milestonesOverdue} jalon(s) dépassé(s) et non terminé(s).`);

  // Bénéficiaires
  const b = p.beneficiaries ?? [];
  const incomplete = b.filter((x) => !x.gender || x.age == null).length;
  if (incomplete > 0)
    push("ben-incomplete", "info", "Bénéficiaire",
      `${incomplete} bénéficiaire(s) avec données incomplètes (sexe ou âge manquant).`);

  const seen = new Map<string, number>();
  b.forEach((x) => {
    const k = `${x.firstName}|${x.lastName}|${x.phone ?? ""}`.toLowerCase().trim();
    seen.set(k, (seen.get(k) ?? 0) + 1);
  });
  const dups = [...seen.values()].filter((n) => n > 1).length;
  if (dups > 0)
    push("ben-dup", "warning", "Bénéficiaire",
      `${dups} doublon(s) potentiel(s) parmi les bénéficiaires.`);

  if (m.beneficiaries.target && m.beneficiaries.progress !== null && live &&
      m.time.elapsedPct !== null && m.beneficiaries.progress < m.time.elapsedPct - 20)
    push("ben-target", "warning", "Bénéficiaire",
      `Cible bénéficiaires atteinte à ${Math.round(m.beneficiaries.progress)} % seulement alors que ${Math.round(m.time.elapsedPct)} % du temps est écoulé.`);

  // Qualité des données
  const s = parse(p.startDate), e = parse(p.endDate);
  if (s && e && e < s)
    push("dq-dates", "critical", "Données", "Dates incohérentes : la fin précède le début.");
  if (!p.startDate || !p.endDate)
    push("dq-nodates", "info", "Données", "Dates de début/fin non renseignées : avancement prévu non calculable.");
  const bud = toNum(p.budget);
  if (bud !== null && bud < 0)
    push("dq-budget", "critical", "Données", "Budget négatif.");
  if (!bud)
    push("dq-nobudget", "info", "Données", "Aucun budget défini pour ce projet.");
  if ((p.evaluations ?? []).some((x) => typeof x.score === "number" && (x.score < 0 || x.score > 100)))
    push("dq-score", "critical", "Données", "Score d'évaluation hors intervalle 0-100.");
  if (acts.some((a) => a.startDate && a.endDate && new Date(a.endDate) < new Date(a.startDate)))
    push("dq-act-dates", "warning", "Données", "Activité(s) dont la date de fin précède le début.");
  if (live && acts.length === 0)
    push("dq-noacts", "info", "Données", "Projet actif sans aucune activité planifiée.");

  return out;
}

// ------------------------------------------------------------
// ANALYSE AUTOMATIQUE (règles) — complète le module IA existant (/ai)
// ------------------------------------------------------------

export type RiskLevel = "Faible" | "Moyen" | "Élevé";

export interface Insight {
  riskLevel: RiskLevel;
  riskScore: number; // 0-100
  messages: string[];
  recommendations: string[];
}

export function analyse(m: ProjectMonitoring): Insight {
  const msgs: string[] = [];
  const recos: string[] = [];
  let risk = 0;

  if (m.gap !== null && m.plannedProgress !== null && m.actualProgress !== null) {
    if (m.gap <= -10) {
      msgs.push(
        `Le projet présente un risque de retard : l'avancement réel (${Math.round(m.actualProgress)} %) est inférieur de ${Math.abs(Math.round(m.gap))} % à l'avancement prévu (${Math.round(m.plannedProgress)} %).`
      );
      recos.push("Réviser le calendrier et prioriser les activités critiques.");
      risk += Math.min(Math.abs(m.gap) * 1.5, 40);
    } else if (m.gap >= 5) {
      msgs.push(`Le projet est en avance de ${Math.round(m.gap)} % sur le plan.`);
    } else {
      msgs.push("Le projet suit globalement le calendrier prévu.");
    }
  }

  const { executionPct } = m.budget;
  if (executionPct !== null && m.actualProgress !== null && executionPct - m.actualProgress > 15) {
    msgs.push(
      `Le projet affiche une progression de ${Math.round(m.actualProgress)} % alors que ${Math.round(executionPct)} % du budget est déjà consommé.`
    );
    recos.push("Contrôler les dépenses et justifier l'écart avec la direction financière.");
    risk += 25;
  }

  if (m.counts.activitiesLate > 0) {
    msgs.push(
      `${m.counts.activitiesLate} activité(s) sont en retard et pourraient affecter l'atteinte de l'objectif final.`
    );
    recos.push("Replanifier ou débloquer les activités en retard.");
    risk += Math.min(m.counts.activitiesLate * 8, 25);
  }

  if (m.counts.milestonesOverdue > 0) {
    msgs.push(`${m.counts.milestonesOverdue} jalon(s) ont dépassé leur date prévue.`);
    risk += Math.min(m.counts.milestonesOverdue * 6, 15);
  }

  if (m.beneficiaries.progress !== null) {
    msgs.push(`La cible de bénéficiaires est atteinte à ${Math.round(m.beneficiaries.progress)} %.`);
    if (m.time.elapsedPct !== null && m.beneficiaries.progress < m.time.elapsedPct - 20) {
      recos.push("Renforcer la mobilisation et l'enrôlement des bénéficiaires.");
      risk += 10;
    }
  }

  if (m.counts.indicators === 0)
    recos.push("Définir des objectifs, résultats et indicateurs avec baseline et cible pour mesurer les vrais résultats.");

  if (!msgs.length) msgs.push("Données insuffisantes pour produire une analyse fiable.");

  const riskScore = clamp(Math.round(risk));
  return {
    riskScore,
    riskLevel: riskScore >= 55 ? "Élevé" : riskScore >= 25 ? "Moyen" : "Faible",
    messages: msgs,
    recommendations: recos,
  };
}

// ------------------------------------------------------------
// AGRÉGATION GLOBALE (page principale S&E)
// ------------------------------------------------------------

export interface GlobalSummary {
  projects: number;
  active: number;
  completed: number;
  late: number;
  atRisk: number;
  beneficiaries: number;
  beneficiaryTarget: number;
  activities: number;
  activitiesDone: number;
  activitiesBlockedOrLate: number;
  evaluations: number;
  budgetPlanned: number;
  budgetSpent: number | null;
  planned: number | null;
  actual: number | null;
  gap: number | null;
  components: Record<ComponentKey, number | null>;
  score: number | null;
  alerts: SeAlert[];
}

export function summarize(list: ProjectMonitoring[], weights = DEFAULT_WEIGHTS): GlobalSummary {
  const sumNum = (f: (m: ProjectMonitoring) => number) => list.reduce((a, m) => a + f(m), 0);
  const spent = list.map((m) => m.budget.spent).filter((v): v is number => v !== null);

  const comps = {} as Record<ComponentKey, number | null>;
  (Object.keys(DEFAULT_WEIGHTS) as ComponentKey[]).forEach((k) => {
    comps[k] = avg(list.map((m) => m.components[k]));
  });

  const planned = avg(list.map((m) => m.plannedProgress));
  const actual = avg(list.map((m) => m.actualProgress));
  const alerts = list
    .flatMap((m) => m.alerts)
    .sort((a, b) => rank(a.level) - rank(b.level));

  return {
    projects: list.length,
    active: list.filter((m) => m.project.status === "ACTIVE").length,
    completed: list.filter((m) => m.project.status === "COMPLETED").length,
    late: list.filter((m) => m.trend === "LATE" || m.trend === "CRITICAL").length,
    atRisk: list.filter((m) => analyse(m).riskLevel === "Élevé").length,
    beneficiaries: sumNum((m) => m.beneficiaries.total),
    beneficiaryTarget: sumNum((m) => m.beneficiaries.target ?? 0),
    activities: sumNum((m) => m.counts.activities),
    activitiesDone: sumNum((m) => m.counts.activitiesDone),
    activitiesBlockedOrLate: sumNum((m) => m.counts.activitiesLate),
    evaluations: sumNum((m) => m.counts.evaluations),
    budgetPlanned: sumNum((m) => m.budget.planned ?? 0),
    budgetSpent: spent.length ? spent.reduce((a, b) => a + b, 0) : null,
    planned,
    actual,
    gap: planned !== null && actual !== null ? actual - planned : null,
    components: comps,
    score: computeScore(comps, weights),
    alerts,
  };
}

const rank = (l: AlertLevel) => (l === "critical" ? 0 : l === "warning" ? 1 : 2);

// ------------------------------------------------------------
// HISTORIQUE D'AVANCEMENT (instantanés locaux en attendant l'API)
// ------------------------------------------------------------

export interface HistoryPoint {
  date: string; // YYYY-MM-DD
  planned: number | null;
  actual: number | null;
}

const histKey = (id: number) => `ndao-se-history-${id}`;

export function loadHistory(projectId: number): HistoryPoint[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(histKey(projectId)) ?? "[]");
  } catch {
    return [];
  }
}

/** Enregistre au plus un point par jour. */
export function recordHistory(m: ProjectMonitoring): HistoryPoint[] {
  if (typeof window === "undefined") return [];
  const today = new Date().toISOString().slice(0, 10);
  const hist = loadHistory(m.project.id);
  if (m.actualProgress === null) return hist;

  const point: HistoryPoint = {
    date: today,
    planned: round(m.plannedProgress),
    actual: round(m.actualProgress),
  };
  const idx = hist.findIndex((h) => h.date === today);
  if (idx >= 0) hist[idx] = point;
  else hist.push(point);

  const trimmed = hist.slice(-120);
  try {
    localStorage.setItem(histKey(m.project.id), JSON.stringify(trimmed));
  } catch {
    /* quota */
  }
  return trimmed;
}

// ------------------------------------------------------------
// FORMATAGE
// ------------------------------------------------------------

export const fmtPct = (n: number | null, d = 0) =>
  n === null ? "—" : `${n.toFixed(d).replace(".", ",")} %`;

export const fmtGap = (n: number | null) =>
  n === null ? "—" : `${n > 0 ? "+" : ""}${Math.round(n)} %`;

export const fmtMoney = (n: number | null) =>
  n === null
    ? "—"
    : `${new Intl.NumberFormat("fr-FR").format(Math.round(n))} Ar`;

export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR") : "—";

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  DRAFT: "Brouillon",
  ACTIVE: "En cours",
  SUSPENDED: "Suspendu",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
};

export const ACTIVITY_STATUS_LABEL: Record<ActivityDisplayStatus, string> = {
  PLANNED: "Planifiée",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  LATE: "En retard",
  CANCELLED: "Annulée",
};
