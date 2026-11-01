import { prisma } from "../config/database";
import { loadInternshipsMonitoring } from "./internshipMonitoring.service";
import { computeMonitoring, loadAllProjectContexts, loadProjectContext } from "./monitoring.service";
import { badgeFor, levelOf, round, scoreOn20, stageComponents } from "./merit.service";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

/**
 * Évaluation finale — projets ET stages, 100 % automatique, notée sur 20.
 *
 * PROJET : on ne ressaisit rien, on assemble ce que la plateforme mesure déjà
 *   - réalisation (30 %)             : activités + jalons + résultats/indicateurs (Suivi & Évaluation) ;
 *   - satisfaction bénéficiaires (20 %) : questionnaires de satisfaction (note /5) ;
 *   - satisfaction partenaires (15 %)   : « la méthode de travail de l'ONG convient-elle ? » (note /5) ;
 *   - évaluations menées (10 %)      : notes (0-100) des évaluations du projet ;
 *   - résultats des stages (10 %)    : moyenne /20 des stagiaires rattachés au projet ;
 *   - maîtrise du budget (10 %)      : exécution budgétaire cohérente avec l'avancement ;
 *   - couverture bénéficiaires (5 %) : bénéficiaires inscrits / cible.
 * Une composante sans donnée est ignorée (poids réajustés) mais SIGNALÉE : la note affiche son taux de
 * couverture pour qu'on sache sur quelles données elle repose.
 *
 * STAGE : même note que l'ordre de mérite (avancement, achèvement, évaluation du tuteur, rapports, présence).
 */

export const PROJECT_WEIGHTS = {
  realisation: 30,
  beneficiaries: 20,
  partners: 15,
  evaluations: 10,
  interns: 10,
  budget: 10,
  reach: 5,
} as const;

export type ProjectKey = keyof typeof PROJECT_WEIGHTS;

export const PROJECT_LABELS: Record<ProjectKey, string> = {
  realisation: "Réalisation (activités, jalons, résultats)",
  beneficiaries: "Satisfaction des bénéficiaires",
  partners: "Satisfaction des partenaires",
  evaluations: "Évaluations menées",
  interns: "Résultats des stages rattachés",
  budget: "Maîtrise du budget",
  reach: "Couverture des bénéficiaires",
};

export type FeedbackKind = "PARTNER" | "BENEFICIARY";

export interface Criterion {
  key: string;
  label: string;
}

/** Questionnaire des partenaires : la méthode de travail de l'ONG leur convient-elle ? */
export const PARTNER_CRITERIA: Criterion[] = [
  { key: "method", label: "Méthode de travail de l'ONG" },
  { key: "communication", label: "Communication et concertation" },
  { key: "deadlines", label: "Respect des engagements et des délais" },
  { key: "transparency", label: "Transparence et gestion (redevabilité)" },
  { key: "results", label: "Qualité des résultats obtenus" },
  { key: "continuity", label: "Souhait de poursuivre le partenariat" },
];

/** Questionnaire des bénéficiaires : sont-ils satisfaits du projet ? */
export const BENEFICIARY_CRITERIA: Criterion[] = [
  { key: "relevance", label: "Le projet répond à mes besoins" },
  { key: "quality", label: "Qualité des services et des activités" },
  { key: "respect", label: "Accueil, écoute et respect de l'équipe" },
  { key: "access", label: "Facilité d'accès (lieu, horaires)" },
  { key: "impact", label: "Amélioration concrète de ma situation" },
  { key: "recommend", label: "Je recommanderais ce projet" },
];

export const criteriaOf = (kind: FeedbackKind): Criterion[] => (kind === "PARTNER" ? PARTNER_CRITERIA : BENEFICIARY_CRITERIA);

const clamp = (n: number, min = 0, max = 100) => Math.min(Math.max(n, min), max);

const mean = (values: Array<number | null | undefined>): number | null => {
  const list = values.filter((v): v is number => typeof v === "number");
  return list.length ? list.reduce((a, b) => a + b, 0) / list.length : null;
};

