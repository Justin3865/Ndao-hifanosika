import { prisma } from "../config/database";
import { loadInternshipsMonitoring } from "./internshipMonitoring.service";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

/**
 * Ordre de mérite des stagiaires — 100 % automatique, calculé sur 20 à partir du STAGE.
 *
 * Pour une période (une année civile), on prend les stages (en cours ou terminés) qui chevauchent l'année.
 * Chaque stage est noté à partir de ce que le Suivi & Évaluation mesure déjà :
 *   - avancement  (30 %) : avancement moyen des tâches du stage ;
 *   - achèvement  (20 %) : part des tâches terminées (un stage fini = tâches bouclées) ;
 *   - évaluation  (30 %) : moyenne des évaluations du tuteur (notes /20) ;
 *   - rapports    (10 %) : part des tâches terminées qui ont un rapport rendu ;
 *   - présence    (10 %) : jours ouvrés où le stagiaire a pointé (mission GPS) ; ignorée tant qu'aucun pointage n'existe.
 * Une composante sans donnée est ignorée et les poids sont réajustés (un stagiaire n'est jamais pénalisé
 * pour une donnée qui n'existe pas encore). Moyenne /20 = somme pondérée / 100 × 20.
 * Les stagiaires sont classés par promotion (L3 / M2) ; à égalité de moyenne : même rang.
 */

export const MERIT_WEIGHTS = { progress: 30, completion: 20, evaluation: 30, reports: 10, presence: 10 } as const;
export const MERIT_SCALE = 20;

export type Level = "L3" | "M2";
export type MeritKey = keyof typeof MERIT_WEIGHTS;
/** Chaque composante en % (0-100), null = pas encore de donnée. */
export type MeritComponents = Record<MeritKey, number | null>;

export interface MeritRow {
  userId: number;
  name: string;
  level: Level;
  rank: number;
  cohortSize: number;
  /** moyenne sur 20 */
  score: number;
  badge: string;
  supervisorIds: number[];
  components: MeritComponents;
  counts: { stages: number; tasks: number; tasksDone: number; evaluations: number };
  stage: { title: string; status: string; durationMonths: number | null } | null;
}

export interface MeritResult {
  period: string;
  weights: typeof MERIT_WEIGHTS;
  scale: number;
  cohorts: Record<Level, MeritRow[]>;
  /** moyenne /20 de chaque promotion */
  averages: Record<Level, number | null>;
  /** stagiaires actifs sans stage exploitable sur la période (non classés) */
  unranked: number;
  generatedAt: string;
}

const clamp = (n: number, min = 0, max = 100) => Math.min(Math.max(n, min), max);
export const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;

/** Mention selon la moyenne /20 (même grille pour les stagiaires et les projets). */
export const badgeFor = (score: number): string =>
  score >= 16 ? "Excellent" : score >= 14 ? "Très bien" : score >= 12 ? "Bien" : score >= 10 ? "Passable" : "À améliorer";

export const levelOf = (role: string): Level => (String(role).endsWith("M2") ? "M2" : "L3");

export function currentPeriod(): string {
  return String(new Date().getFullYear());
}

export function validPeriod(value: unknown): string {
  const text = String(value ?? "").trim();
  return /^\d{4}$/.test(text) ? text : currentPeriod();
}

type StageMetrics = Awaited<ReturnType<typeof loadInternshipsMonitoring>>[number]["metrics"];

/** Composantes (en %) d'un stage, à partir des mesures du Suivi & Évaluation. */
export function stageComponents(metrics: StageMetrics): MeritComponents {
  const { tasks, components } = metrics;
  const completion = tasks.total > 0 ? clamp((tasks.completed / tasks.total) * 100) : null;

  return {
    progress: components.tasks === null ? null : clamp(components.tasks),
    completion,
    evaluation: components.evaluations === null ? null : clamp(components.evaluations),
    reports: components.reports === null ? null : clamp(components.reports),
    // sans aucun pointage GPS la présence n'est pas mesurée (et non « 0 % ») : elle est alors ignorée
    presence: components.presence === null || metrics.presence.gpsCheckins === 0 ? null : clamp(components.presence),
  };
}

/** Moyenne /20 pondérée (poids réajustés si une composante manque) ; null si aucune donnée. */
export function scoreOn20(components: MeritComponents): number | null {
  let sum = 0;
  let weight = 0;

  (Object.keys(MERIT_WEIGHTS) as MeritKey[]).forEach((key) => {
    const value = components[key];
    if (value === null || value === undefined) return;
    sum += value * MERIT_WEIGHTS[key];
    weight += MERIT_WEIGHTS[key];
  });

  return weight > 0 ? round(((sum / weight) / 100) * MERIT_SCALE) : null;
}

const mean = (values: Array<number | null>): number | null => {
  const list = values.filter((v): v is number => typeof v === "number");
  return list.length ? list.reduce((a, b) => a + b, 0) / list.length : null;
};

