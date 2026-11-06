import { z } from "zod";

import { logger } from "../config/logger";
import { db } from "../utils/db";

/**
 * Présences aux séances (activités) — stockées en base (tables BeneficiaryAttendance / AttendanceLog).
 *
 * Règles anti-fraude (appliquées côté serveur, l'horloge du serveur fait foi) :
 *  - on ne peut pointer / modifier / supprimer que les séances DU JOUR ;
 *  - uniquement un jour ouvrable (lundi → vendredi) et entre 08:00 et 17:00 (heure de Madagascar) ;
 *  - à partir de 17:00 (et les jours suivants), tout bénéficiaire non pointé est marqué ABSENT automatiquement.
 * Chaque enregistrement / suppression est horodaté à la seconde (AttendanceLog + AuditLog).
 */

export const ATT_TZ = process.env.ORG_TZ || "Indian/Antananarivo";
export const OPEN_HOUR = 8;
export const CLOSE_HOUR = 17;

export const saveSchema = z.object({
  records: z
    .array(
      z.object({
        beneficiaryId: z.number().int().positive(),
        present: z.boolean(),
        note: z.string().max(500).nullish(),
      }),
    )
    .min(1)
    .max(2000),
});

export interface ClockState {
  today: string; // YYYY-MM-DD (heure locale)
  hour: number;
  minute: number;
  second: number;
  workingDay: boolean;
  open: boolean; // jour ouvrable ET 08:00 ≤ heure < 17:00
  closed: boolean; // jour ouvrable ET heure ≥ 17:00
  openHour: number;
  closeHour: number;
  now: string;
}

function parts(date: Date): Record<string, string> {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: ATT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });
  return Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
}

