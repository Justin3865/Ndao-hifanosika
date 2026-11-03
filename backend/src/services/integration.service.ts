import { prisma } from "../config/database";
import { logger } from "../config/logger";
import type { AnomalyRow } from "./insights.service";
import { InternshipAlertDto, loadInternshipsMonitoring } from "./internshipMonitoring.service";
import { computeMonitoring, loadAllProjectContexts } from "./monitoring.service";
import {
  ProjectComponent,
  buildInternshipEvaluations,
  computeProjectEvaluation,
  loadFeedbackByProject,
  loadStudentMaps,
  personKeyOf,
  projectIdsOfInternship,
  rankProjects,
  stageScoresFrom,
} from "./finalEvaluation.service";

/**
 * ============================================================================
 *  PONT « Stagiaires ↔ Activités ↔ Suivi & Évaluation ↔ Évaluation finale ↔ Analyses IA »
 * ============================================================================
 *
 *  Une seule source de vérité, calculée depuis PostgreSQL à chaque lecture (cache 15 s, vidé à
 *  chaque écriture) :
 *
 *    STAGIAIRE ── tâches, rapports, présence GPS, évaluations du tuteur ──► note /20 du stage
 *        │                                                                      │
 *        └── rattaché à un ou plusieurs PROJETS (Internship.projectId + InternshipProject) ┘
 *                                                                               ▼
 *    PROJET ── activités, jalons, indicateurs (S&E) + satisfaction + budget + notes des stages
 *                                                                               ▼
 *                                                             note finale /20 du projet
 *                                                                               ▼
 *    ANALYSES IA : performance, anomalies, synthèse, tableau de bord, alertes, notifications.
 *
 *  Dès qu'un avancement est saisi (stagiaire OU projet), le cache est vidé, l'analyse d'anomalies
 *  est reprogrammée (anomalyRealtime.service) et toutes les pages IA lisent le nouveau résultat.
 * ============================================================================
 */

const TTL_MS = 15_000;

/** Seuils des anomalies issues du pont (modifiables ici, un seul endroit). */
export const THRESHOLDS = {
  /** écart réel − prévu (points) à partir duquel un projet actif est signalé par le S&E */
  seGapMedium: -20,
  seGapHigh: -30,
  /** note /20 */
  finalLowFinal: 12,
  finalCriticalFinal: 10,
  finalLowInterim: 8,
  internLowMedium: 10,
  internLowHigh: 8,
  internAverageWeak: 10,
};

/** Poids du score « Performance » IA : (score IA de base) + (évaluation finale) + (S&E réel) + (stagiaires). */
export const BLEND = { base: 0.5, final: 0.3, progress: 0.1, interns: 0.1 } as const;

