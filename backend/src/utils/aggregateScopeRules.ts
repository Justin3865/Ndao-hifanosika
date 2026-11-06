// src/utils/aggregateScopeRules.ts
// Périmètre « coordinateur → ses projets » pour les VUES AGRÉGÉES : /vulnerability/zones, tableaux de bord,
// rapports agrégés et analyses IA/ML. Règles PURES (sans base de données, testables).
//
// Principe : un agrégat calculé sur TOUS les projets ne peut pas être filtré après coup. Pour un coordinateur
// dont le périmètre est limité, chaque route reçoit donc une des décisions suivantes :
//   recompute : l'agrégat est recalculé sur ses seuls projets
//   filter    : les lignes (projectId / beneficiaryId) hors périmètre sont retirées, les totaux recalculés
//   guard     : l'identifiant de projet de l'URL doit appartenir au périmètre (sinon 403)
//   deny      : vue globale non filtrable → 403 explicite (COORDINATOR_AGGREGATES=allow rétablit l'ancien comportement)
//   allow     : rien à faire (données non liées à un projet)

import { ScopeDecision, canAccessProject } from "./projectScopeRules";

export type RecomputeKind = "zones" | "dashboard" | "beneficiaries-report" | "evaluations-report" | "monitoring-overview";

export type AggregateAction =
  | { kind: "allow" }
  | { kind: "deny" }
  | { kind: "guard"; projectId: number }
  | { kind: "filter"; by: "projectId" | "beneficiaryId"; recompute?: RecomputeKind }
  | { kind: "recompute"; what: RecomputeKind };

export const DENY_MESSAGE =
  "Cette vue agrégée couvre tous les projets : elle n'est pas disponible pour un coordinateur dont le périmètre est limité à ses projets. Utilisez les vues par projet.";

const PROJECT_PARAM_ROUTES: RegExp[] = [
  /^\/api\/reports\/projects\/(\d+)(?:\/|$)/,
  /^\/api\/monitoring\/projects\/(\d+)(?:\/|$)/,
  /^\/api\/integration\/projects\/(\d+)(?:\/|$)/,
];

/** Vues IA / ML qui agrègent tous les projets sans pouvoir être filtrées (résumé, anomalies, comparaison, jeux de données…). */
const DENY_PREFIXES = [
  "/api/ai/summary",
  "/api/ai/anomalies/alerts",
  "/api/ai/anomalies/actions",
  "/api/ai/anomalies/notify",
  "/api/ai/anomalies",
  "/api/ai/narrative",
  "/api/ai/charts",
  "/api/ai/chat",
  "/api/ai/train",
  "/api/ai/models",
  "/api/ai/compare",
  "/api/ai/datasets",
  "/api/integration/overview",
  "/api/integration/anomalies",
  "/api/integration/curves",
  "/api/integration/refresh",
];

/** Exceptions statiques ou sans donnée de projet. */
const ALLOW_EXACT = new Set(["/api/ai/health", "/api/ai/score/dropout-risk", "/api/ai/anomalies/catalog"]);

export function normalizePath(url: string): string {
  const p = url.split("?")[0]!.replace(/\/+$/, "").toLowerCase();
  return p || "/";
}