/** Verdict d'un projet (même grille /20 que les stagiaires). */
export const verdictFor = (score: number): string => badgeFor(score);

// ------------------------------------------------------------
// Satisfaction
// ------------------------------------------------------------

export interface FeedbackRow {
  id: number;
  projectId: number;
  kind: string;
  partnerId: number | null;
  beneficiaryId: number | null;
  respondent: string | null;
  ratings: Record<string, number> | null;
  score: number;
  comment: string | null;
  collectedAt: Date;
}

export interface SatisfactionSummary {
  /** nombre de questionnaires pris en compte (dernier avis de chaque partenaire / bénéficiaire) */
  count: number;
  /** moyenne sur 5 */
  average: number | null;
  /** note sur 100 (moyenne / 5) */
  percent: number | null;
  /** part des répondants satisfaits (moyenne ≥ 4/5) */
  satisfiedPct: number | null;
  byCriterion: Array<{ key: string; label: string; average: number | null }>;
}

/** Un partenaire / bénéficiaire identifié compte une fois (son avis le plus récent) ; les avis anonymes comptent tous. */
function latestPerRespondent(rows: FeedbackRow[]): FeedbackRow[] {
  const keep = new Map<string, FeedbackRow>();
  const anonymous: FeedbackRow[] = [];

  for (const row of rows) {
    const id = row.kind === "PARTNER" ? row.partnerId : row.beneficiaryId;
    if (id === null || id === undefined) {
      anonymous.push(row);
      continue;
    }
    const known = keep.get(String(id));
    if (!known || row.collectedAt > known.collectedAt) keep.set(String(id), row);
  }

  return [...keep.values(), ...anonymous];
}

export function summarizeSatisfaction(rows: FeedbackRow[], kind: FeedbackKind): SatisfactionSummary {
  const used = latestPerRespondent(rows.filter((row) => row.kind === kind));
  const average = mean(used.map((row) => row.score));

  return {
    count: used.length,
    average: average === null ? null : round(average),
    percent: average === null ? null : round((average / 5) * 100, 1),
    satisfiedPct: used.length ? round((used.filter((row) => row.score >= 4).length / used.length) * 100, 1) : null,
    byCriterion: criteriaOf(kind).map((criterion) => {
      const value = mean(used.map((row) => row.ratings?.[criterion.key] ?? null));
      return { key: criterion.key, label: criterion.label, average: value === null ? null : round(value) };
    }),
  };
}

/** Valide un questionnaire reçu ; renvoie les notes nettoyées + la moyenne /5, ou un message d'erreur. */
export function validateRatings(kind: FeedbackKind, input: unknown): { ratings: Record<string, number>; score: number } | { error: string } {
  if (!input || typeof input !== "object") return { error: "Les notes du questionnaire sont obligatoires." };

  const source = input as Record<string, unknown>;
  const ratings: Record<string, number> = {};

  for (const criterion of criteriaOf(kind)) {
    const value = Number(source[criterion.key]);
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      return { error: `Note invalide pour « ${criterion.label} » (entier de 1 à 5).` };
    }
    ratings[criterion.key] = value;
  }

  const score = Object.values(ratings).reduce((a, b) => a + b, 0) / Object.keys(ratings).length;
  return { ratings, score: round(score) };
}

// ------------------------------------------------------------
// Évaluation d'un projet
// ------------------------------------------------------------

export interface ProjectComponent {
  key: ProjectKey;
  label: string;
  weight: number;
  /** 0-100, null = pas de donnée */
  percent: number | null;
  /** équivalent /20 */
  on20: number | null;
  detail: string;
}

type ProjectContext = NonNullable<Awaited<ReturnType<typeof loadProjectContext>>>;