const round = (value: number, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;
const clamp = (n: number, min = 0, max = 100) => Math.min(Math.max(n, min), max);
const mean = (values: Array<number | null | undefined>): number | null => {
  const list = values.filter((v): v is number => typeof v === "number");
  return list.length ? list.reduce((a, b) => a + b, 0) / list.length : null;
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IntegratedIntern {
  /** id du stage retenu pour cette personne (le plus pertinent) */
  id: number;
  personKey: string;
  studentId: number;
  name: string;
  level: "L3" | "M2";
  title: string;
  status: string;
  phase: string;
  projectIds: number[];
  projects: Array<{ id: number; name: string; code: string }>;
  supervisorId: number | null;
  supervisorName: string | null;
  stagesCount: number;
  /** ids de tous les stages de cette personne (le plus pertinent en premier) */
  stageIds: number[];
  startDate: string | null;
  endDate: string | null;
  score: number | null;
  verdict: string | null;
  rank: number;
  cohortSize: number;
  progress: { planned: number | null; actual: number | null; gap: number | null; trend: string };
  tasks: { total: number; completed: number; overdue: number; blocked: number };
  presenceRate: number | null;
  evaluations: number;
  alerts: InternshipAlertDto[];
  risk: { level: "HIGH" | "MEDIUM" | "LOW"; score: number; factors: string[] };
}

export interface IntegratedProject {
  projectId: number;
  code: string;
  name: string;
  status: string;
  phase: string;
  createdById: number | null;
  startDate: string | null;
  endDate: string | null;
  /** note finale /20 (réalisation, satisfaction, évaluations, stages, budget, couverture) */
  finalScore: number | null;
  verdict: string | null;
  rank: number;
  coverage: number;
  components: ProjectComponent[];
  progress: { planned: number | null; actual: number | null; gap: number | null; trend: string };
  satisfaction: { partners: { count: number; average: number | null }; beneficiaries: { count: number; average: number | null } };
  expects: { partners: number; beneficiaries: number };
  interns: {
    persons: number;
    evaluated: number;
    average: number | null;
    weak: number;
    atRisk: number;
    list: Array<{ id: number; name: string; level: string; score: number | null; status: string }>;
  };
  /** score IA 0-100 qui combine : base IA, évaluation finale, avancement S&E et stagiaires (sans score de base) */
  integratedScore: number | null;
}

export interface IntegrationSnapshot {
  generatedAt: string;
  projects: IntegratedProject[];
  internships: IntegratedIntern[];
  anomalies: AnomalyRow[];
  totals: {
    projects: number;
    projectsEvaluated: number;
    avgProjectScore: number | null;
    lateProjects: number;
    avgPlanned: number | null;
    avgActual: number | null;
    internPersons: number;
    internRows: number;
    internsEvaluated: number;
    avgInternScore: number | null;
    weakInterns: number;
    internsAtRisk: number;
    internsDone: number;
  };
}

// ---------------------------------------------------------------------------
// Score IA combiné
// ---------------------------------------------------------------------------

/** Combine le score IA de base (0-100) avec les mesures du pont ; une mesure absente est ignorée (poids réajustés). */
export function blendProjectScore(base: number | null, project?: IntegratedProject): number | null {
  if (!project || project.status === "DRAFT" || project.status === "CANCELLED") return base;

  const parts: Array<[number | null, number]> = [
    [base, BLEND.base],
    [project.finalScore === null ? null : (project.finalScore / 20) * 100, BLEND.final],
    [project.progress.actual === null ? null : clamp(project.progress.actual), BLEND.progress],
    [project.interns.average === null ? null : (project.interns.average / 20) * 100, BLEND.interns],
  ];

  const available = parts.filter((p): p is [number, number] => p[0] !== null);
  const weight = available.reduce((sum, [, w]) => sum + w, 0);
  if (!weight) return base;

  return round(available.reduce((sum, [value, w]) => sum + value * w, 0) / weight);
}

const levelOfScore = (score: number | null) => (score === null ? "UNKNOWN" : score >= 75 ? "GOOD" : score >= 50 ? "WATCH" : "CRITICAL");

// ---------------------------------------------------------------------------
// Construction du snapshot
// ---------------------------------------------------------------------------

function riskOf(
  score: number | null,
  overdue: number,
  presence: number | null,
  gap: number | null,
  missingEvaluation: boolean,
  operational: boolean,
): IntegratedIntern["risk"] {
  if (!operational) return { level: "LOW", score: 0, factors: [] };

  const factors: string[] = [];
  let points = 0;

  if (score !== null && score < THRESHOLDS.internLowHigh) { points += 40; factors.push(`Note ${score}/20 (très faible)`); }
  else if (score !== null && score < THRESHOLDS.internLowMedium) { points += 25; factors.push(`Note ${score}/20 (insuffisante)`); }
  else if (score !== null && score < 12) { points += 10; factors.push(`Note ${score}/20 (à surveiller)`); }

  if (overdue >= 3) { points += 30; factors.push(`${overdue} tâches en retard`); }
  else if (overdue >= 1) { points += 15; factors.push(`${overdue} tâche(s) en retard`); }

  if (presence !== null && presence < 50) { points += 25; factors.push(`Présence ${Math.round(presence)} %`); }
  else if (presence !== null && presence < 70) { points += 12; factors.push(`Présence ${Math.round(presence)} %`); }

  if (gap !== null && gap <= -20) { points += 15; factors.push(`Avancement en retard (${Math.round(gap)} pts)`); }
  if (missingEvaluation) { points += 5; factors.push("Aucune évaluation du tuteur"); }

  const total = clamp(points);
  return { level: total >= 60 ? "HIGH" : total >= 30 ? "MEDIUM" : "LOW", score: total, factors };
}

async function build(): Promise<IntegrationSnapshot> {
  const [contexts, feedback, stages, projectMeta] = await Promise.all([
    loadAllProjectContexts(),
    loadFeedbackByProject(),
    loadInternshipsMonitoring({}),
    prisma.project.findMany({ select: { id: true, createdById: true } }),
  ]);

  const { roleOf, cinOf } = await loadStudentMaps(stages);
  const ownerOf = new Map<number, number | null>(projectMeta.map((p) => [p.id, (p as { createdById?: number | null }).createdById ?? null]));
  const byInternship = new Map(stages.map((row) => [row.internship.id, row]));

  // --- stagiaires : UNE ligne par personne ---
  const { items, rows } = buildInternshipEvaluations(stages, roleOf, cinOf);
  const projectInfo = new Map(contexts.map((p) => [p.id, { id: p.id, name: p.name, code: p.code }]));

  const internships: IntegratedIntern[] = items.map((item) => {
    const row = byInternship.get(item.id)!;
    const { metrics, internship } = row;
    const operational = internship.status === "IN_PROGRESS" || internship.status === "COMPLETED";
    const missingEvaluation = metrics.alerts.some((a) => a.code === "EVALUATION_MANQUANTE");

    return {
      id: item.id,
      personKey: item.personKey,
      studentId: internship.studentId,
      name: `${internship.student.firstName} ${internship.student.lastName}`.trim(),
      level: item.level,
      title: item.title,
      status: item.status,
      phase: item.phase,
      projectIds: item.projectIds,
      projects: item.projectIds.map((id) => projectInfo.get(id)).filter((p): p is { id: number; name: string; code: string } => !!p),
      supervisorId: internship.supervisorId ?? null,
      supervisorName: internship.supervisor ? `${internship.supervisor.firstName} ${internship.supervisor.lastName}`.trim() : null,
      stagesCount: item.stagesCount,
      stageIds: item.stageIds,
      startDate: item.startDate ? new Date(item.startDate).toISOString() : null,
      endDate: item.endDate ? new Date(item.endDate).toISOString() : null,
      score: item.score,
      verdict: item.verdict,
      rank: item.rank,
      cohortSize: item.cohortSize,
      progress: {
        planned: metrics.plannedProgress === null ? null : round(metrics.plannedProgress),
        actual: metrics.actualProgress === null ? null : round(metrics.actualProgress),
        gap: metrics.gap === null ? null : round(metrics.gap),
        trend: metrics.trend,
      },
      tasks: { total: metrics.tasks.total, completed: metrics.tasks.completed, overdue: metrics.tasks.overdue, blocked: metrics.tasks.blocked },
      presenceRate: metrics.presence.rate === null ? null : round(metrics.presence.rate),
      evaluations: metrics.evaluations.count,
      alerts: metrics.alerts,
      risk: riskOf(item.score, metrics.tasks.overdue, metrics.presence.rate, metrics.gap, missingEvaluation, operational),
    };
  });

  // --- projets : note finale (avec les stagiaires rattachés, une personne = une fois) ---
  const stageScores = stageScoresFrom(stages, cinOf);
  const evaluations = rankProjects(contexts.map((p) => computeProjectEvaluation(p, feedback.get(p.id) ?? [], stageScores.get(p.id) ?? [])));
  const contextOf = new Map(contexts.map((p) => [p.id, p]));

  const projects: IntegratedProject[] = evaluations.map((ev) => {
    const ctx = contextOf.get(ev.projectId)!;
    const linked = internships.filter((i) => i.projectIds.includes(ev.projectId));
    const scored = linked.filter((i) => i.score !== null);
    const average = mean(scored.map((i) => i.score));

    const project: IntegratedProject = {
      projectId: ev.projectId,
      code: ev.code,
      name: ev.name,
      status: ev.status,
      phase: ev.phase,
      createdById: ownerOf.get(ev.projectId) ?? null,
      startDate: ctx.startDate ? new Date(ctx.startDate).toISOString() : null,
      endDate: ctx.endDate ? new Date(ctx.endDate).toISOString() : null,
      finalScore: ev.score,
      verdict: ev.verdict,
      rank: ev.rank,
      coverage: ev.coverage,
      components: ev.components,
      progress: ev.progress,
      satisfaction: {
        partners: { count: ev.satisfaction.partners.count, average: ev.satisfaction.partners.average },
        beneficiaries: { count: ev.satisfaction.beneficiaries.count, average: ev.satisfaction.beneficiaries.average },
      },
      expects: { partners: ctx.partnerLinks.length, beneficiaries: ctx.beneficiaries.length },
      interns: {
        persons: linked.length,
        evaluated: scored.length,
        average: average === null ? null : round(average, 2),
        weak: scored.filter((i) => (i.score as number) < THRESHOLDS.internAverageWeak).length,
        atRisk: linked.filter((i) => i.risk.level === "HIGH").length,
        list: linked.map((i) => ({ id: i.id, name: i.name, level: i.level, score: i.score, status: i.status })),
      },
      integratedScore: null,
    };

    return project;
  });

  const snapshot: IntegrationSnapshot = {
    generatedAt: new Date().toISOString(),
    projects,
    internships,
    anomalies: [],
    totals: {
      projects: projects.length,
      projectsEvaluated: projects.filter((p) => p.finalScore !== null).length,
      avgProjectScore: (() => { const v = mean(projects.map((p) => p.finalScore)); return v === null ? null : round(v, 2); })(),
      lateProjects: projects.filter((p) => p.status === "ACTIVE" && p.progress.gap !== null && p.progress.gap <= THRESHOLDS.seGapMedium).length,
      avgPlanned: (() => { const v = mean(projects.filter((p) => p.status !== "DRAFT" && p.status !== "CANCELLED").map((p) => p.progress.planned)); return v === null ? null : round(v); })(),
      avgActual: (() => { const v = mean(projects.filter((p) => p.status !== "DRAFT" && p.status !== "CANCELLED").map((p) => p.progress.actual)); return v === null ? null : round(v); })(),
      internPersons: internships.length,
      internRows: rows,
      internsEvaluated: internships.filter((i) => i.score !== null).length,
      avgInternScore: (() => { const v = mean(internships.map((i) => i.score)); return v === null ? null : round(v, 2); })(),
      weakInterns: internships.filter((i) => i.score !== null && i.score < THRESHOLDS.internLowMedium).length,
      internsAtRisk: internships.filter((i) => i.risk.level === "HIGH").length,
      internsDone: internships.filter((i) => i.phase === "FINAL").length,
    },
  };

  // score IA combiné (sans score de base : mesure du pont seule)
  for (const project of snapshot.projects) project.integratedScore = blendProjectScore(null, project);
  snapshot.anomalies = buildAnomalies(snapshot);

  return snapshot;
}

// ---------------------------------------------------------------------------
// Anomalies issues du pont (mêmes colonnes que les anomalies existantes)
// ---------------------------------------------------------------------------

function buildAnomalies(snapshot: IntegrationSnapshot): AnomalyRow[] {
  const rows: AnomalyRow[] = [];
  const add = (row: Omit<AnomalyRow, "key" | "ownerIds"> & { owners: Array<number | null | undefined>; id: number }) => {
    const { owners, id, ...rest } = row;
    rows.push({ ...rest, key: `${row.type}:${id}`, ownerIds: [...new Set(owners.filter((o): o is number => typeof o === "number"))] });
  };

  for (const p of snapshot.projects) {
    if (p.status === "DRAFT" || p.status === "CANCELLED") continue;

    const gap = p.progress.gap;
    if (p.status === "ACTIVE" && gap !== null && gap <= THRESHOLDS.seGapMedium) {
      add({
        type: "PROJECT_SE_DELAY",
        severity: gap <= THRESHOLDS.seGapHigh ? "HIGH" : "MEDIUM",
        title: `Avancement en retard (S&E) : ${p.name}`,
        detail: `Avancement réel ${p.progress.actual ?? "—"} % contre ${p.progress.planned ?? "—"} % prévu (écart ${Math.round(gap)} pts).`,
        link: `/suivi-evaluation/${p.projectId}`,
        entityKind: "project",
        entityId: p.projectId,
        projectId: p.projectId,
        id: p.projectId,
        owners: [p.createdById],
      });
    }

    if (p.finalScore !== null && p.coverage >= 40) {
      const final = p.phase === "FINAL";
      const critical = final && p.finalScore < THRESHOLDS.finalCriticalFinal;
      const low = final ? p.finalScore < THRESHOLDS.finalLowFinal : p.finalScore < THRESHOLDS.finalLowInterim;

      if (low) {
        add({
          type: "PROJECT_FINAL_LOW",
          severity: critical ? "HIGH" : "MEDIUM",
          title: `${final ? "Évaluation finale" : "Évaluation en cours"} faible : ${p.name}`,
          detail: `Note ${p.finalScore}/20 (${p.verdict ?? "—"}), fiabilité ${p.coverage} %.`,
          link: `/evaluation-finale/projets/${p.projectId}`,
          entityKind: "project",
          entityId: p.projectId,
          projectId: p.projectId,
          id: p.projectId,
          owners: [p.createdById],
        });
      }
    }

    if (p.phase === "FINAL" && ((p.expects.partners > 0 && p.satisfaction.partners.count === 0) || (p.expects.beneficiaries > 0 && p.satisfaction.beneficiaries.count === 0))) {
      add({
        type: "PROJECT_FEEDBACK_MISSING",
        severity: "LOW",
        title: `Avis de satisfaction manquants : ${p.name}`,
        detail: "Projet terminé sans questionnaire de satisfaction des partenaires et/ou des bénéficiaires : la note finale est moins fiable.",
        link: `/evaluation-finale/projets/${p.projectId}#avis`,
        entityKind: "project",
        entityId: p.projectId,
        projectId: p.projectId,
        id: p.projectId,
        owners: [p.createdById],
      });
    }

    if (p.interns.average !== null && p.interns.evaluated >= 1 && p.interns.average < THRESHOLDS.internAverageWeak) {
      add({
        type: "PROJECT_INTERNS_WEAK",
        severity: "MEDIUM",
        title: `Stagiaires en difficulté sur le projet : ${p.name}`,
        detail: `Moyenne des ${p.interns.evaluated} stagiaire(s) rattaché(s) : ${p.interns.average}/20 — cela réduit la note finale du projet.`,
        link: `/evaluation-finale/projets/${p.projectId}`,
        entityKind: "project",
        entityId: p.projectId,
        projectId: p.projectId,
        id: p.projectId,
        owners: [p.createdById],
      });
    }
  }

  for (const i of snapshot.internships) {
    const operational = i.status === "IN_PROGRESS" || i.status === "COMPLETED";
    if (!operational) continue;

    const projectId = i.projectIds[0] ?? null;
    const owners = [i.studentId, i.supervisorId, ...i.projectIds.map((id) => snapshot.projects.find((p) => p.projectId === id)?.createdById)];
    const link = `/suivi-evaluation/stagiaires/${i.id}`;
    const base = { entityKind: "internship", entityId: i.id, projectId, id: i.id, owners, link };

    // un stage qui n'a encore aucune donnée n'est pas noté : on ne le signale pas comme « mauvais »
    if (i.score !== null && (i.tasks.total > 0 || i.evaluations > 0) && i.score < THRESHOLDS.internLowMedium) {
      add({
        ...base,
        type: "INTERN_LOW_SCORE",
        severity: i.score < THRESHOLDS.internLowHigh ? "HIGH" : "MEDIUM",
        title: `Note de stage faible : ${i.name}`,
        detail: `${i.title} — ${i.score}/20 (${i.verdict ?? "—"})${i.risk.factors.length ? ` : ${i.risk.factors.join(" ; ")}` : ""}.`,
      });
    }

    if (i.status === "IN_PROGRESS" && i.tasks.overdue > 0) {
      add({
        ...base,
        type: "INTERN_TASKS_LATE",
        severity: i.tasks.overdue >= 3 ? "HIGH" : "MEDIUM",
        title: `Tâches de stage en retard : ${i.name}`,
        detail: `${i.tasks.overdue} tâche(s) en retard sur ${i.tasks.total} (${i.title}).`,
      });
    }

    const presence = i.alerts.find((a) => a.code === "PRESENCE_CRITIQUE" || a.code === "PRESENCE_FAIBLE");
    if (i.status === "IN_PROGRESS" && presence) {
      add({
        ...base,
        type: "INTERN_PRESENCE_LOW",
        severity: presence.code === "PRESENCE_CRITIQUE" ? "HIGH" : "MEDIUM",
        title: `Présence terrain insuffisante : ${i.name}`,
        detail: presence.message,
      });
    }

    if (i.alerts.some((a) => a.code === "EVALUATION_MANQUANTE")) {
      add({
        ...base,
        type: "INTERN_EVAL_MISSING",
        severity: i.status === "COMPLETED" ? "MEDIUM" : "LOW",
        title: `Évaluation du tuteur manquante : ${i.name}`,
        detail: `Aucune évaluation enregistrée pour « ${i.title} » : la note /20 repose sur moins de données.`,
      });
    }
  }

  const order = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
  return rows.sort((a, b) => order[a.severity] - order[b.severity]);
}

// ---------------------------------------------------------------------------
// Cache + accès
// ---------------------------------------------------------------------------

let cache: { at: number; promise: Promise<IntegrationSnapshot> } | null = null;

/** À appeler après toute écriture : l'analyse suivante repart des données fraîches. */
export function invalidateIntegration(): void {
  cache = null;
}

export function getIntegration(force = false): Promise<IntegrationSnapshot> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.promise;

  const promise = build();
  cache = { at: Date.now(), promise };
  // une erreur ne reste pas en cache
  promise.catch(() => {
    if (cache?.promise === promise) cache = null;
  });
  return promise;
}

/** Version « sans risque » pour les pages IA : si le pont échoue, l'IA répond comme avant. */
export async function getIntegrationSafe(): Promise<IntegrationSnapshot | null> {
  try {
    return await getIntegration();
  } catch (error) {
    logger.error("Pont stagiaires ↔ projets ↔ IA indisponible (l'analyse continue sans lui)", error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Simulation : « et si ce stagiaire n'était plus là (supprimé) ? »
// ---------------------------------------------------------------------------

export interface RemovalImpact {
  personKey: string;
  name: string;
  /** projets dont la note change si la personne disparaît (ou n'a pas fini son stage) */
  projects: Array<{
    projectId: number;
    name: string;
    internsBefore: number;
    internsAfter: number;
    internAvgBefore: number | null;
    internAvgAfter: number | null;
    finalBefore: number | null;
    finalAfter: number | null;
    deltaFinal: number | null;
    integratedBefore: number | null;
    integratedAfter: number | null;
    deltaIntegrated: number | null;
  }>;
}

/**
 * Recalcule réellement la note finale /20 des projets rattachés à la personne SANS ses stages, puis le score IA combiné.
 * (Même formule que l'« Évaluation finale » : rien n'est inventé.) Ne modifie aucune donnée.
 */
export async function simulateRemoval(personKey: string): Promise<RemovalImpact | null> {
  const [contexts, feedback, stages] = await Promise.all([loadAllProjectContexts(), loadFeedbackByProject(), loadInternshipsMonitoring({})]);
  const { cinOf } = await loadStudentMaps(stages);

  const keyOf = (row: (typeof stages)[number]) => personKeyOf(row.internship.studentId, cinOf.get(row.internship.studentId));
  const mine = stages.filter((row) => keyOf(row) === personKey);
  if (!mine.length) return null;

  const projectIds = new Set<number>();
  for (const row of mine) for (const id of projectIdsOfInternship(row.internship as never)) projectIds.add(id);

  const before = stageScoresFrom(stages, cinOf);
  const after = stageScoresFrom(stages.filter((row) => keyOf(row) !== personKey), cinOf);
  const snapshot = await getIntegration();

  const projects = contexts
    .filter((ctx) => projectIds.has(ctx.id))
    .map((ctx) => {
      const rows = feedback.get(ctx.id) ?? [];
      const b = computeProjectEvaluation(ctx, rows, before.get(ctx.id) ?? []);
      const a = computeProjectEvaluation(ctx, rows, after.get(ctx.id) ?? []);
      const known = snapshot.projects.find((p) => p.projectId === ctx.id);

      const blend = (finalScore: number | null, avg: number | null) =>
        known ? blendProjectScore(null, { ...known, finalScore, interns: { ...known.interns, average: avg } }) : null;

      const avgOf = (list: number[]) => (list.length ? round(list.reduce((x, y) => x + y, 0) / list.length, 2) : null);
      const bl = before.get(ctx.id) ?? [];
      const al = after.get(ctx.id) ?? [];
      const ib = blend(b.score, avgOf(bl));
      const ia = blend(a.score, avgOf(al));

      return {
        projectId: ctx.id,
        name: ctx.name,
        internsBefore: bl.length,
        internsAfter: al.length,
        internAvgBefore: avgOf(bl),
        internAvgAfter: avgOf(al),
        finalBefore: b.score,
        finalAfter: a.score,
        deltaFinal: b.score !== null && a.score !== null ? round(a.score - b.score, 2) : null,
        integratedBefore: ib,
        integratedAfter: ia,
        deltaIntegrated: ib !== null && ia !== null ? round(ia - ib) : null,
      };
    });

  const person = snapshot.internships.find((i) => i.personKey === personKey);
  const row = mine[0].internship;
  return { personKey, name: person?.name ?? `${row.student.firstName} ${row.student.lastName}`.trim(), projects };
}

// ---------------------------------------------------------------------------
// Application au résultat des analyses IA
// ---------------------------------------------------------------------------

interface PerfLike {
  projectId: number;
  score: number | null;
  level: string;
  factors: object;
}

/** Performance IA : le score de base est combiné avec l'évaluation finale, le S&E et les stagiaires. */
export function overlayPerformance<T extends PerfLike>(rows: T[], snapshot: IntegrationSnapshot | null): T[] {
  if (!snapshot) return rows;
  const byId = new Map(snapshot.projects.map((p) => [p.projectId, p]));

  return rows.map((row) => {
    const project = byId.get(row.projectId);
    if (!project) return row;

    const score = blendProjectScore(row.score, project);

    return {
      ...row,
      score,
      level: levelOfScore(score),
      baseScore: row.score,
      factors: {
        ...row.factors,
        finalScore20: project.finalScore,
        finalVerdict: project.verdict,
        seActual: project.progress.actual,
        sePlanned: project.progress.planned,
        seGap: project.progress.gap,
        internshipPersons: project.interns.persons,
        internshipAverage20: project.interns.average,
        partnerSatisfaction5: project.satisfaction.partners.average,
        beneficiarySatisfaction5: project.satisfaction.beneficiaries.average,
      },
    } as T;
  });
}

/** Ajoute les anomalies du pont (sans doublon de clé) et conserve l'ordre de gravité. */
export function mergeIntegrationAnomalies<T extends { key: string; severity: "HIGH" | "MEDIUM" | "LOW" }>(base: T[], snapshot: IntegrationSnapshot | null): T[] {
  if (!snapshot) return base;
  const seen = new Set(base.map((row) => row.key));
  const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };

  return [...base, ...(snapshot.anomalies.filter((row) => !seen.has(row.key)) as unknown as T[])].sort((a, b) => order[a.severity] - order[b.severity]);
}

interface SummaryLike {
  headline: string;
  highlights: string[];
  recommendations: string[];
  counters: object;
}

/** Synthèse IA : ajoute stagiaires, évaluation finale et avancement S&E (chiffres, points d'attention, actions). */
export function overlaySummary<T extends SummaryLike>(summary: T, snapshot: IntegrationSnapshot | null, addedAnomalies: AnomalyRow[] = snapshot?.anomalies ?? []): T {
  if (!snapshot) return summary;

  const t = snapshot.totals;
  const highlights = [...summary.highlights];
  const recommendations = summary.recommendations.filter((line) => !line.startsWith("Aucune action urgente"));

  if (t.avgProjectScore !== null) highlights.push(`Évaluation finale des projets : moyenne ${t.avgProjectScore}/20 (${t.projectsEvaluated}/${t.projects} projets notés).`);
  if (t.avgActual !== null && t.avgPlanned !== null) highlights.push(`Suivi & Évaluation : avancement réel ${t.avgActual} % pour ${t.avgPlanned} % prévu.`);
  if (t.internPersons > 0) {
    highlights.push(
      `Stagiaires : ${t.internPersons} personne(s)${t.internRows > t.internPersons ? ` (${t.internRows} stages)` : ""}, ${t.internsEvaluated} notée(s)${t.avgInternScore !== null ? `, moyenne ${t.avgInternScore}/20` : ""}.`,
    );
  }

  if (t.weakInterns > 0) recommendations.push(`Renforcer l'encadrement des ${t.weakInterns} stagiaire(s) sous 10/20 : leur note abaisse celle des projets rattachés.`);
  if (t.internsAtRisk > 0) recommendations.push(`${t.internsAtRisk} stagiaire(s) à risque élevé (retards, présence, note) : point individuel avec le tuteur.`);
  if (t.lateProjects > 0) recommendations.push(`${t.lateProjects} projet(s) actif(s) accusent un retard d'avancement au Suivi & Évaluation : replanifier ou renforcer les ressources.`);

  const lowFinal = snapshot.projects.filter((p) => p.finalScore !== null && p.phase === "FINAL" && p.finalScore < THRESHOLDS.finalLowFinal);
  if (lowFinal.length) recommendations.push(`Analyser les ${lowFinal.length} projet(s) terminé(s) sous ${THRESHOLDS.finalLowFinal}/20 à l'évaluation finale.`);
  if (!recommendations.length) recommendations.push("Aucune action urgente : poursuivre le suivi régulier.");

  const high = addedAnomalies.filter((a) => a.severity === "HIGH").length;
  const counters = summary.counters as Record<string, number>;
  const critical = (counters.criticalAnomalies ?? 0) + high;

  return {
    ...summary,
    headline: critical > 0 ? `${critical} point(s) critique(s) nécessitent votre attention.` : summary.headline,
    highlights,
    recommendations,
    counters: {
      ...counters,
      anomalies: (counters.anomalies ?? 0) + addedAnomalies.length,
      criticalAnomalies: critical,
      internships: t.internPersons,
      internshipsEvaluated: t.internsEvaluated,
      avgFinalProject: t.avgProjectScore,
      avgFinalInternship: t.avgInternScore,
      lateProjects: t.lateProjects,
      internsAtRisk: t.internsAtRisk,
    },
  } as T;
}

export { personKeyOf, projectIdsOfInternship };