export function classifyAggregate(method: string, url: string): AggregateAction {
  const path = normalizePath(url);
  const m = method.toUpperCase();

  for (const re of PROJECT_PARAM_ROUTES) {
    const hit = re.exec(path);
    if (hit) return { kind: "guard", projectId: Number(hit[1]) };
  }

  if (ALLOW_EXACT.has(path)) return { kind: "allow" };

  if (m === "GET") {
    if (path === "/api/vulnerability/zones") return { kind: "recompute", what: "zones" };
    if (path === "/api/reports/dashboard") return { kind: "recompute", what: "dashboard" };
    if (path === "/api/reports/beneficiaries") return { kind: "filter", by: "projectId", recompute: "beneficiaries-report" };
    if (path === "/api/reports/evaluations") return { kind: "filter", by: "projectId", recompute: "evaluations-report" };
    if (path === "/api/monitoring/overview") return { kind: "filter", by: "projectId", recompute: "monitoring-overview" };
    if (path === "/api/integration/projects") return { kind: "filter", by: "projectId" };
    if (path === "/api/ai/performance") return { kind: "filter", by: "projectId" };
    if (path === "/api/ai/households") return { kind: "filter", by: "projectId" };
    if (path === "/api/ai/dropout-risk") return { kind: "filter", by: "beneficiaryId" };
  }

  if (DENY_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return { kind: "deny" };
  return { kind: "allow" };
}

/* ------------------------------ filtrage des lignes ------------------------------ */

type Row = Record<string, unknown>;
const isObj = (v: unknown): v is Row => !!v && typeof v === "object" && !Array.isArray(v);

/**
 * Filtre les tableaux d'une réponse `{ success, data }` : `data` lui-même, ou tout tableau directement sous `data`
 * dont les lignes portent la clé de filtrage. Une ligne sans clé est retirée (impossible de prouver qu'elle est permise).
 */
export function filterRows(
  body: unknown,
  keyOf: (row: Row) => number | null | undefined,
  allowed: (id: number | null | undefined) => boolean,
): unknown {
  if (!isObj(body)) return body;
  const data = body.data;
  const keep = (rows: unknown[]) => rows.filter((r) => isObj(r) && allowed(keyOf(r)));
  if (Array.isArray(data)) return { ...body, data: keep(data) };
  if (isObj(data)) {
    const next: Row = { ...data };
    for (const [k, v] of Object.entries(data)) {
      if (Array.isArray(v) && v.some((r) => isObj(r) && keyOf(r) !== undefined && keyOf(r) !== null)) next[k] = keep(v);
    }
    return { ...body, data: next };
  }
  return body;
}

export const projectIdOf = (row: Row): number | undefined => {
  const direct = row.projectId;
  if (typeof direct === "number") return direct;
  const nested = isObj(row.project) ? row.project.id : undefined;
  return typeof nested === "number" ? nested : undefined;
};

export const allowedBy = (scope: ScopeDecision) => (id: number | null | undefined) => canAccessProject(scope, id);

/* ------------------------------ totaux recalculés ------------------------------ */

const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);

/** Recalcule { total, vulnerable, byGender } d'après la liste (déjà filtrée) des bénéficiaires. */
export function recomputeBeneficiaryReport(data: Row): Row {
  const list = (Array.isArray(data.beneficiaries) ? data.beneficiaries : []) as Row[];
  const count = (g: string) => list.filter((b) => b.gender === g).length;
  return {
    ...data,
    total: list.length,
    vulnerable: list.filter((b) => b.vulnerable === true).length,
    byGender: { male: count("MALE"), female: count("FEMALE"), other: count("OTHER") },
  };
}

export function recomputeEvaluationReport(data: Row): Row {
  const list = (Array.isArray(data.evaluations) ? data.evaluations : []) as Row[];
  const scores = list.map((e) => e.score).filter((s): s is number => typeof s === "number");
  const by = (s: string) => list.filter((e) => e.status === s).length;
  return {
    ...data,
    total: list.length,
    averageScore: mean(scores),
    byStatus: { draft: by("DRAFT"), submitted: by("SUBMITTED"), validated: by("VALIDATED") },
  };
}

/** Même calcul que monitoring.controller.getOverview, sur les projets conservés. */
export function recomputeMonitoringOverview(data: Row): Row {
  const items = (Array.isArray(data.projects) ? data.projects : []) as Row[];
  return {
    ...data,
    count: items.length,
    summary: {
      active: items.filter((i) => i.status === "ACTIVE").length,
      late: items.filter((i) => i.trend === "LATE" || i.trend === "CRITICAL").length,
      alerts: items.reduce((a, i) => a + (Array.isArray(i.alerts) ? i.alerts.length : 0), 0),
    },
  };
}

export function recomputeInBody(body: unknown, what: RecomputeKind): unknown {
  if (!isObj(body) || !isObj(body.data)) return body;
  const fn =
    what === "beneficiaries-report" ? recomputeBeneficiaryReport
    : what === "evaluations-report" ? recomputeEvaluationReport
    : what === "monitoring-overview" ? recomputeMonitoringOverview
    : null;
  return fn ? { ...body, data: fn(body.data) } : body;
}

/* ------------------------------------ zones ------------------------------------ */

/** Indice de vulnérabilité d'une zone (0-100) — identique à vulnerability.service.computeZoneStats. */
export function zoneScore(rate: number, altitude: number | null, distanceKm: number | null): number {
  const altitudeScore = Math.min(1, Math.max(0, (altitude ?? 0) / 2000));
  const distanceScore = distanceKm === null ? 0 : Math.min(1, distanceKm / 500);
  return Math.round((rate * 0.65 + altitudeScore * 0.2 + distanceScore * 0.15) * 100);
}