export function computeProjectEvaluation(
  project: ProjectContext,
  feedback: FeedbackRow[],
  stageScores: number[],
  now = new Date(),
) {
  const m = computeMonitoring(project, now);
  const partners = summarizeSatisfaction(feedback, "PARTNER");
  const beneficiaries = summarizeSatisfaction(feedback, "BENEFICIARY");
  const internPct = mean(stageScores.map((score) => (score / 20) * 100));

  const percents: Record<ProjectKey, number | null> = {
    realisation: m.actualProgress === null ? null : clamp(m.actualProgress),
    beneficiaries: beneficiaries.percent,
    partners: partners.percent,
    evaluations: m.components.evaluations === null ? null : clamp(m.components.evaluations),
    interns: internPct === null ? null : clamp(internPct),
    budget: m.components.budget === null ? null : clamp(m.components.budget),
    reach: m.components.beneficiaries === null ? null : clamp(m.components.beneficiaries),
  };

  const details: Record<ProjectKey, string> = {
    realisation: `${m.counts.activitiesDone}/${m.counts.activities} activités, ${m.counts.milestonesDone}/${m.counts.milestones} jalons, ${m.counts.indicators} indicateur(s)`,
    beneficiaries: beneficiaries.count ? `${beneficiaries.count} avis · ${beneficiaries.satisfiedPct ?? 0} % satisfaits` : "Aucun avis recueilli",
    partners: partners.count ? `${partners.count} partenaire(s) interrogé(s) · ${partners.satisfiedPct ?? 0} % satisfaits` : "Aucun avis recueilli",
    evaluations: m.components.evaluations !== null ? `${m.counts.evaluations} évaluation(s), moyenne ${Math.round(m.components.evaluations)} %` : "Aucune évaluation notée",
    interns: stageScores.length ? `${stageScores.length} stage(s) · moyenne ${round(mean(stageScores) ?? 0, 1)}/20` : "Aucun stage rattaché",
    budget: m.budget.executionPct !== null ? `Exécution budgétaire ${Math.round(m.budget.executionPct)} %` : "Budget non renseigné",
    reach: m.beneficiaries.target ? `${m.beneficiaries.total}/${m.beneficiaries.target} bénéficiaires` : `${m.beneficiaries.total} bénéficiaire(s), cible non définie`,
  };

  const keys = Object.keys(PROJECT_WEIGHTS) as ProjectKey[];
  const components: ProjectComponent[] = keys.map((key) => ({
    key,
    label: PROJECT_LABELS[key],
    weight: PROJECT_WEIGHTS[key],
    percent: percents[key] === null ? null : round(percents[key] as number, 1),
    on20: percents[key] === null ? null : round(((percents[key] as number) / 100) * 20),
    detail: details[key],
  }));

  let sum = 0;
  let weight = 0;
  for (const key of keys) {
    const value = percents[key];
    if (value === null) continue;
    sum += value * PROJECT_WEIGHTS[key];
    weight += PROJECT_WEIGHTS[key];
  }

  const totalWeight = keys.reduce((a, key) => a + PROJECT_WEIGHTS[key], 0);
  const score = weight > 0 ? round((sum / weight / 100) * 20) : null;
  const missing = components.filter((c) => c.percent === null).map((c) => c.label);

  const phase =
    project.status === "COMPLETED" ? "FINAL" : project.status === "CANCELLED" ? "CANCELLED" : project.status === "DRAFT" ? "NOT_STARTED" : "INTERIM";

  // --- lecture automatique : points forts, points faibles, recommandations ---
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  for (const component of components) {
    if (component.percent === null) continue;
    if (component.percent >= 75) strengths.push(`${component.label} : ${component.on20}/20`);
    else if (component.percent < 60) weaknesses.push(`${component.label} : ${component.on20}/20`);
  }

  const advice: Partial<Record<ProjectKey, string>> = {
    realisation: "Rattraper le retard : prioriser les activités et jalons non terminés et mettre à jour l'avancement.",
    partners: "Rencontrer les partenaires pour revoir la méthode de travail, la communication et le respect des délais.",
    beneficiaries: "Retourner vers les bénéficiaires pour comprendre leurs insatisfactions et ajuster les activités.",
    budget: "Aligner l'exécution budgétaire sur l'avancement physique du projet.",
    reach: "Renforcer la mobilisation pour atteindre le nombre de bénéficiaires visé.",
    evaluations: "Mener et valider des évaluations du projet avec des notes renseignées.",
    interns: "Renforcer l'encadrement des stagiaires rattachés au projet.",
  };

  for (const component of components) {
    if (component.percent !== null && component.percent < 60 && advice[component.key]) recommendations.push(advice[component.key] as string);
  }

  for (const [label, summary] of [["partenaires", partners], ["bénéficiaires", beneficiaries]] as const) {
    const worst = summary.byCriterion.filter((c) => c.average !== null).sort((a, b) => (a.average as number) - (b.average as number))[0];
    if (worst && (worst.average as number) < 3.5) recommendations.push(`Point faible cité par les ${label} : « ${worst.label} » (${worst.average}/5).`);
  }

  if (project.partnerLinks.length > 0 && partners.count === 0)
    recommendations.push("Recueillir l'avis des partenaires : aucune enquête de satisfaction enregistrée.");
  if (project.beneficiaries.length > 0 && beneficiaries.count === 0)
    recommendations.push("Recueillir l'avis des bénéficiaires : aucune enquête de satisfaction enregistrée.");

  return {
    projectId: project.id,
    code: project.code,
    name: project.name,
    status: project.status,
    phase,
    startDate: project.startDate,
    endDate: project.endDate,
    score,
    verdict: score === null ? null : verdictFor(score),
    rank: 0,
    /** part des poids pour lesquels on dispose de données (fiabilité de la note) */
    coverage: Math.round((weight / totalWeight) * 100),
    missing,
    components,
    satisfaction: { partners, beneficiaries },
    progress: { planned: m.plannedProgress, actual: m.actualProgress, gap: m.gap, trend: m.trend },
    strengths,
    weaknesses,
    recommendations,
  };
}

