import { logger } from "../config/logger";
import { scoreHouseholds } from "../ml/vulnerability";
import { db } from "../utils/db";
import { ANOMALY_LABELS, ANOMALY_SCOPES } from "./anomalyCatalog";
import { Analysis, Data, loadData, runAnalysis } from "./insights.service";
import { fetchLive, postPython } from "./pyLive.service";
import { IntegrationSnapshot, getIntegrationSafe } from "./integration.service";

/**
 * Données des graphiques (courbes, diagrammes circulaires, histogrammes) de « Analyses IA ».
 *
 * Calcul fait par le service Python : en lisant directement la base (GET /v1/live/dashboard),
 * sinon à partir des données envoyées (POST /v1/dashboard), sinon par le repli local ci-dessous.
 * Le backend y ajoute ce que seul lui connaît : vulnérabilité des ménages et fiabilité des modèles.
 */

export interface Slice {
  key: string;
  label: string;
  value: number;
}

export interface Dashboard {
  engine: "python-db" | "python" | "typescript";
  generatedAt: string;
  totals: {
    projects: number;
    activeProjects: number;
    beneficiaries: number;
    anomalies: number;
    criticalAnomalies: number;
    highRiskBeneficiaries: number;
    avgPerformance: number | null;
    avgEvaluation: number | null;
  };
  anomaliesBySeverity: Slice[];
  anomaliesByScope: Slice[];
  anomaliesByType: Slice[];
  projectsByStatus: Slice[];
  performanceHistogram: Array<{ label: string; value: number }>;
  performanceByProject: Array<Slice & { level: string }>;
  dropoutLevels: Slice[];
  dropoutHistogram: Array<{ label: string; value: number }>;
  evaluationTrend: Array<{ label: string; value: number; count: number }>;
  anomalyTrend: {
    labels: string[];
    series: Array<{ key: string; name: string; values: number[] }>;
    hasHistory: boolean;
  };
  vulnerability?: { total: number; suspected: number; levels: Slice[]; histogram: Array<{ label: string; value: number }> };
  models?: Array<{ name: string; accuracy: number; f1: number; auc: number; sampleSize: number; trainedAt: string }>;
  /** Pont stagiaires ↔ projets ↔ S&E ↔ évaluation finale (même base que « Évaluation finale » et « Suivi & Évaluation »). */
  integration?: {
    totals: {
      avgFinalProject: number | null;
      avgFinalInternship: number | null;
      projectsEvaluated: number;
      internPersons: number;
      internRows: number;
      internsEvaluated: number;
      internsDone: number;
      lateProjects: number;
      weakInterns: number;
      internsAtRisk: number;
      avgPlanned: number | null;
      avgActual: number | null;
    };
    /** note finale /20 de chaque projet noté */
    finalByProject: Array<Slice & { level: string }>;
    /** note /20 de chaque stagiaire noté */
    internScores: Array<Slice & { level: string }>;
    internScoreHistogram: Array<{ label: string; value: number }>;
    internRisk: Slice[];
    /** prévu / réel par projet actif (courbe d'avancement S&E) */
    progressByProject: Array<{ key: string; label: string; planned: number | null; actual: number | null }>;
  };
}

export interface SuspectedHousehold {
  id: number;
  name: string;
  projectName: string;
  score: number;
}

interface Extras {
  vulnerability?: Dashboard["vulnerability"];
  models?: Dashboard["models"];
  suspected: SuspectedHousehold[];
}

const DAY = 24 * 3600 * 1000;
const VULNERABLE_THRESHOLD = 75;

const SEVERITY_LABELS: Record<string, string> = { HIGH: "Critiques", MEDIUM: "Moyennes", LOW: "Faibles" };
const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon", ACTIVE: "Actif", SUSPENDED: "Suspendu", COMPLETED: "Terminé", CANCELLED: "Annulé",
};

