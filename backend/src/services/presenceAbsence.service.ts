/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "../config/database";
import { db } from "../utils/db";
import { clock } from "./attendance.service";
import { PresenceError, userJournal } from "./presence.service";

/* ===================================================================
 * ABSENCE DÉCLARÉE (« 0 · Absent »)
 *  - Le membre déclare son absence du jour (motif facultatif) : une ligne par membre et par jour.
 *  - Impossible si l'arrivée est déjà pointée ; un pointage d'arrivée annule l'absence du jour.
 *  - Seul le jour courant (heure de Madagascar) peut être déclaré, un jour ouvrable.
 * FICHIER NOUVEAU : le pointage GPS existant n'est pas modifié.
 * =================================================================== */

type Viewer = { id: number; role: string };

const reasonOf = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, 500);
  return t || null;
};

const sinceDay = (days: number): string =>
  new Date(Date.now() - Math.min(Math.max(days, 7), 365) * 24 * 3600 * 1000).toISOString().slice(0, 10);

const toDto = (r: any) => ({
  id: r.id as number,
  userId: r.userId as number,
  day: r.day as string,
  reason: (r.reason ?? null) as string | null,
  internshipId: (r.internshipId ?? null) as number | null,
  createdAt: new Date(r.createdAt).toISOString(),
});

/** Déclare l'absence du jour. */
export async function declareAbsence(user: Viewer, body: any) {
  const c = clock();
  if (!c.workingDay) throw new PresenceError(403, "L'absence ne se déclare que les jours ouvrables (lundi à vendredi).", "NOT_WORKING_DAY");

  const checkedIn = await db.dailyPresence.findUnique({ where: { userId_day: { userId: user.id, day: c.today } }, select: { id: true } });
  if (checkedIn) throw new PresenceError(409, "Votre arrivée est déjà pointée aujourd'hui : vous ne pouvez pas être déclaré absent.", "ALREADY_PRESENT");

  let internshipId: number | null = null;
  if (String(user.role).startsWith("STAGIAIRE_")) {
    const internship = await prisma.internship.findFirst({
      where: { studentId: user.id, status: { in: ["PENDING", "IN_PROGRESS"] as never[] } },
      orderBy: { startDate: "desc" },
      select: { id: true },
    });
    internshipId = internship?.id ?? null;
  }

  const reason = reasonOf(body?.reason);
  const row = await db.presenceAbsence.upsert({
    where: { userId_day: { userId: user.id, day: c.today } },
    create: { userId: user.id, day: c.today, internshipId, reason },
    update: { reason, internshipId },
  });
  return toDto(row);
}

/** Annule l'absence du jour (le membre redevient « à pointer »). */
export async function cancelAbsence(user: Viewer): Promise<void> {
  await db.presenceAbsence.deleteMany({ where: { userId: user.id, day: clock().today } });
}

/** Appelé après un pointage d'arrivée réussi : l'absence du jour n'a plus lieu d'être. */
export async function clearAbsenceForDay(userId: number, day: string): Promise<void> {
  await db.presenceAbsence.deleteMany({ where: { userId, day } });
}

/** Absences du membre connecté. */
export async function myAbsences(user: Viewer, days = 60) {
  const rows: any[] = await db.presenceAbsence.findMany({ where: { userId: user.id, day: { gte: sinceDay(days) } }, orderBy: { day: "desc" }, take: 400 });
  return rows.map(toDto);
}

/** Absences d'un membre pour un lecteur autorisé (mêmes règles de périmètre que le journal de présence). */
export async function absencesOf(viewer: any, userId: number, days = 60) {
  await userJournal(viewer, userId, 7); // lève 403/404 si le lecteur n'a pas accès à ce membre
  const rows: any[] = await db.presenceAbsence.findMany({ where: { userId, day: { gte: sinceDay(days) } }, orderBy: { day: "desc" }, take: 400 });
  return rows.map(toDto);
}