export type ProjectEvaluation = ReturnType<typeof computeProjectEvaluation>;

const toFeedbackRow = (row: Record<string, unknown>): FeedbackRow => row as unknown as FeedbackRow;

/** Notes /20 des stages (en cours ou terminés) rattachés à chaque projet. */
async function stageScoresByProject(): Promise<Map<number, number[]>> {
  const stages = await loadInternshipsMonitoring({}, { projectId: { not: null }, status: { in: ["IN_PROGRESS", "COMPLETED"] } });
  const map = new Map<number, number[]>();

  for (const { internship, metrics } of stages) {
    if (internship.projectId === null) continue;
    const score = scoreOn20(stageComponents(metrics));
    if (score === null) continue;
    map.set(internship.projectId, [...(map.get(internship.projectId) ?? []), score]);
  }

  return map;
}

function rankProjects(list: ProjectEvaluation[]): ProjectEvaluation[] {
  const sorted = [...list].sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.name.localeCompare(b.name, "fr"));
  let previous: ProjectEvaluation | null = null;

  sorted.forEach((item, index) => {
    if (item.score === null) {
      item.rank = 0;
      return;
    }
    item.rank = previous && previous.score === item.score ? previous.rank : index + 1;
    previous = item;
  });

  return sorted;
}

export async function evaluateAllProjects(): Promise<ProjectEvaluation[]> {
  const [projects, feedback, stages] = await Promise.all([
    loadAllProjectContexts(),
    db.projectFeedback.findMany({
      select: { id: true, projectId: true, kind: true, partnerId: true, beneficiaryId: true, respondent: true, ratings: true, score: true, comment: true, collectedAt: true },
    }),
    stageScoresByProject(),
  ]);

  const byProject = new Map<number, FeedbackRow[]>();
  for (const row of feedback as Array<Record<string, unknown>>) {
    const fb = toFeedbackRow(row);
    byProject.set(fb.projectId, [...(byProject.get(fb.projectId) ?? []), fb]);
  }

  return rankProjects(projects.map((project) => computeProjectEvaluation(project, byProject.get(project.id) ?? [], stages.get(project.id) ?? [])));
}