const round = (value: number, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;
const average = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

function histogram(values: number[], width = 10, top = 100) {
  const count = top / width;
  const bins = new Array<number>(count).fill(0);

  for (const value of values) bins[Math.min(count - 1, Math.max(0, Math.floor(value / width)))] += 1;

  return bins.map((value, index) => ({ label: `${index * width}-${(index + 1) * width}`, value }));
}

/* ---------------------------- historique des alertes ---------------------------- */

interface HistoryRow {
  firstSeenAt: Date;
  resolvedAt: Date | null;
  severity: string;
}

async function loadHistory(): Promise<HistoryRow[]> {
  try {
    return (await db.aiAlert.findMany({
      where: { type: { not: "DIGEST" }, firstSeenAt: { gte: new Date(Date.now() - 90 * DAY) } },
      select: { firstSeenAt: true, resolvedAt: true, severity: true },
    })) as HistoryRow[];
  } catch {
    return [];
  }
}

function anomalyTrend(history: HistoryRow[], currentOpen: number, days = 30): Dashboard["anomalyTrend"] {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const rows = history.map((row) => [new Date(row.firstSeenAt).getTime(), row.resolvedAt ? new Date(row.resolvedAt).getTime() : null] as const);
  const labels: string[] = [];
  const open: number[] = [];
  const detected: number[] = [];
  const resolved: number[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const start = today.getTime() - offset * DAY;
    const end = start + DAY;
    const day = new Date(start);

    labels.push(`${String(day.getUTCDate()).padStart(2, "0")}/${String(day.getUTCMonth() + 1).padStart(2, "0")}`);
    detected.push(rows.filter(([a]) => a >= start && a < end).length);
    resolved.push(rows.filter(([, b]) => b !== null && b >= start && b < end).length);
    open.push(rows.filter(([a, b]) => a < end && (b === null || b >= end)).length);
  }

  open[open.length - 1] = currentOpen;

  return {
    labels,
    series: [
      { key: "open", name: "Ouvertes", values: open },
      { key: "detected", name: "Détectées", values: detected },
      { key: "resolved", name: "Résolues", values: resolved },
    ],
    hasHistory: rows.length > 0,
  };
}

/* ---------------------------- repli local ---------------------------- */

export function buildDashboardLocal(analysis: Analysis, data: Data, history: HistoryRow[]): Dashboard {
  const bySeverity: Record<string, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  const byScope = new Map<string, number>();
  const byType = new Map<string, number>();

  for (const anomaly of analysis.anomalies) {
    bySeverity[anomaly.severity] += 1;
    const scope = ANOMALY_SCOPES[anomaly.type] ?? "Autre";
    byScope.set(scope, (byScope.get(scope) ?? 0) + 1);
    byType.set(anomaly.type, (byType.get(anomaly.type) ?? 0) + 1);
  }

  const scored = analysis.performance.filter((project) => project.score !== null);
  const statuses = new Map<string, number>();
  for (const project of data.projects) statuses.set(project.status, (statuses.get(project.status) ?? 0) + 1);

  const levels: Record<string, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const risk of analysis.dropoutRisk) levels[risk.riskLevel] += 1;

  const evaluationScores = data.evaluations.filter((e) => e.score !== null).map((e) => Number(e.score));
  const months = new Map<string, number[]>();

  for (const evaluation of data.evaluations) {
    if (evaluation.score === null) continue;
    const moment = new Date(evaluation.evaluatedAt ?? evaluation.createdAt);
    const key = `${moment.getUTCFullYear()}-${String(moment.getUTCMonth() + 1).padStart(2, "0")}`;
    months.set(key, [...(months.get(key) ?? []), Number(evaluation.score)]);
  }

  const performanceAverage = average(scored.map((project) => project.score as number));

  return {
    engine: analysis.engine,
    generatedAt: new Date().toISOString(),
    totals: {
      projects: data.projects.length,
      activeProjects: analysis.summary.counters.activeProjects,
      beneficiaries: data.beneficiaries.length,
      anomalies: analysis.anomalies.length,
      criticalAnomalies: bySeverity.HIGH,
      highRiskBeneficiaries: levels.HIGH,
      avgPerformance: performanceAverage === null ? null : round(performanceAverage),
      avgEvaluation: evaluationScores.length ? round(average(evaluationScores) as number) : null,
    },
    anomaliesBySeverity: ["HIGH", "MEDIUM", "LOW"].map((key) => ({ key, label: SEVERITY_LABELS[key], value: bySeverity[key] })),
    anomaliesByScope: Array.from(byScope, ([key, value]) => ({ key, label: key, value })).sort((a, b) => b.value - a.value),
    anomaliesByType: Array.from(byType, ([key, value]) => ({ key, label: ANOMALY_LABELS[key] ?? key, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12),
    projectsByStatus: Array.from(statuses, ([key, value]) => ({ key, label: STATUS_LABELS[key] ?? key, value })),
    performanceHistogram: histogram(scored.map((project) => project.score as number)),
    performanceByProject: [...scored]
      .sort((a, b) => (a.score as number) - (b.score as number))
      .slice(0, 20)
      .map((project) => ({
        key: String(project.projectId),
        label: project.code || project.name,
        value: project.score as number,
        level: project.level,
      })),
    dropoutLevels: [
      { key: "HIGH", label: "Élevé", value: levels.HIGH },
      { key: "MEDIUM", label: "Moyen", value: levels.MEDIUM },
      { key: "LOW", label: "Faible", value: levels.LOW },
    ],
    dropoutHistogram: histogram(analysis.dropoutRisk.map((risk) => risk.riskScore)),
    evaluationTrend: Array.from(months.keys())
      .sort()
      .slice(-12)
      .map((key) => ({ label: key, value: round(average(months.get(key) as number[]) as number), count: (months.get(key) as number[]).length })),
    anomalyTrend: anomalyTrend(history, analysis.anomalies.length),
  };
}

/* ---------------------------- vulnérabilité et modèles ---------------------------- */

let extrasCache: { at: number; value: Extras } | null = null;

/** Mis en cache 5 minutes : le scoring des ménages est plus coûteux que le reste. */
export async function loadExtras(): Promise<Extras> {
  if (extrasCache && Date.now() - extrasCache.at < 5 * 60_000) return extrasCache.value;

  const extras: Extras = { suspected: [] };

  try {
    const households = await scoreHouseholds();
    const levels = { HIGH: 0, MEDIUM: 0, LOW: 0 };

    for (const household of households) {
      if (household.score >= VULNERABLE_THRESHOLD) levels.HIGH += 1;
      else if (household.score >= 50) levels.MEDIUM += 1;
      else levels.LOW += 1;
    }

    extras.suspected = households
      .filter((household) => !household.vulnerable && household.score >= VULNERABLE_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .map((household) => ({ id: household.id, name: household.name, projectName: household.projectName, score: household.score }));

    extras.vulnerability = {
      total: households.length,
      suspected: extras.suspected.length,
      levels: [
        { key: "HIGH", label: "Élevée (≥ 75)", value: levels.HIGH },
        { key: "MEDIUM", label: "Moyenne (50-74)", value: levels.MEDIUM },
        { key: "LOW", label: "Faible (< 50)", value: levels.LOW },
      ],
      histogram: histogram(households.map((household) => household.score)),
    };
  } catch (error) {
    logger.warn("Tableau de bord IA : vulnérabilité indisponible", error instanceof Error ? error.message : error);
  }

  try {
    const rows = (await db.aiModel.findMany({
      orderBy: { trainedAt: "desc" },
      take: 20,
      select: { name: true, sampleSize: true, metrics: true, trainedAt: true },
    })) as Array<{ name: string; sampleSize: number; metrics: Record<string, number>; trainedAt: Date }>;

    const latest = new Map<string, (typeof rows)[number]>();
    for (const row of rows) if (!latest.has(row.name)) latest.set(row.name, row);

    extras.models = Array.from(latest.values()).map((row) => ({
      name: row.name.replace("vulnerability-", "").toUpperCase(),
      accuracy: Number(row.metrics?.accuracy ?? 0),
      f1: Number(row.metrics?.f1 ?? 0),
      auc: Number(row.metrics?.auc ?? 0),
      sampleSize: row.sampleSize,
      trainedAt: new Date(row.trainedAt).toISOString(),
    }));
  } catch {
    /* table absente : pas de graphique de fiabilité */
  }

  extrasCache = { at: Date.now(), value: extras };
  return extras;
}

/** Les ménages à forte vulnérabilité non classés comptent comme anomalies critiques « Bénéficiaire ». */
function withHouseholds(base: Dashboard, suspected: number): Dashboard {
  if (suspected <= 0) return base;

  const bump = (items: Slice[], key: string, label: string) =>
    items.some((item) => item.key === key)
      ? items.map((item) => (item.key === key ? { ...item, value: item.value + suspected } : item))
      : [...items, { key, label, value: suspected }];

  return {
    ...base,
    totals: { ...base.totals, anomalies: base.totals.anomalies + suspected, criticalAnomalies: base.totals.criticalAnomalies + suspected },
    anomaliesBySeverity: bump(base.anomaliesBySeverity, "HIGH", "Critiques"),
    anomaliesByScope: bump(base.anomaliesByScope, "Bénéficiaire", "Bénéficiaire").sort((a, b) => b.value - a.value),
    anomaliesByType: bump(base.anomaliesByType, "HOUSEHOLD_VULNERABLE", ANOMALY_LABELS.HOUSEHOLD_VULNERABLE).sort((a, b) => b.value - a.value).slice(0, 12),
    anomalyTrend: {
      ...base.anomalyTrend,
      series: base.anomalyTrend.series.map((serie) =>
        serie.key === "open" ? { ...serie, values: serie.values.map((v, i, all) => (i === all.length - 1 ? v + suspected : v)) } : serie,
      ),
    },
  };
}

/* ------------------- pont stagiaires ↔ projets ↔ S&E ↔ évaluation finale ------------------- */

const levelOf20 = (score: number) => (score >= 14 ? "GOOD" : score >= 10 ? "WATCH" : "CRITICAL");

function integrationBlock(snapshot: IntegrationSnapshot): NonNullable<Dashboard["integration"]> {
  const t = snapshot.totals;
  const scoredProjects = snapshot.projects.filter((p) => p.finalScore !== null);
  const scoredInterns = snapshot.internships.filter((i) => i.score !== null);
  const risks = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const intern of snapshot.internships) risks[intern.risk.level] += 1;

  return {
    totals: {
      avgFinalProject: t.avgProjectScore,
      avgFinalInternship: t.avgInternScore,
      projectsEvaluated: t.projectsEvaluated,
      internPersons: t.internPersons,
      internRows: t.internRows,
      internsEvaluated: t.internsEvaluated,
      internsDone: t.internsDone,
      lateProjects: t.lateProjects,
      weakInterns: t.weakInterns,
      internsAtRisk: t.internsAtRisk,
      avgPlanned: t.avgPlanned,
      avgActual: t.avgActual,
    },
    finalByProject: [...scoredProjects]
      .sort((a, b) => (a.finalScore as number) - (b.finalScore as number))
      .slice(0, 20)
      .map((p) => ({ key: String(p.projectId), label: p.code || p.name, value: p.finalScore as number, level: levelOf20(p.finalScore as number) })),
    internScores: [...scoredInterns]
      .sort((a, b) => (a.score as number) - (b.score as number))
      .slice(0, 20)
      .map((i) => ({ key: String(i.id), label: i.name, value: i.score as number, level: levelOf20(i.score as number) })),
    // 10 classes de 2 points sur 20
    internScoreHistogram: histogram(scoredInterns.map((i) => (i.score as number) * 5), 10, 100).map((bin, index) => ({ label: `${index * 2}-${(index + 1) * 2}`, value: bin.value })),
    internRisk: [
      { key: "HIGH", label: "Élevé", value: risks.HIGH },
      { key: "MEDIUM", label: "Moyen", value: risks.MEDIUM },
      { key: "LOW", label: "Faible", value: risks.LOW },
    ],
    progressByProject: snapshot.projects
      .filter((p) => p.status === "ACTIVE")
      .map((p) => ({ key: String(p.projectId), label: p.code || p.name, planned: p.progress.planned, actual: p.progress.actual }))
      .slice(0, 20),
  };
}

/**
 * Applique le pont au tableau de bord :
 *  - les anomalies « stagiaire / S&E / évaluation finale » sont comptées dans les graphiques d'anomalies ;
 *  - les graphiques de performance utilisent le score combiné (base IA + évaluation finale + S&E + stagiaires) ;
 *  - un bloc `integration` alimente les nouveaux graphiques.
 */
async function withIntegration(base: Dashboard, snapshot: IntegrationSnapshot): Promise<Dashboard> {
  const added = snapshot.anomalies;
  const bySeverity: Record<string, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  const byScope = new Map<string, number>();
  const byType = new Map<string, number>();

  for (const row of added) {
    bySeverity[row.severity] += 1;
    const scope = ANOMALY_SCOPES[row.type] ?? "Autre";
    byScope.set(scope, (byScope.get(scope) ?? 0) + 1);
    byType.set(row.type, (byType.get(row.type) ?? 0) + 1);
  }

  const bumpAll = (items: Slice[], extra: Map<string, number>, labelOf: (key: string) => string) => {
    const result = items.map((item) => ({ ...item, value: item.value + (extra.get(item.key) ?? 0) }));
    for (const [key, value] of extra) if (!items.some((item) => item.key === key)) result.push({ key, label: labelOf(key), value });
    return result.sort((a, b) => b.value - a.value);
  };

  // performance combinée (même calcul que /api/ai/performance)
  let performance: Analysis["performance"] | null = null;
  try {
    performance = (await runAnalysis(await loadData())).performance;
  } catch (error) {
    logger.warn("Tableau de bord IA : performance combinée indisponible", error instanceof Error ? error.message : error);
  }

  const scored = performance ? performance.filter((project) => project.score !== null) : [];
  const average = scored.length ? scored.reduce((sum, project) => sum + (project.score as number), 0) / scored.length : null;

  return {
    ...base,
    totals: {
      ...base.totals,
      anomalies: base.totals.anomalies + added.length,
      criticalAnomalies: base.totals.criticalAnomalies + bySeverity.HIGH,
      highRiskBeneficiaries: base.totals.highRiskBeneficiaries,
      avgPerformance: scored.length ? round(average as number) : base.totals.avgPerformance,
    },
    anomaliesBySeverity: base.anomaliesBySeverity.map((item) => ({ ...item, value: item.value + (bySeverity[item.key] ?? 0) })),
    anomaliesByScope: bumpAll(base.anomaliesByScope, byScope, (key) => key),
    anomaliesByType: bumpAll(base.anomaliesByType, byType, (key) => ANOMALY_LABELS[key] ?? key).slice(0, 12),
    anomalyTrend: {
      ...base.anomalyTrend,
      series: base.anomalyTrend.series.map((serie) =>
        serie.key === "open" ? { ...serie, values: serie.values.map((v, i, all) => (i === all.length - 1 ? v + added.length : v)) } : serie,
      ),
    },
    ...(scored.length
      ? {
          performanceHistogram: histogram(scored.map((project) => project.score as number)),
          performanceByProject: [...scored]
            .sort((a, b) => (a.score as number) - (b.score as number))
            .slice(0, 20)
            .map((project) => ({ key: String(project.projectId), label: project.code || project.name, value: project.score as number, level: project.level })),
        }
      : {}),
    integration: integrationBlock(snapshot),
  };
}

/* ---------------------------- point d'entrée ---------------------------- */

export async function getDashboard(): Promise<Dashboard> {
  const extrasPromise = loadExtras();
  let base: Dashboard | null = null;

  // 1) Le service Python lit lui-même la base
  const live = await fetchLive<Dashboard>("/v1/live/dashboard");
  if (live && Array.isArray(live.anomaliesBySeverity)) base = { ...live, engine: "python-db" };

  // 2) Sinon le backend envoie les données ; 3) sinon calcul local
  if (!base) {
    const data = await loadData();
    const history = await loadHistory();

    const remote = await postPython<Dashboard>("/v1/dashboard", {
      projects: data.projects,
      milestones: data.milestones,
      evaluations: data.evaluations,
      activities: data.activities,
      beneficiaries: data.beneficiaries,
      internships: data.internships,
      pendingUsers: data.users,
      history,
    });

    if (remote && Array.isArray(remote.anomaliesBySeverity)) {
      base = { ...remote, engine: "python" };
    } else {
      base = buildDashboardLocal(await runAnalysis(data), data, history);
    }
  }

  const extras = await extrasPromise;

  let result: Dashboard = {
    ...withHouseholds(base, extras.suspected.length),
    ...(extras.vulnerability ? { vulnerability: extras.vulnerability } : {}),
    ...(extras.models?.length ? { models: extras.models } : {}),
  };

  // Pont stagiaires ↔ projets ↔ S&E ↔ évaluation finale (sans lui, le tableau de bord reste celui d'avant)
  const snapshot = await getIntegrationSafe();
  if (snapshot) result = await withIntegration(result, snapshot);

  return result;
}
