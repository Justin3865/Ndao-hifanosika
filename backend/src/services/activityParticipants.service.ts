import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { notifyUsers } from "../utils/notify";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

const INTERN_ROLES = ["STAGIAIRE_L3", "STAGIAIRE_M2", "STAGIAIRE_L1", "STAGIAIRE_L2", "STAGIAIRE_M1"];

/**
 * Participants d'une activité = lignes ACTIVITY_PARTICIPATION acceptées (même table que l'espace
 * « participation » : aucune migration, et la colonne « Participants » de la liste les compte déjà).
 */

/** Normalise une entrée « [1,2,3] » ou « "1,2,3" » en liste d'identifiants uniques. */
export function parseParticipantIds(value: unknown): number[] | undefined {
  if (value === undefined) return undefined;
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  const ids = raw.map((v) => Number(v)).filter((v) => Number.isInteger(v) && v > 0);
  return Array.from(new Set<number>(ids));
}

/** Participants acceptés de plusieurs activités : Map<activityId, [{ userId, name }]>. */
export async function participantsByActivity(activityIds: number[]) {
  const result = new Map<number, Array<{ id: number; name: string }>>();
  if (activityIds.length === 0) return result;

  const rows = (await db.activityParticipation.findMany({
    where: { activityId: { in: activityIds }, status: "ACCEPTED" },
    select: { activityId: true, userId: true },
    orderBy: { createdAt: "asc" },
  })) as Array<{ activityId: number; userId: number }>;

  const users = (await db.user.findMany({
    where: { id: { in: Array.from(new Set(rows.map((r) => r.userId))) } },
    select: { id: true, firstName: true, lastName: true },
  })) as Array<{ id: number; firstName: string; lastName: string }>;
  const byId = new Map(users.map((u) => [u.id, `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()]));

  for (const row of rows) {
    const list = result.get(row.activityId) ?? [];
    list.push({ id: row.userId, name: byId.get(row.userId) ?? `#${row.userId}` });
    result.set(row.activityId, list);
  }

  return result;
}

/** Ajoute `participantIds` / `participants` (et `participantsCount`) aux activités renvoyées par l'API. */
export async function withParticipants<T extends { id: number }>(activities: T[]) {
  const map = await participantsByActivity(activities.map((a) => a.id));

  return activities.map((a) => {
    const participants = map.get(a.id) ?? [];
    return {
      ...a,
      participantIds: participants.map((p) => p.id),
      participants,
      participantsCount: participants.length,
    };
  });
}

/**
 * Aligne les participants d'une activité sur la liste fournie.
 *  - ajoutés  : participation ACCEPTED (une demande en attente / refusée est acceptée)
 *  - retirés  : supprimés, SAUF s'ils ont déjà un rapport, un pointage ou une note (historique conservé)
 * Seuls les stagiaires sont pris en compte. Les nouveaux participants sont notifiés.
 */
export async function syncParticipants(
  activity: { id: number; title: string },
  ids: number[],
  actorId: number,
): Promise<void> {
  const valid = (await db.user.findMany({
    where: { id: { in: ids }, role: { in: INTERN_ROLES } },
    select: { id: true },
  })) as Array<{ id: number }>;
  const wanted = new Set(valid.map((u) => u.id));

  const existing = (await db.activityParticipation.findMany({
    where: { activityId: activity.id },
    select: { id: true, userId: true, status: true, report: true, checkedInAt: true, rating: true },
  })) as Array<{
    id: number;
    userId: number;
    status: string;
    report: string | null;
    checkedInAt: Date | null;
    rating: number | null;
  }>;
  const byUser = new Map(existing.map((e) => [e.userId, e]));

  const added: number[] = [];

  for (const userId of Array.from(wanted)) {
    const row = byUser.get(userId);

    if (!row) {
      await db.activityParticipation.create({
        data: { activityId: activity.id, userId, status: "ACCEPTED", decidedById: actorId, decidedAt: new Date() },
      });
      added.push(userId);
    } else if (row.status !== "ACCEPTED") {
      await db.activityParticipation.update({
        where: { id: row.id },
        data: { status: "ACCEPTED", decidedById: actorId, decidedAt: new Date() },
      });
      added.push(userId);
    }
  }

  let removed = 0;

  for (const row of existing) {
    if (wanted.has(row.userId) || row.status !== "ACCEPTED") continue;
    const engaged = Boolean(row.report && row.report.trim()) || row.checkedInAt !== null || row.rating !== null;
    if (!engaged) {
      await db.activityParticipation.delete({ where: { id: row.id } });
      removed += 1;
    }
  }

  // Changement de participants = activité modifiée : elle remonte en tête des listes
  if (added.length || removed) {
    await db.activity.update({ where: { id: activity.id }, data: { updatedAt: new Date() } });
  }

  if (added.length) {
    try {
      await notifyUsers(
        added,
        {
          title: "Participation à une activité",
          message: `Vous avez été ajouté(e) comme participant(e) à « ${activity.title} ».`,
          type: "INFO",
        },
        actorId,
      );
    } catch (error) {
      logger.error("Erreur notification participants", error);
    }
  }
}