export async function evaluateOneProject(projectId: number) {
  const [project, feedback, all] = await Promise.all([
    loadProjectContext(projectId),
    db.projectFeedback.findMany({ where: { projectId }, orderBy: { collectedAt: "desc" } }),
    evaluateAllProjects(),
  ]);

  if (!project) return null;

  const evaluation = all.find((item) => item.projectId === projectId);
  if (!evaluation) return null;

  const partnerNames = new Map<number, string>(project.partnerLinks.map((link) => [link.partnerId, link.partner.name]));
  const beneficiaryNames = new Map<number, string>(project.beneficiaries.map((b) => [b.id, `${b.firstName} ${b.lastName}`.trim()]));

  return {
    ...evaluation,
    projectsCount: all.filter((item) => item.score !== null).length,
    partners: project.partnerLinks.map((link) => ({ id: link.partnerId, name: link.partner.name, role: link.role })),
    beneficiaries: project.beneficiaries.map((b) => ({ id: b.id, name: `${b.firstName} ${b.lastName}`.trim() })),
    feedback: (feedback as Array<Record<string, unknown>>).map(toFeedbackRow).map((row) => ({
      id: row.id,
      kind: row.kind,
      partnerId: row.partnerId,
      beneficiaryId: row.beneficiaryId,
      who:
        row.respondent ||
        (row.partnerId !== null ? partnerNames.get(row.partnerId) : row.beneficiaryId !== null ? beneficiaryNames.get(row.beneficiaryId) : null) ||
        "Anonyme",
      partnerName: row.partnerId !== null ? partnerNames.get(row.partnerId) ?? null : null,
      ratings: row.ratings,
      score: row.score,
      comment: row.comment,
      collectedAt: row.collectedAt,
    })),
    criteria: { PARTNER: PARTNER_CRITERIA, BENEFICIARY: BENEFICIARY_CRITERIA },
  };
}

// ------------------------------------------------------------
// Évaluation d'un stage
// ------------------------------------------------------------

export async function evaluateInternships(scope: Record<string, unknown>) {
  const stages = await loadInternshipsMonitoring(scope);
  const studentIds = [...new Set(stages.map((row) => row.internship.studentId))];
  const users: Array<{ id: number; role: string }> = studentIds.length
    ? await db.user.findMany({ where: { id: { in: studentIds } }, select: { id: true, role: true } })
    : [];
  const roleOf = new Map(users.map((u) => [u.id, u.role]));

  const items = stages.map(({ internship, metrics }) => {
    const operational = internship.status === "IN_PROGRESS" || internship.status === "COMPLETED";
    const components = stageComponents(metrics);
    const score = operational ? scoreOn20(components) : null;

    return {
      id: internship.id,
      title: internship.title,
      theme: internship.theme ?? null,
      status: internship.status,
      phase: internship.status === "COMPLETED" ? "FINAL" : operational ? "INTERIM" : "NOT_STARTED",
      startDate: internship.startDate,
      endDate: internship.endDate,
      student: internship.student,
      level: levelOf(roleOf.get(internship.studentId) ?? ""),
      supervisor: internship.supervisor,
      project: internship.project,
      score,
      verdict: score === null ? null : badgeFor(score),
      rank: 0,
      cohortSize: 0,
      components,
      tasks: { total: metrics.tasks.total, completed: metrics.tasks.completed },
      evaluations: metrics.evaluations.count,
      /** durée de référence (mois) : sert au filtre « Autre » (≠ 2 mois L3 / 6 mois M2) */
      durationMonths: metrics.presence.referenceMonths ?? null,
    };
  });

  // rang dans la promotion (L3 / M2), égalité = même rang
  for (const level of ["L3", "M2"] as const) {
    const rows = items.filter((i) => i.level === level && i.score !== null).sort((a, b) => (b.score as number) - (a.score as number));
    rows.forEach((row, index) => {
      row.rank = index > 0 && rows[index - 1].score === row.score ? rows[index - 1].rank : index + 1;
      row.cohortSize = rows.length;
    });
  }

  return items.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
}
