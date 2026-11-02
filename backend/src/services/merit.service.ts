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
/** Groupe de classement : L3, M2, ou « Autre » (durée de stage hors norme : ni 2 mois pour L3, ni 6 mois pour M2). Chaque groupe se clôture séparément. */
export type Group = Level | "AUTRE";
export const GROUPS: Group[] = ["L3", "M2", "AUTRE"];
export const isGroup = (value: unknown): value is Group => value === "L3" || value === "M2" || value === "AUTRE";

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
  cohorts: Record<Group, MeritRow[]>;
  /** moyenne /20 de chaque groupe */
  averages: Record<Group, number | null>;
  /** état de clôture de chaque groupe (clôture indépendante : les stages ne finissent pas tous en même temps) */
  groups?: Record<Group, { closedAt: string | null; closed: boolean }>;
  /** stagiaires actifs sans stage exploitable sur la période (non classés) */
  unranked: number;
  generatedAt: string;
  /** période clôturée : le classement a été archivé dans l'historique, plus aucun classement en cours */
  closed?: boolean;
  closedAt?: string | null;
}

const clamp = (n: number, min = 0, max = 100) => Math.min(Math.max(n, min), max);
export const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;

/** Mention selon la moyenne /20 (même grille pour les stagiaires et les projets). */
export const badgeFor = (score: number): string =>
  score >= 16 ? "Excellent" : score >= 14 ? "Très bien" : score >= 12 ? "Bien" : score >= 10 ? "Passable" : "À améliorer";

export const groupOf = (row: Pick<MeritRow, "level" | "stage">): Group => {
  const months = row.stage?.durationMonths;
  return months !== null && months !== undefined && months !== (row.level === "M2" ? 6 : 2) ? "AUTRE" : row.level;
};

export const levelOf = (role: string): Level => (String(role).endsWith("M2") ? "M2" : "L3");

export function currentPeriod(): string {
  return String(new Date().getFullYear());
}