export async function computeMerit(period: string): Promise<MeritResult> {
  const year = Number(period);
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

  const interns = await db.user.findMany({
    where: { role: { in: ["STAGIAIRE_L3", "STAGIAIRE_M2"] }, status: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true, role: true },
  });

  // Stages en cours / terminés qui chevauchent l'année (début ≤ fin d'année ET fin ≥ début d'année)
  const stages = await loadInternshipsMonitoring(
    {},
    {
      status: { in: ["IN_PROGRESS", "COMPLETED"] },
      startDate: { lte: yearEnd },
      OR: [{ endDate: null }, { endDate: { gte: yearStart } }],
    },
  );

  const byStudent = new Map<number, StageMetrics[]>();
  const titles = new Map<number, { title: string; status: string; startDate: Date; durationMonths: number | null }>();
  const supervisors = new Map<number, number[]>();

  for (const { internship, metrics } of stages) {
    byStudent.set(internship.studentId, [...(byStudent.get(internship.studentId) ?? []), metrics]);

    const known = titles.get(internship.studentId);
    if (!known || internship.startDate > known.startDate) {
      titles.set(internship.studentId, {
        title: internship.title,
        status: internship.status,
        startDate: internship.startDate,
        durationMonths: metrics.presence.referenceMonths ?? null,
      });
    }

    if (internship.supervisorId !== null) {
      supervisors.set(
        internship.studentId,
        Array.from(new Set([...(supervisors.get(internship.studentId) ?? []), internship.supervisorId])),
      );
    }
  }

  const cohorts: Record<Level, MeritRow[]> = { L3: [], M2: [] };
  let unranked = 0;

  for (const user of interns as Array<{ id: number; firstName: string; lastName: string; role: string }>) {
    const mine = byStudent.get(user.id) ?? [];
    const perStage = mine.map(stageComponents);

    // plusieurs stages dans l'année : moyenne des composantes
    const components: MeritComponents = {
      progress: mean(perStage.map((c) => c.progress)),
      completion: mean(perStage.map((c) => c.completion)),
      evaluation: mean(perStage.map((c) => c.evaluation)),
      reports: mean(perStage.map((c) => c.reports)),
      presence: mean(perStage.map((c) => c.presence)),
    };

    const score = scoreOn20(components);

    if (score === null) {
      unranked += 1;
      continue;
    }

    const stage = titles.get(user.id);

    cohorts[levelOf(user.role)].push({
      userId: user.id,
      name: `${user.firstName} ${user.lastName}`.trim(),
      level: levelOf(user.role),
      rank: 0,
      cohortSize: 0,
      score,
      badge: badgeFor(score),
      supervisorIds: supervisors.get(user.id) ?? [],
      components: {
        progress: components.progress === null ? null : round(components.progress, 1),
        completion: components.completion === null ? null : round(components.completion, 1),
        evaluation: components.evaluation === null ? null : round(components.evaluation, 1),
        reports: components.reports === null ? null : round(components.reports, 1),
        presence: components.presence === null ? null : round(components.presence, 1),
      },
      counts: {
        stages: mine.length,
        tasks: mine.reduce((sum, m) => sum + m.tasks.total, 0),
        tasksDone: mine.reduce((sum, m) => sum + m.tasks.completed, 0),
        evaluations: mine.reduce((sum, m) => sum + m.evaluations.count, 0),
      },
      stage: stage ? { title: stage.title, status: stage.status, durationMonths: stage.durationMonths } : null,
    });
  }

  const averages: Record<Level, number | null> = { L3: null, M2: null };

  for (const level of ["L3", "M2"] as Level[]) {
    const rows = cohorts[level].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "fr"));

    rows.forEach((row, index) => {
      // égalité de moyenne = même rang
      row.rank = index > 0 && rows[index - 1].score === row.score ? rows[index - 1].rank : index + 1;
      row.cohortSize = rows.length;
    });

    const average = mean(rows.map((row) => row.score));
    averages[level] = average === null ? null : round(average);
  }

  return {
    period,
    weights: MERIT_WEIGHTS,
    scale: MERIT_SCALE,
    cohorts,
    averages,
    unranked,
    generatedAt: new Date().toISOString(),
  };
}

/** Promotion « Autre » : durée de stage ni 2 mois (L3) ni 6 mois (M2) — même règle que l'écran Ordre de mérite. */
export const isOtherGroup = (row: Pick<MeritRow, "level" | "stage">): boolean => {
  const months = row.stage?.durationMonths;
  return months !== null && months !== undefined && months !== (row.level === "M2" ? 6 : 2);
};

export const HONOR_MIN_SCORE = 16;

/**
 * Clôture une période : enregistre TOUT le classement dans l'historique (relançable : met à jour).
 * Tous les stagiaires classés sont enregistrés, qu'ils figurent ou non au tableau d'honneur.
 */
export async function closePeriod(
  period: string,
  closedById: number,
): Promise<{ saved: number; honored: number }> {
  const result = await computeMerit(period);
  const savedIds: number[] = [];
  let honored = 0;

  for (const level of ["L3", "M2"] as Level[]) {
    const honorIds = new Set(
      result.cohorts[level]
        .filter((row) => row.score >= HONOR_MIN_SCORE)
        .slice(0, 3)
        .map((row) => row.userId),
    );

    for (const row of result.cohorts[level]) {
      const onHonorBoard = honorIds.has(row.userId);
      if (onHonorBoard) honored += 1;

      const data = {
        level: row.level,
        rank: row.rank,
        cohortSize: row.cohortSize,
        score: row.score,
        badge: row.badge,
        // scale = 20 : distingue les classements /20 (stage) des anciens classements /100 (activités)
        details: {
          scale: MERIT_SCALE,
          components: row.components,
          counts: row.counts,
          stage: row.stage,
          name: row.name,
          group: isOtherGroup(row) ? "AUTRE" : row.level,
          honor: onHonorBoard,
        },
        closedById,
      };

      await db.meritSnapshot.upsert({
        where: { period_userId: { period, userId: row.userId } },
        create: { period, userId: row.userId, ...data },
        update: { ...data, createdAt: new Date() },
      });
      savedIds.push(row.userId);
    }
  }

  // re-clôture : retire de l'historique les stagiaires qui ne sont plus classés, pour éviter des rangs incohérents
  if (savedIds.length > 0) {
    await db.meritSnapshot.deleteMany({ where: { period, userId: { notIn: savedIds } } });
  }

  return { saved: savedIds.length, honored };
}