/** Jour local (YYYY-MM-DD) d'une date. */
export function dayOf(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const p = parts(d);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Jour de la semaine (0 = dimanche … 6 = samedi) d'un YYYY-MM-DD. */
const weekdayOfDay = (day: string): number => new Date(`${day}T12:00:00Z`).getUTCDay();
export const isWorkingDay = (day: string): boolean => {
  const w = weekdayOfDay(day);
  return w >= 1 && w <= 5;
};

export function clock(now: Date = new Date()): ClockState {
  const p = parts(now);
  const today = `${p.year}-${p.month}-${p.day}`;
  const hour = Number(p.hour);
  const workingDay = isWorkingDay(today);
  return {
    today,
    hour,
    minute: Number(p.minute),
    second: Number(p.second),
    workingDay,
    open: workingDay && hour >= OPEN_HOUR && hour < CLOSE_HOUR,
    closed: workingDay && hour >= CLOSE_HOUR,
    openHour: OPEN_HOUR,
    closeHour: CLOSE_HOUR,
    now: now.toISOString(),
  };
}

/** Premier / dernier jour (locaux) d'une séance. */
export function activityDays(a: { startDate?: Date | null; endDate?: Date | null }): { first: string | null; last: string | null } {
  const first = dayOf(a.startDate) ?? dayOf(a.endDate);
  const last = dayOf(a.endDate) ?? first;
  return { first, last };
}

export function isActivityToday(a: { startDate?: Date | null; endDate?: Date | null }, today: string): boolean {
  const { first, last } = activityDays(a);
  return !!first && !!last && first <= today && today <= last;
}

/** Message d'erreur si le pointage n'est pas autorisé maintenant pour cette séance, sinon null. */
export function markingBlockedReason(a: { startDate?: Date | null; endDate?: Date | null }, c: ClockState = clock()): string | null {
  if (!isActivityToday(a, c.today)) return "Seules les séances du jour peuvent être pointées ou modifiées.";
  if (!c.workingDay) return "Le pointage n'est possible que les jours ouvrables (lundi à vendredi).";
  if (c.hour < OPEN_HOUR) return `Le pointage ouvre à ${String(OPEN_HOUR).padStart(2, "0")}h00.`;
  if (c.hour >= CLOSE_HOUR) return `Le pointage est clos depuis ${String(CLOSE_HOUR).padStart(2, "0")}h00 : les non-pointés sont absents automatiquement.`;
  return null;
}

export const levelOfRate = (total: number, rate: number | null): "UNKNOWN" | "LOW" | "MEDIUM" | "GOOD" => {
  if (total < 3 || rate === null) return "UNKNOWN";
  if (rate >= 80) return "GOOD";
  if (rate >= 60) return "MEDIUM";
  return "LOW";
};

const fullName = (u?: { firstName?: string | null; lastName?: string | null } | null): string | null =>
  u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || null : null;

/* ------------------------------------------------------------ absences automatiques */

let lastSweep = 0;

/**
 * Marque ABSENT (automatique) les bénéficiaires non pointés des séances dont le dernier jour est un jour
 * ouvrable déjà clos (passé, ou aujourd'hui à partir de 17:00). Idempotent. Limité à 120 jours en arrière.
 */
export async function sweepAbsents(force = false): Promise<number> {
  const nowMs = Date.now();
  if (!force && nowMs - lastSweep < 60_000) return 0;
  lastSweep = nowMs;

  const c = clock();
  const since = new Date(nowMs - 120 * 24 * 3600 * 1000);
  const activities: Array<{ id: number; projectId: number; startDate: Date | null; endDate: Date | null }> = await db.activity.findMany({
    where: { status: { not: "CANCELLED" }, startDate: { gte: since, lte: new Date(nowMs + 24 * 3600 * 1000) } },
    select: { id: true, projectId: true, startDate: true, endDate: true },
  });

  let total = 0;
  for (const a of activities) {
    const { last } = activityDays(a);
    if (!last || !isWorkingDay(last)) continue;
    const ended = last < c.today || (last === c.today && c.closed);
    if (!ended) continue;

    const endOfDay = new Date(`${last}T23:59:59+03:00`);
    const [people, done] = await Promise.all([
      db.beneficiary.findMany({ where: { projectId: a.projectId, createdAt: { lte: endOfDay } }, select: { id: true } }),
      db.beneficiaryAttendance.findMany({ where: { activityId: a.id }, select: { beneficiaryId: true } }),
    ]);
    const have = new Set(done.map((d: { beneficiaryId: number }) => d.beneficiaryId));
    const missing = people.filter((p: { id: number }) => !have.has(p.id));
    if (missing.length === 0) continue;

    const res = await db.beneficiaryAttendance.createMany({
      data: missing.map((p: { id: number }) => ({
        activityId: a.id,
        beneficiaryId: p.id,
        present: false,
        note: "Absent (automatique : non pointé avant 17h00)",
        recordedById: null,
      })),
      skipDuplicates: true,
    });
    if (res.count > 0) {
      total += res.count;
      await db.attendanceLog.create({ data: { activityId: a.id, action: "AUTO_ABSENT", count: res.count, userName: "Système" } });
    }
  }
  if (total > 0) logger.info(`Présences : ${total} absence(s) automatique(s) enregistrée(s)`);
  return total;
}

export function startAttendanceScheduler(): void {
  const run = () => void sweepAbsents(true).catch((e) => logger.warn(`Balayage des absences impossible : ${(e as Error).message}`));
  setTimeout(run, 20_000);
  setInterval(run, 10 * 60 * 1000);
}

/* ------------------------------------------------------------ lectures */

export async function listActivities(projectId: number) {
  const c = clock();
  const rows: Array<{ id: number; projectId: number; title: string; startDate: Date | null; endDate: Date | null }> =
    await db.activity.findMany({
      where: { projectId, status: { not: "CANCELLED" } },
      orderBy: [{ startDate: "desc" }, { id: "desc" }],
      select: { id: true, projectId: true, title: true, startDate: true, endDate: true },
    });
  return rows.map((a) => ({
    ...a,
    day: activityDays(a).first,
    isToday: isActivityToday(a, c.today),
    editable: markingBlockedReason(a, c) === null,
  }));
}

export async function getActivityAttendance(activityId: number) {
  const activity = await db.activity.findUnique({
    where: { id: activityId },
    select: { id: true, projectId: true, title: true, startDate: true, endDate: true },
  });
  if (!activity) return null;
  const c = clock();

  const [people, records, log] = await Promise.all([
    db.beneficiary.findMany({
      where: { projectId: activity.projectId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
    db.beneficiaryAttendance.findMany({ where: { activityId } }),
    db.attendanceLog.findMany({ where: { activityId }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  const byPerson = new Map<number, { present: boolean; note: string | null; updatedAt: Date; recordedById: number | null }>(
    records.map((r: { beneficiaryId: number; present: boolean; note: string | null; updatedAt: Date; recordedById: number | null }) => [r.beneficiaryId, r]),
  );
  const authorIds = Array.from(new Set(records.map((r: { recordedById: number | null }) => r.recordedById).filter((x: number | null): x is number => x !== null)));
  const authors: Array<{ id: number; firstName: string; lastName: string }> = authorIds.length
    ? await db.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, firstName: true, lastName: true } })
    : [];
  const authorName = new Map(authors.map((u) => [u.id, fullName(u)]));

  const blocked = markingBlockedReason(activity, c);
  return {
    activity: { ...activity, day: activityDays(activity).first },
    state: c,
    editable: blocked === null,
    blockedReason: blocked,
    rows: people.map((p: { id: number; firstName: string; lastName: string }) => {
      const r = byPerson.get(p.id);
      return {
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        recorded: !!r,
        present: r ? r.present : null,
        note: r?.note ?? null,
        recordedAt: r ? r.updatedAt.toISOString() : null,
        recordedBy: r?.recordedById ? authorName.get(r.recordedById) ?? null : r ? "Système" : null,
      };
    }),
    log: log.map((l: { id: number; action: string; count: number; userName: string | null; createdAt: Date }) => ({
      id: l.id,
      action: l.action,
      count: l.count,
      userName: l.userName,
      at: l.createdAt.toISOString(),
    })),
  };
}

export async function summary(projectId?: number) {
  const people: Array<{ id: number; firstName: string; lastName: string; projectId: number }> = await db.beneficiary.findMany({
    where: projectId ? { projectId } : {},
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true, projectId: true },
  });
  const groups: Array<{ beneficiaryId: number; present: boolean; _count: { _all: number } }> = await db.beneficiaryAttendance.groupBy({
    by: ["beneficiaryId", "present"],
    where: projectId ? { activity: { projectId } } : {},
    _count: { _all: true },
  });
  const tally = new Map<number, { present: number; absent: number }>();
  for (const g of groups) {
    const t = tally.get(g.beneficiaryId) ?? { present: 0, absent: 0 };
    if (g.present) t.present += g._count._all;
    else t.absent += g._count._all;
    tally.set(g.beneficiaryId, t);
  }
  let sumPresent = 0;
  let sumTotal = 0;
  const rows = people.map((p) => {
    const t = tally.get(p.id) ?? { present: 0, absent: 0 };
    const total = t.present + t.absent;
    const rate = total > 0 ? Math.round((t.present / total) * 100) : null;
    sumPresent += t.present;
    sumTotal += total;
    return { id: p.id, firstName: p.firstName, lastName: p.lastName, projectId: p.projectId, total, present: t.present, absent: t.absent, rate, level: levelOfRate(total, rate) };
  });
  return { rows, overall: { total: sumTotal, rate: sumTotal > 0 ? Math.round((sumPresent / sumTotal) * 100) : null } };
}

/* ------------------------------------------------------------ écritures */

export async function saveAttendance(activityId: number, input: z.infer<typeof saveSchema>, user: { id: number; firstName?: string; lastName?: string }) {
  const activity = await db.activity.findUnique({ where: { id: activityId }, select: { id: true, projectId: true, startDate: true, endDate: true } });
  if (!activity) return { status: 404 as const, message: "Séance introuvable." };
  const blocked = markingBlockedReason(activity);
  if (blocked) return { status: 403 as const, message: blocked };

  const valid = new Set<number>(
    (await db.beneficiary.findMany({ where: { projectId: activity.projectId }, select: { id: true } })).map((b: { id: number }) => b.id),
  );
  const records = input.records.filter((r) => valid.has(r.beneficiaryId));
  if (records.length === 0) return { status: 400 as const, message: "Aucun bénéficiaire valide pour cette séance." };

  const at = new Date();
  await db.$transaction([
    ...records.map((r) =>
      db.beneficiaryAttendance.upsert({
        where: { activityId_beneficiaryId: { activityId, beneficiaryId: r.beneficiaryId } },
        create: { activityId, beneficiaryId: r.beneficiaryId, present: r.present, note: r.note ?? null, recordedById: user.id },
        update: { present: r.present, note: r.note ?? null, recordedById: user.id, updatedAt: at },
      }),
    ),
    db.attendanceLog.create({ data: { activityId, action: "SAVE", count: records.length, userId: user.id, userName: fullName(user) } }),
    db.auditLog.create({ data: { userId: user.id, action: "ATTENDANCE_SAVE", entity: "activity", entityId: activityId, details: { count: records.length, at: at.toISOString() } } }),
  ]);
  return { status: 200 as const, saved: records.length, at: at.toISOString() };
}

export async function deleteAttendance(activityId: number, beneficiaryId: number | undefined, user: { id: number; firstName?: string; lastName?: string }) {
  const activity = await db.activity.findUnique({ where: { id: activityId }, select: { id: true, startDate: true, endDate: true } });
  if (!activity) return { status: 404 as const, message: "Séance introuvable." };
  const blocked = markingBlockedReason(activity);
  if (blocked) return { status: 403 as const, message: blocked };

  const where = beneficiaryId ? { activityId, beneficiaryId } : { activityId };
  const at = new Date();
  const res = await db.beneficiaryAttendance.deleteMany({ where });
  await db.attendanceLog.create({
    data: { activityId, action: "DELETE", count: res.count, beneficiaryId: beneficiaryId ?? null, userId: user.id, userName: fullName(user) },
  });
  await db.auditLog.create({
    data: { userId: user.id, action: "ATTENDANCE_DELETE", entity: "activity", entityId: activityId, details: { count: res.count, beneficiaryId: beneficiaryId ?? null, at: at.toISOString() } },
  });
  return { status: 200 as const, deleted: res.count, at: at.toISOString() };
}