/** Une période (année civile) n'est terminée qu'une fois l'année écoulée : avant, elle ne peut être ni clôturée ni archivée. */
export function isPeriodOver(period: string): boolean {
  return Number(period) < new Date().getFullYear();
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

type SnapshotLite = { id?: number; level: string; createdAt: Date; details?: { group?: unknown; scale?: number } | null };

/**
 * Groupe d'une ligne d'historique. Une ligne de classement /20 (stage) sans groupe est une ancienne clôture « tous groupes » :
 * elle est ignorée (null). Les très anciens classements (activités, /100) retombent sur leur promotion.
 */
export const snapshotGroup = (row: { level: string; details?: { group?: unknown; scale?: number } | null }): Group | null => {
  if (isGroup(row.details?.group)) return row.details.group;
  if (row.details?.scale === 20) return null;
  return isGroup(row.level) ? row.level : null;
};

/** Date de clôture de chaque groupe d'une période (null = groupe ouvert). */
export async function closedAtsOf(period: string): Promise<Record<Group, Date | null>> {
  const rows: SnapshotLite[] = await db.meritSnapshot.findMany({ where: { period }, select: { level: true, createdAt: true, details: true } });
  const out: Record<Group, Date | null> = { L3: null, M2: null, AUTRE: null };

  for (const row of rows) {
    const group = snapshotGroup(row);
    if (group && (!out[group] || row.createdAt > (out[group] as Date))) out[group] = row.createdAt;
  }

  return out;
}

/** Dernière date de clôture d'une période, tous groupes confondus (null = rien de clôturé). */
export async function closedAtOf(period: string): Promise<Date | null> {
  const all = Object.values(await closedAtsOf(period)).filter((d): d is Date => d !== null);
  return all.length ? new Date(Math.max(...all.map((d) => d.getTime()))) : null;
}

/** Stagiaires ayant un nouvel avancement (tâche ajoutée / modifiée) ou une nouvelle évaluation depuis une date. */
async function internsActiveSince(since: Date): Promise<Set<number>> {
  const [tasks, evaluations] = await Promise.all([
    db.internshipTask.findMany({ where: { updatedAt: { gt: since } }, select: { internship: { select: { studentId: true } } } }),
    db.internshipEvaluation.findMany({ where: { updatedAt: { gt: since } }, select: { internship: { select: { studentId: true } } } }),
  ]);

  return new Set<number>(
    [...tasks, ...evaluations].map((row: { internship: { studentId: number } }) => row.internship.studentId),
  );
}

const rankRows = (rows: MeritRow[]) =>
  rows.forEach((row, index) => {
    // égalité de moyenne = même rang
    row.rank = index > 0 && rows[index - 1].score === row.score ? rows[index - 1].rank : index + 1;
    row.cohortSize = rows.length;
  });

/**
 * Classement en cours d'une période, groupe par groupe (L3, M2, Autre).
 * Quand un groupe est clôturé, ses stagiaires sont dans l'historique et son classement en cours repart vide ;
 * dès qu'un nouvel avancement (ou une évaluation) est saisi, le stagiaire concerné réapparaît aussitôt.
 * Les autres groupes ne sont pas touchés : on peut clôturer L3, puis M2, puis Autre, chacun à la fin de ses stages.
 */
export async function computeMerit(period: string): Promise<MeritResult> {
  const live = await computeMeritLive(period);
  const closedAts = await closedAtsOf(period);
  const cohorts: Record<Group, MeritRow[]> = { L3: live.cohorts.L3, M2: live.cohorts.M2, AUTRE: live.cohorts.AUTRE };
  const averages: Record<Group, number | null> = { ...live.averages };
  const groups = { L3: { closedAt: null, closed: false }, M2: { closedAt: null, closed: false }, AUTRE: { closedAt: null, closed: false } } as Record<
    Group,
    { closedAt: string | null; closed: boolean }
  >;

  for (const group of GROUPS) {
    const closedAt = closedAts[group];
    if (!closedAt) continue;

    const fresh = await internsActiveSince(closedAt);
    const rows = live.cohorts[group].filter((row) => fresh.has(row.userId));
    rankRows(rows);
    cohorts[group] = rows;

    const average = mean(rows.map((row) => row.score));
    averages[group] = average === null ? null : round(average);
    groups[group] = { closedAt: closedAt.toISOString(), closed: rows.length === 0 };
  }

  const latest = await closedAtOf(period);

  return {
    ...live,
    cohorts,
    averages,
    groups,
    closed: GROUPS.every((g) => groups[g].closed) && latest !== null,
    closedAt: latest ? latest.toISOString() : null,
  };
}

/** Calcul du classement à partir des données du stage (sans tenir compte de la clôture). */
export async function computeMeritLive(period: string): Promise<MeritResult> {
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

  const cohorts: Record<Group, MeritRow[]> = { L3: [], M2: [], AUTRE: [] };
  const pushRow = (row: MeritRow) => cohorts[groupOf(row)].push(row);
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

    pushRow({
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

  const averages: Record<Group, number | null> = { L3: null, M2: null, AUTRE: null };

  for (const level of GROUPS) {
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

/** Clôture un groupe (L3, M2 ou Autre) d'une période : enregistre son classement dans l'historique (relançable : met à jour). */
export async function closePeriod(period: string, closedById: number | null, group: Group): Promise<{ saved: number }> {
  const result = await computeMeritLive(period);
  const rows = result.cohorts[group];
  let saved = 0;

  if (rows.length > 0) {
    // repart d'un historique propre pour ce groupe : supprime les lignes périmées (stagiaires qui ne sont plus dans le classement)
    const existing: SnapshotLite[] = await db.meritSnapshot.findMany({ where: { period }, select: { id: true, level: true, createdAt: true, details: true } });
    const stale = existing.filter((row) => snapshotGroup(row) === group).map((row) => row.id);
    if (stale.length) await db.meritSnapshot.deleteMany({ where: { id: { in: stale } } });
  }

  for (const row of rows) {
    const data = {
      level: row.level,
      rank: row.rank,
      cohortSize: row.cohortSize,
      score: row.score,
      badge: row.badge,
      // scale = 20 : distingue les classements /20 (stage) des anciens classements /100 (activités)
      details: { scale: MERIT_SCALE, group, components: row.components, counts: row.counts, stage: row.stage, name: row.name },
      closedById,
    };

    await db.meritSnapshot.upsert({
      where: { period_userId: { period, userId: row.userId } },
      create: { period, userId: row.userId, ...data },
      update: { ...data, createdAt: new Date() },
    });
    saved += 1;
  }

  return { saved };
}

const autoChecked = new Set<string>();

/**
 * Clôture automatique de fin d'année : dès que l'année d'une période est terminée (à partir du 01/01 suivant),
 * les groupes pas encore clôturés sont archivés dans l'historique la première fois que la période est consultée.
 * Rien n'est fait pour une année en cours (clôture manuelle, groupe par groupe) ni pour un groupe déjà clôturé.
 */
export async function ensurePeriodClosed(period: string): Promise<void> {
  if (!isPeriodOver(period) || autoChecked.has(period)) return;

  const closedAts = await closedAtsOf(period);

  for (const group of GROUPS) {
    if (!closedAts[group]) await closePeriod(period, null, group);
  }

  autoChecked.add(period);
}

/** Rouvre un groupe d'une période : supprime sa clôture de l'historique, ses stagiaires reviennent dans le classement en cours. */
export async function reopenGroup(period: string, group: Group): Promise<{ removed: number }> {
  const rows: SnapshotLite[] = await db.meritSnapshot.findMany({ where: { period }, select: { id: true, level: true, createdAt: true, details: true } });
  const ids = rows.filter((row) => snapshotGroup(row) === group).map((row) => row.id);

  if (ids.length) await db.meritSnapshot.deleteMany({ where: { id: { in: ids } } });
  autoChecked.delete(period);

  return { removed: ids.length };
}
