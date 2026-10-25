import { prisma } from "../config/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

/**
 * Ordre de mérite des stagiaires.
 *
 * Pour une période (une année civile), chaque stagiaire est noté sur 100 à partir de SES participations
 * ACCEPTÉES aux activités commencées pendant cette période :
 *   - qualité       (50 %) : moyenne des notes (0-100) données par le tuteur / coordinateur ;
 *   - engagement    (20 %) : part des participations avec un rapport rendu ;
 *   - présence      (20 %) : part des participations avec pointage (check-in) ;
 *   - volume        (10 %) : nombre de participations / objectif (MERIT_TARGET_ACTIVITIES, 5 par défaut).
 * Si aucune note n'a encore été donnée, le score est calculé sur les composantes restantes (poids réajustés).
 * Les stagiaires sont classés par promotion (L3 / M2), à égalité de score : même rang.
 */

export const MERIT_WEIGHTS = { quality: 50, engagement: 20, presence: 20, volume: 10 } as const;
const TARGET = Math.max(1, Number(process.env.MERIT_TARGET_ACTIVITIES) || 5);

export type Level = "L3" | "M2";

export interface MeritRow {
  userId: number;
  name: string;
  level: Level;
  rank: number;
  cohortSize: number;
  score: number;
  badge: string;
  supervisorIds: number[];
  components: { quality: number | null; engagement: number; presence: number; volume: number };
  counts: { participations: number; rated: number; reports: number; checkins: number };
}

export interface MeritResult {
  period: string;
  weights: typeof MERIT_WEIGHTS;
  target: number;
  cohorts: Record<Level, MeritRow[]>;
  /** stagiaires actifs sans participation sur la période (non classés) */
  unranked: number;
  generatedAt: string;
}

const round = (value: number, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;

export const badgeFor = (score: number): string =>
  score >= 85 ? "Excellent" : score >= 70 ? "Très bien" : score >= 55 ? "Bien" : "À améliorer";

export const levelOf = (role: string): Level => (String(role).endsWith("M2") ? "M2" : "L3");

export function currentPeriod(): string {
  return String(new Date().getFullYear());
}

export function validPeriod(value: unknown): string {
  const text = String(value ?? "").trim();
  return /^\d{4}$/.test(text) ? text : currentPeriod();
}

export async function computeMerit(period: string): Promise<MeritResult> {
  const year = Number(period);

  const [interns, internships] = await Promise.all([
    db.user.findMany({
      where: { role: { in: ["STAGIAIRE_L3", "STAGIAIRE_M2"] }, status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true, role: true },
    }),
    db.internship.findMany({ select: { studentId: true, supervisorId: true } }),
  ]);

  const internIds = interns.map((user: { id: number }) => user.id);

  const participations = internIds.length
    ? await db.activityParticipation.findMany({
        where: { userId: { in: internIds }, status: "ACCEPTED" },
        select: { userId: true, activityId: true, report: true, checkedInAt: true, rating: true },
      })
    : [];

  const activityIds = Array.from(new Set<number>(participations.map((row: { activityId: number }) => row.activityId)));
  const activities = activityIds.length
    ? await db.activity.findMany({
        where: { id: { in: activityIds } },
        select: { id: true, startDate: true, createdAt: true },
      })
    : [];

  const inPeriod = new Set<number>(
    activities
      .filter((activity: { startDate: Date | null; createdAt: Date }) =>
        new Date(activity.startDate ?? activity.createdAt).getFullYear() === year,
      )
      .map((activity: { id: number }) => activity.id),
  );

  const supervisors = new Map<number, number[]>();
  for (const row of internships as Array<{ studentId: number; supervisorId: number | null }>) {
    if (row.supervisorId === null) continue;
    supervisors.set(row.studentId, Array.from(new Set([...(supervisors.get(row.studentId) ?? []), row.supervisorId])));
  }

  const cohorts: Record<Level, MeritRow[]> = { L3: [], M2: [] };
  let unranked = 0;

  for (const user of interns as Array<{ id: number; firstName: string; lastName: string; role: string }>) {
    const mine = (participations as Array<{ userId: number; activityId: number; report: string | null; checkedInAt: Date | null; rating: number | null }>)
      .filter((row) => row.userId === user.id && inPeriod.has(row.activityId));

    if (mine.length === 0) {
      unranked += 1;
      continue;
    }

    const rated = mine.filter((row) => row.rating !== null);
    const reports = mine.filter((row) => row.report && row.report.trim().length > 0).length;
    const checkins = mine.filter((row) => row.checkedInAt).length;

    const quality = rated.length ? rated.reduce((sum, row) => sum + (row.rating as number), 0) / rated.length : null;
    const engagement = (reports / mine.length) * 100;
    const presence = (checkins / mine.length) * 100;
    const volume = Math.min(100, (mine.length / TARGET) * 100);

    const parts: Array<[number | null, number]> = [
      [quality, MERIT_WEIGHTS.quality],
      [engagement, MERIT_WEIGHTS.engagement],
      [presence, MERIT_WEIGHTS.presence],
      [volume, MERIT_WEIGHTS.volume],
    ];

    const available = parts.filter(([value]) => value !== null) as Array<[number, number]>;
    const weight = available.reduce((sum, [, w]) => sum + w, 0);
    const score = round(available.reduce((sum, [value, w]) => sum + value * w, 0) / weight);

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
        quality: quality !== null ? round(quality) : null,
        engagement: round(engagement),
        presence: round(presence),
        volume: round(volume),
      },
      counts: { participations: mine.length, rated: rated.length, reports, checkins },
    });
  }

  for (const level of ["L3", "M2"] as Level[]) {
    const rows = cohorts[level].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "fr"));

    rows.forEach((row, index) => {
      // égalité de score = même rang
      row.rank = index > 0 && rows[index - 1].score === row.score ? rows[index - 1].rank : index + 1;
      row.cohortSize = rows.length;
    });
  }

  return { period, weights: MERIT_WEIGHTS, target: TARGET, cohorts, unranked, generatedAt: new Date().toISOString() };
}

/** Clôture une période : enregistre le classement dans l'historique (relançable : met à jour). */
export async function closePeriod(period: string, closedById: number): Promise<{ saved: number }> {
  const result = await computeMerit(period);
  let saved = 0;

  for (const level of ["L3", "M2"] as Level[]) {
    for (const row of result.cohorts[level]) {
      const data = {
        level: row.level,
        rank: row.rank,
        cohortSize: row.cohortSize,
        score: row.score,
        badge: row.badge,
        details: { components: row.components, counts: row.counts, name: row.name },
        closedById,
      };

      await db.meritSnapshot.upsert({
        where: { period_userId: { period, userId: row.userId } },
        create: { period, userId: row.userId, ...data },
        update: { ...data, createdAt: new Date() },
      });
      saved += 1;
    }
  }

  return { saved };
}
