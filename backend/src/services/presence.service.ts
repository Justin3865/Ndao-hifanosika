/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { lookupElevation } from "../controllers/elevation.controller";
import { haversineKm } from "../ml/geo";
import { db } from "../utils/db";
import { notifyRoles, notifyUsers } from "../utils/notify";
import { CLOSE_HOUR, ClockState, OPEN_HOUR, clock } from "./attendance.service";
import { recordSnapshot, statusFromProgress } from "./monitoring.service";
import { loadScope } from "./projectScope.service";

/* ===================================================================
 * PRÉSENCE JOURNALIÈRE AVEC PREUVE GPS
 *
 *  1. ARRIVÉE : la position GPS de l'appareil (latitude, longitude, altitude, précision) est comparée au lieu attendu :
 *       - « Au siège »  -> le siège de l'ONG (zone marquée « siège »), rayon PRESENCE_SITE_RADIUS_M (200 m par défaut) ;
 *       - « Terrain »   -> une zone d'intervention enregistrée (ou la mission en cours).
 *     L'altitude annoncée est comparée à l'altitude du terrain (modèle d'élévation) : tolérance 80 m.
 *     Hors zone ou GPS trop imprécis : le pointage est REFUSÉ (et journalisé). Les autres écarts sont enregistrés
 *     comme anomalies (statut « à vérifier »).
 *  2. DÉPART (avant de rentrer) : on déclare les tâches faites aujourd'hui. Elles mettent à jour les tâches du stage
 *     (avancement, rapport) -> le Suivi & Évaluation (avancement, rapports, présence) les voit tout de suite.
 *  3. Un stagiaire qui pointe son arrivée a sa journée comptée dans la présence du stage (mission « présence » avec point GPS).
 *
 * Règles de jour / heure : mêmes que les présences aux séances (jour ouvrable, 08h00–17h00, heure de Madagascar).
 * FICHIER NOUVEAU : aucune fonction existante n'est modifiée.
 * =================================================================== */

export class PresenceError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

type Viewer = Parameters<typeof loadScope>[0];
type Mode = "SIEGE" | "TERRAIN";

const SITE_RADIUS_M = Number(process.env.PRESENCE_SITE_RADIUS_M) || 200;
const MAX_ACCURACY_M = Number(process.env.PRESENCE_MAX_ACCURACY_M) || 150;
const WARN_ACCURACY_M = 50;
const ALTITUDE_TOLERANCE_M = Number(process.env.PRESENCE_ALTITUDE_TOLERANCE_M) || 80;
const DEFAULT_ZONE_RADIUS_KM = 10;
const MIN_PRESENCE_MIN = 30;

/** Anomalies d'information : elles n'ont pas d'effet sur le statut « à vérifier ». */
const INFO_FLAGS = ["LOW_ACCURACY", "NO_ACCURACY", "NO_ALTITUDE", "NO_REFERENCE"];

const isStagiaire = (role: string) => String(role ?? "").startsWith("STAGIAIRE_");
const isTuteur = (role: string) => String(role ?? "").startsWith("TUTEUR_");

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const text = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t || null;
};

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const validDay = (v: unknown): string | null => (typeof v === "string" && DAY_RE.test(v) ? v : null);

const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T | null> =>
  Promise.race([p, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);

/* ------------------------------ position et lieu attendu ------------------------------ */

interface Point {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
}

function parsePoint(body: any): Point {
  const latitude = num(body?.latitude);
  const longitude = num(body?.longitude);

  if (latitude === null || longitude === null || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || (latitude === 0 && longitude === 0)) {
    throw new PresenceError(400, "Position GPS invalide : activez la localisation de l'appareil puis cliquez sur « Ma position actuelle ».", "NO_POSITION");
  }

  const altitude = num(body?.altitude);
  const accuracy = num(body?.accuracy);

  return {
    latitude,
    longitude,
    altitude: altitude !== null && altitude > -500 && altitude < 9000 ? altitude : null,
    accuracy: accuracy !== null && accuracy >= 0 ? accuracy : null,
  };
}

interface ZoneRow {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radiusKm: number | null;
  isHeadquarters: boolean;
}

async function loadZones(): Promise<ZoneRow[]> {
  return db.zone.findMany({
    where: { isActive: true },
    select: { id: true, name: true, latitude: true, longitude: true, radiusKm: true, isHeadquarters: true },
  });
}

const distanceM = (p: { latitude: number; longitude: number }, z: { latitude: number; longitude: number }): number =>
  haversineKm(p.latitude, p.longitude, z.latitude, z.longitude) * 1000;

interface Evaluation {
  rejected: string | null;
  flags: string[];
  zone: ZoneRow | null;
  distanceM: number | null;
  expectedAltitude: number | null;
}

/**
 * Compare la position au lieu attendu. strict = true (arrivée) : un GPS trop imprécis ou une position hors zone refuse le pointage.
 * strict = false (départ) : on enregistre seulement les anomalies.
 */
async function evaluate(point: Point, mode: Mode, strict: boolean): Promise<Evaluation> {
  const flags: string[] = [];
  let rejected: string | null = null;

  if (point.accuracy === null) {
    flags.push("NO_ACCURACY");
  } else if (point.accuracy > MAX_ACCURACY_M) {
    flags.push("LOW_ACCURACY");
    if (strict) rejected = `Précision GPS insuffisante (±${Math.round(point.accuracy)} m, maximum ${MAX_ACCURACY_M} m) : activez le GPS, sortez à l'air libre puis réessayez.`;
  } else if (point.accuracy > WARN_ACCURACY_M) {
    flags.push("LOW_ACCURACY");
  }

  const zones = await loadZones();
  let zone: ZoneRow | null = null;
  let dist: number | null = null;

  if (mode === "SIEGE") {
    zone = zones.find((z) => z.isHeadquarters) ?? null;

    if (!zone) {
      flags.push("NO_REFERENCE");
    } else {
      dist = Math.round(distanceM(point, zone));

      if (dist > SITE_RADIUS_M) {
        flags.push("OUT_OF_ZONE");
        if (strict && !rejected) rejected = `Vous êtes à ${dist} m du siège (« ${zone.name} ») : le pointage « au siège » exige d'être à moins de ${SITE_RADIUS_M} m.`;
      }
    }
  } else if (!zones.length) {
    flags.push("NO_REFERENCE");
  } else {
    let best = zones[0];
    let bestD = Infinity;

    for (const z of zones) {
      const d = distanceM(point, z);
      if (d < bestD) {
        best = z;
        bestD = d;
      }
    }

    zone = best;
    dist = Math.round(bestD);

    if (bestD > (best.radiusKm ?? DEFAULT_ZONE_RADIUS_KM) * 1000) {
      flags.push("OUT_OF_ZONE");
      if (strict && !rejected) rejected = `Vous êtes hors de toute zone d'intervention enregistrée (la plus proche : « ${best.name} », à ${(bestD / 1000).toFixed(1)} km).`;
    }
  }

  // Altitude annoncée par l'appareil <-> altitude du terrain à cet endroit
  let expectedAltitude: number | null = null;

  if (point.altitude === null) {
    flags.push("NO_ALTITUDE");
  } else {
    try {
      const found = await withTimeout(lookupElevation(point.latitude, point.longitude), 4000);

      if (found) {
        expectedAltitude = Math.round(found.elevation);
        if (Math.abs(point.altitude - found.elevation) > ALTITUDE_TOLERANCE_M) flags.push("ALTITUDE_MISMATCH");
      }
    } catch (error) {
      logger.warn(`Altitude de référence indisponible : ${(error as Error).message}`);
    }
  }

  return { rejected, flags, zone, distanceM: dist, expectedAltitude };
}

const statusOf = (flags: string[]): "OK" | "SUSPECT" => (flags.some((f) => !INFO_FLAGS.includes(f)) ? "SUSPECT" : "OK");

/* ------------------------------ DTO ------------------------------ */

const iso = (d: Date | string | null | undefined): string | null => (d ? new Date(d).toISOString() : null);

function toDto(r: any) {
  return {
    id: r.id as number,
    userId: r.userId as number,
    day: r.day as string,
    mode: r.mode as Mode,
    internshipId: (r.internshipId ?? null) as number | null,
    projectId: (r.projectId ?? null) as number | null,
    missionId: (r.missionId ?? null) as number | null,
    checkInAt: iso(r.checkInAt) as string,
    checkIn: {
      latitude: r.inLatitude as number,
      longitude: r.inLongitude as number,
      altitude: (r.inAltitude ?? null) as number | null,
      accuracy: (r.inAccuracy ?? null) as number | null,
      distanceM: (r.inDistanceM ?? null) as number | null,
      expectedAltitude: (r.inExpectedAltitude ?? null) as number | null,
    },
    checkOutAt: iso(r.checkOutAt),
    checkOut: r.checkOutAt
      ? {
          latitude: r.outLatitude as number | null,
          longitude: r.outLongitude as number | null,
          altitude: (r.outAltitude ?? null) as number | null,
          accuracy: (r.outAccuracy ?? null) as number | null,
          distanceM: (r.outDistanceM ?? null) as number | null,
        }
      : null,
    status: r.status as "OK" | "SUSPECT",
    flags: (Array.isArray(r.flags) ? r.flags : []) as string[],
    tasksDone: (r.tasksDone ?? 0) as number,
    summary: (r.summary ?? null) as string | null,
    tasks: ((r.tasks ?? []) as any[]).map((t) => ({
      id: t.id as number,
      internshipTaskId: (t.internshipTaskId ?? null) as number | null,
      activityId: (t.activityId ?? null) as number | null,
      title: t.title as string,
      note: (t.note ?? null) as string | null,
      progress: (t.progress ?? null) as number | null,
      completed: Boolean(t.completed),
    })),
  };
}

/* ------------------------------ contexte de l'utilisateur ------------------------------ */

async function currentInternship(user: Viewer) {
  if (!isStagiaire(user.role)) return null;

  const rows = await prisma.internship.findMany({
    where: { studentId: user.id, status: { in: ["PENDING", "IN_PROGRESS"] as never[] } },
    orderBy: { startDate: "desc" },
    take: 1,
    select: {
      id: true,
      title: true,
      projectId: true,
      tasks: {
        where: { status: { not: "CANCELLED" as never } },
        orderBy: { createdAt: "asc" },
        select: { id: true, title: true, status: true, progress: true },
      },
    },
  });

  return rows[0] ?? null;
}

function checkInBlockedReason(c: ClockState): string | null {
  const hh = (h: number) => `${String(h).padStart(2, "0")}h00`;
  if (!c.workingDay) return "Le pointage n'est possible que les jours ouvrables (lundi à vendredi).";
  if (c.hour < OPEN_HOUR) return `Le pointage de l'arrivée ouvre à ${hh(OPEN_HOUR)}.`;
  if (c.hour >= CLOSE_HOUR) return `Le pointage de l'arrivée est clos depuis ${hh(CLOSE_HOUR)}.`;
  return null;
}

/** État du jour de l'utilisateur connecté : règles, siège, stage + tâches, pointage du jour. */
export async function getState(user: Viewer) {
  const c = clock();
  const [internship, row, zones] = await Promise.all([
    currentInternship(user),
    db.dailyPresence.findUnique({ where: { userId_day: { userId: user.id, day: c.today } }, include: { tasks: true } }),
    loadZones(),
  ]);

  const hq = zones.find((z) => z.isHeadquarters) ?? null;
  // Activités du projet choisi à l'arrivée : un membre non stagiaire y reporte ses tâches du jour (avancement du projet)
  const activities: Array<{ id: number; title: string; progress: number; status: string }> =
    row?.projectId && !row.internshipId
      ? await prisma.activity.findMany({ where: { projectId: row.projectId, status: { not: "CANCELLED" as never } }, orderBy: { title: "asc" }, select: { id: true, title: true, progress: true, status: true } })
      : [];
  let blockedReason: string | null = row ? null : checkInBlockedReason(c);
  if (!row && !blockedReason && isStagiaire(user.role) && !internship) blockedReason = "Aucun stage en cours n'est rattaché à votre compte.";

  return {
    clock: c,
    rules: { siteRadiusM: SITE_RADIUS_M, maxAccuracyM: MAX_ACCURACY_M, altitudeToleranceM: ALTITUDE_TOLERANCE_M, openHour: OPEN_HOUR, closeHour: CLOSE_HOUR },
    isStagiaire: isStagiaire(user.role),
    hq: hq ? { id: hq.id, name: hq.name, latitude: hq.latitude, longitude: hq.longitude } : null,
    internship: internship ? { id: internship.id, title: internship.title, projectId: internship.projectId, tasks: internship.tasks } : null,
    activities,
    today: row ? toDto(row) : null,
    canCheckIn: !row && !blockedReason,
    blockedReason,
  };
}

/* ------------------------------ arrivée ------------------------------ */

export async function checkIn(user: Viewer, body: any) {
  const c = clock();
  const blocked = checkInBlockedReason(c);
  if (blocked) throw new PresenceError(403, blocked, "CLOSED");

  const exists = await db.dailyPresence.findUnique({ where: { userId_day: { userId: user.id, day: c.today } }, select: { checkInAt: true } });
  if (exists) throw new PresenceError(409, "Votre arrivée est déjà pointée aujourd'hui.", "ALREADY");

  const point = parsePoint(body);
  const mode: Mode = body?.mode === "TERRAIN" ? "TERRAIN" : "SIEGE";
  const internship = await currentInternship(user);

  if (isStagiaire(user.role) && !internship) throw new PresenceError(409, "Aucun stage en cours n'est rattaché à votre compte.", "NO_INTERNSHIP");

  // Projet : celui du stage ; sinon celui choisi (facultatif)
  let projectId: number | null = internship?.projectId ?? null;
  const asked = num(body?.projectId);
  if (!projectId && asked && Number.isInteger(asked) && asked > 0) {
    const project = await prisma.project.findUnique({ where: { id: asked }, select: { id: true } });
    if (project) projectId = project.id;
  }

  const ev = await evaluate(point, mode, true);

  if (ev.rejected) {
    void notifyRejected(user, internship, projectId, ev.rejected);
    await audit(user.id, "PRESENCE_REJECTED", 0, { mode, reason: ev.rejected, flags: ev.flags, latitude: point.latitude, longitude: point.longitude, accuracy: point.accuracy, distanceM: ev.distanceM });
    throw new PresenceError(403, ev.rejected, "REJECTED");
  }

  const now = new Date();

  // Mission rattachée : celle en cours ; sinon (stagiaire) une mission « présence » avec le point GPS, qui compte la journée dans le suivi du stage
  let missionId: number | null = null;
  try {
    const active = await prisma.mission.findFirst({ where: { agentId: user.id, endedAt: null }, select: { id: true } });
    missionId = active?.id ?? null;

    if (!active && internship) {
      const dayStart = new Date(`${c.today}T00:00:00+03:00`);
      const dayEnd = new Date(`${c.today}T23:59:59.999+03:00`);
      const already = await prisma.mission.findFirst({ where: { agentId: user.id, startedAt: { gte: dayStart, lte: dayEnd } }, select: { id: true } });

      if (!already) {
        const mission = await prisma.mission.create({
          data: {
            agentId: user.id,
            startedAt: now,
            endedAt: now,
            endReason: "PRESENCE_GPS",
            points: { create: [{ latitude: point.latitude, longitude: point.longitude, altitude: point.altitude, accuracy: point.accuracy }] },
          },
          select: { id: true },
        });
        missionId = mission.id;
      }
    }
  } catch (error) {
    logger.error("Mission de présence non créée", error);
  }

  let row: any;
  try {
    row = await db.dailyPresence.create({
      data: {
        userId: user.id,
        day: c.today,
        mode,
        internshipId: internship?.id ?? null,
        projectId,
        missionId,
        checkInAt: now,
        inLatitude: point.latitude,
        inLongitude: point.longitude,
        inAltitude: point.altitude,
        inAccuracy: point.accuracy,
        inZoneId: ev.zone?.id ?? null,
        inDistanceM: ev.distanceM,
        inExpectedAltitude: ev.expectedAltitude,
        status: statusOf(ev.flags),
        flags: ev.flags,
      },
      include: { tasks: true },
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") throw new PresenceError(409, "Votre arrivée est déjà pointée aujourd'hui.", "ALREADY");
    throw error;
  }

  // Un stage qui reçoit un pointage est « en cours » (comme pour l'avancement manuel)
  if (internship) await prisma.internship.updateMany({ where: { id: internship.id, status: "PENDING" }, data: { status: "IN_PROGRESS" } });

  await audit(user.id, "PRESENCE_CHECKIN", row.id, { mode, flags: ev.flags, distanceM: ev.distanceM, expectedAltitude: ev.expectedAltitude });

  if (row.status === "SUSPECT") void notifySuspect(user, row, "Arrivée à vérifier", ev.flags);

  return toDto(row);
}

/* ------------------------------ départ + tâches du jour ------------------------------ */

interface TaskLine {
  internshipTaskId: number | null;
  activityId: number | null;
  title: string;
  note: string | null;
  progress: number | null;
  completed: boolean;
}

function parseLines(raw: unknown): TaskLine[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new PresenceError(400, "Avant de partir, renseignez au moins une tâche réalisée aujourd'hui.", "NO_TASKS");
  }
  if (raw.length > 30) throw new PresenceError(400, "Trop de lignes de tâches (30 maximum).");

  return raw.map((r: any, i: number) => {
    const id = num(r?.internshipTaskId);
    const act = num(r?.activityId);
    const title = text(r?.title, 200) ?? "";
    const progress = num(r?.progress);

    if (!(id && Number.isInteger(id) && id > 0) && !(act && Number.isInteger(act) && act > 0) && !title) throw new PresenceError(400, `Tâche ${i + 1} : choisissez une tâche existante ou donnez un titre.`);
    if (progress !== null && (progress < 0 || progress > 100)) throw new PresenceError(400, `Tâche ${i + 1} : l'avancement doit être compris entre 0 et 100.`);

    return {
      internshipTaskId: id && Number.isInteger(id) && id > 0 ? id : null,
      activityId: act && Number.isInteger(act) && act > 0 ? act : null,
      title,
      note: text(r?.note, 1000),
      progress: progress === null ? null : Math.round(progress),
      completed: r?.completed === true,
    };
  });
}

export async function checkOut(user: Viewer, body: any) {
  const c = clock();
  const row = await db.dailyPresence.findUnique({ where: { userId_day: { userId: user.id, day: c.today } } });

  if (!row) throw new PresenceError(409, "Pointez d'abord votre arrivée.", "NO_CHECKIN");
  if (row.checkOutAt) throw new PresenceError(409, "Votre départ est déjà pointé aujourd'hui.", "ALREADY");

  const lines = parseLines(body?.tasks);
  const point = parsePoint(body);
  const summary = text(body?.summary, 2000);

  // Tâches du stage : uniquement celles du stage du stagiaire
  const ids = Array.from(new Set(lines.map((l) => l.internshipTaskId).filter((x): x is number => x !== null)));
  const existing: Array<{ id: number; title: string; status: string; progress: number; report: string | null; completedAt: Date | null }> =
    ids.length && row.internshipId
      ? await prisma.internshipTask.findMany({ where: { id: { in: ids }, internshipId: row.internshipId }, select: { id: true, title: true, status: true, progress: true, report: true, completedAt: true } })
      : [];
  const byId = new Map(existing.map((t) => [t.id, t]));

  for (const l of lines) {
    if (l.internshipTaskId && !byId.has(l.internshipTaskId)) throw new PresenceError(400, "Une des tâches ne fait pas partie de votre stage.");
  }

  // Activités du projet (membre non stagiaire) : réservé à l'équipe qui gère les projets, dans son périmètre
  const actIds = Array.from(new Set(lines.map((l) => l.activityId).filter((x): x is number => x !== null)));
  const activities: Array<{ id: number; title: string; progress: number; status: string; actualStartDate: Date | null; actualEndDate: Date | null }> = [];

  if (actIds.length) {
    if (row.internshipId) throw new PresenceError(400, "Les tâches d'un stagiaire se rattachent aux tâches de son stage.");
    if (!row.projectId) throw new PresenceError(400, "Choisissez un projet à l'arrivée pour reporter l'avancement d'une activité.");
    if (!["ADMIN", "DIRECTION", "COORDINATOR"].includes(String(user.role))) throw new PresenceError(403, "Seuls l'administration, la direction et les coordinateurs peuvent mettre à jour l'avancement d'un projet.");

    const scope = await loadScope(user);
    if (scope.scoped && !scope.allowed.includes(row.projectId)) throw new PresenceError(403, "Accès refusé : ce projet ne vous est pas affecté.");

    const found: any[] = await prisma.activity.findMany({
      where: { id: { in: actIds }, projectId: row.projectId },
      select: { id: true, title: true, progress: true, status: true, actualStartDate: true, actualEndDate: true },
    });
    if (found.length !== actIds.length) throw new PresenceError(400, "Une des activités ne fait pas partie du projet de la journée.");
    activities.push(...found);
  }
  const activityOf = new Map(activities.map((a) => [a.id, a]));
  const touched: string[] = [];

  const ev = await evaluate(point, row.mode as Mode, false);
  const flags = new Set<string>(Array.isArray(row.flags) ? (row.flags as string[]) : []);

  for (const f of ev.flags) if (!INFO_FLAGS.includes(f)) flags.add(`${f}_AT_EXIT`);

  const movedM = Math.round(distanceM(point, { latitude: row.inLatitude, longitude: row.inLongitude }));
  if (row.mode === "SIEGE" && movedM > SITE_RADIUS_M * 2) flags.add("LEFT_SITE");

  const now = new Date();
  if ((now.getTime() - new Date(row.checkInAt).getTime()) / 60000 < MIN_PRESENCE_MIN) flags.add("VERY_SHORT_PRESENCE");

  const wasSuspect = row.status === "SUSPECT";
  const stamp = `[${c.today.slice(8, 10)}/${c.today.slice(5, 7)}/${c.today.slice(0, 4)}]`;

  const updated = await prisma.$transaction(async (tx) => {
    const t = tx as any;
    const logs: Array<{ presenceId: number; internshipTaskId: number | null; activityId: number | null; title: string; note: string | null; progress: number | null; completed: boolean }> = [];

    for (const l of lines) {
      let taskId = l.internshipTaskId;
      let title = l.title;
      let progress: number | null = l.progress;
      let completed = l.completed;

      if (row.internshipId && taskId) {
        const cur = byId.get(taskId)!;
        title = cur.title;
        let next = completed ? 100 : Math.max(cur.progress ?? 0, l.progress ?? cur.progress ?? 0);
        let status = cur.status;

        if (next >= 100) {
          next = 100;
          status = "COMPLETED";
        } else if (status === "TODO") {
          status = "IN_PROGRESS";
        }

        await t.internshipTask.update({
          where: { id: taskId },
          data: {
            progress: next,
            status,
            completedAt: status === "COMPLETED" ? cur.completedAt ?? now : null,
            ...(l.note ? { report: `${cur.report ? `${cur.report}\n` : ""}${stamp} ${l.note}` } : {}),
          },
        });
        progress = next;
        completed = status === "COMPLETED";
      } else if (row.internshipId) {
        const next = completed ? 100 : Math.min(100, l.progress ?? 0);
        const status = next >= 100 ? "COMPLETED" : "IN_PROGRESS";
        const created = await t.internshipTask.create({
          data: { internshipId: row.internshipId, title, status, progress: next, report: l.note ? `${stamp} ${l.note}` : null, completedAt: status === "COMPLETED" ? now : null },
          select: { id: true },
        });
        taskId = created.id;
        progress = next;
        completed = status === "COMPLETED";
      } else if (l.activityId && activityOf.has(l.activityId)) {
        // Avancement du projet : l'activité reçoit le nouvel avancement (jamais en recul) et son statut suit
        const act = activityOf.get(l.activityId)!;
        title = title || act.title;
        let next = completed ? 100 : Math.max(act.progress ?? 0, l.progress ?? act.progress ?? 0);
        if (next >= 100) next = 100;

        await t.activity.update({
          where: { id: act.id },
          data: {
            progress: next,
            status: statusFromProgress(next, act.status),
            ...(next > 0 && !act.actualStartDate ? { actualStartDate: now } : {}),
            ...(next >= 100 && !act.actualEndDate ? { actualEndDate: now } : {}),
          },
        });
        progress = next;
        completed = next >= 100;
        touched.push(`« ${act.title} » à ${next} %`);
      } else if (completed) {
        progress = 100;
      }

      logs.push({ presenceId: row.id, internshipTaskId: taskId, activityId: l.activityId && activityOf.has(l.activityId) ? l.activityId : null, title, note: l.note, progress, completed });
    }

    await t.dailyPresenceTask.createMany({ data: logs });

    const list = Array.from(flags);
    const saved = await t.dailyPresence.update({
      where: { id: row.id },
      data: {
        checkOutAt: now,
        outLatitude: point.latitude,
        outLongitude: point.longitude,
        outAltitude: point.altitude,
        outAccuracy: point.accuracy,
        outDistanceM: ev.distanceM,
        status: statusOf(list),
        flags: list,
        tasksDone: lines.length,
        summary,
      },
      include: { tasks: true },
    });

    // La mission « présence » se termine avec la journée (jamais une vraie mission en cours)
    if (row.missionId) await t.mission.updateMany({ where: { id: row.missionId, endReason: "PRESENCE_GPS" }, data: { endedAt: now } });

    return saved;
  });

  await audit(user.id, "PRESENCE_CHECKOUT", row.id, { tasks: lines.length, flags: Array.from(flags), movedM });

  // Avancement du projet : un instantané pour le Suivi & Évaluation (courbes, écarts)
  if (touched.length && row.projectId) {
    try {
      await recordSnapshot(row.projectId, `Présence du ${c.today} : ${touched.join(" ; ")}`);
    } catch (error) {
      logger.warn(`Instantané du projet impossible : ${(error as Error).message}`);
    }
  }

  void notifyOnCheckOut(user, updated, lines.length, touched.length, statusOf(Array.from(flags)) === "SUSPECT" && !wasSuspect);

  return toDto(updated);
}

async function audit(userId: number, action: string, entityId: number, details: Record<string, unknown>): Promise<void> {
  try {
    await db.auditLog.create({ data: { userId, action, entity: "presence", entityId: entityId || null, details } });
  } catch (error) {
    logger.warn(`Journal d'audit de présence impossible : ${(error as Error).message}`);
  }
}

/* ------------------------------ lectures pour le suivi (équipe, projet, stage) ------------------------------ */

export interface OverviewFilters {
  day?: string;
  from?: string;
  to?: string;
  projectId?: number | null;
  internshipId?: number | null;
  userId?: number | null;
  status?: string;
}

/** Présences de la journée (ou d'une période) avec leurs tâches ; périmètre selon le rôle (admin, coordinateur, tuteur). */
export async function overview(viewer: Viewer, f: OverviewFilters) {
  const c = clock();
  const day = validDay(f.day) ?? c.today;
  const from = validDay(f.from);
  const to = validDay(f.to);

  const where: any = from || to ? { day: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : { day };
  if (f.projectId) where.projectId = f.projectId;
  if (f.internshipId) where.internshipId = f.internshipId;
  if (f.userId) where.userId = f.userId;
  if (f.status === "OK" || f.status === "SUSPECT") where.status = f.status;

  // Périmètre
  let supervised: number[] | null = null;
  let allowedProjects: number[] | null = null;

  if (isTuteur(viewer.role)) {
    const mine = await prisma.internship.findMany({ where: { supervisorId: viewer.id }, select: { id: true } });
    supervised = mine.map((i) => i.id);
    where.AND = [{ OR: [{ userId: viewer.id }, { internshipId: { in: supervised } }] }];
  } else if (viewer.role === "COORDINATOR") {
    const scope = await loadScope(viewer);
    if (scope.scoped) {
      allowedProjects = scope.allowed;
      where.AND = [{ OR: [{ userId: viewer.id }, { projectId: { in: scope.allowed } }] }];
    }
  }

  const rows: any[] = await db.dailyPresence.findMany({ where, orderBy: [{ day: "desc" }, { checkInAt: "asc" }], take: 500, include: { tasks: true } });

  const userIds = Array.from(new Set(rows.map((r) => r.userId as number)));
  const projectIds = Array.from(new Set(rows.map((r) => r.projectId).filter((x): x is number => !!x)));
  const internshipIds = Array.from(new Set(rows.map((r) => r.internshipId).filter((x): x is number => !!x)));

  const [users, projects, internships] = await Promise.all([
    userIds.length ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, firstName: true, lastName: true, role: true } }) : [],
    projectIds.length ? prisma.project.findMany({ where: { id: { in: projectIds } }, select: { id: true, name: true } }) : [],
    internshipIds.length ? prisma.internship.findMany({ where: { id: { in: internshipIds } }, select: { id: true, title: true } }) : [],
  ]);

  const userOf = new Map(users.map((u) => [u.id, u]));
  const projectOf = new Map(projects.map((p) => [p.id, p.name]));
  const internshipOf = new Map(internships.map((i) => [i.id, i.title]));

  const list = rows.map((r) => {
    const u = userOf.get(r.userId);
    return {
      ...toDto(r),
      userName: u ? `${u.firstName} ${u.lastName}`.trim() : "—",
      role: u?.role ?? null,
      projectName: r.projectId ? projectOf.get(r.projectId) ?? null : null,
      internshipTitle: r.internshipId ? internshipOf.get(r.internshipId) ?? null : null,
    };
  });

  // Stagiaires en cours qui n'ont pas encore pointé aujourd'hui (jour ouvrable seulement)
  let missing: Array<{ userId: number; name: string; internshipId: number; title: string }> = [];

  if (!from && !to && day === c.today && c.workingDay && !f.userId) {
    const iwhere: any = { status: "IN_PROGRESS", startDate: { lte: new Date() }, OR: [{ endDate: null }, { endDate: { gte: new Date(`${c.today}T00:00:00+03:00`) } }] };
    if (f.projectId) iwhere.projectId = f.projectId;
    if (f.internshipId) iwhere.id = f.internshipId;
    if (supervised) iwhere.id = { in: supervised };
    if (allowedProjects) iwhere.projectId = { in: allowedProjects };

    const active = await prisma.internship.findMany({
      where: iwhere,
      take: 200,
      select: { id: true, title: true, studentId: true, student: { select: { firstName: true, lastName: true } } },
    });
    const present = new Set(rows.map((r) => r.userId as number));

    missing = active
      .filter((i) => !present.has(i.studentId))
      .map((i) => ({ userId: i.studentId, name: `${i.student?.firstName ?? ""} ${i.student?.lastName ?? ""}`.trim(), internshipId: i.id, title: i.title }));
  }

  return {
    day,
    clock: c,
    totals: {
      present: list.length,
      checkedOut: list.filter((r) => r.checkOutAt).length,
      suspect: list.filter((r) => r.status === "SUSPECT").length,
      tasks: list.reduce((n, r) => n + r.tasks.length, 0),
      missing: missing.length,
    },
    rows: list,
    missing,
  };
}

/** Journal de présence GPS + tâches du jour d'un stage : alimente la page « Suivi & Évaluation » du stagiaire. */
export async function internshipJournal(viewer: Viewer, internshipId: number, days = 60) {
  const internship = await prisma.internship.findUnique({
    where: { id: internshipId },
    select: { id: true, title: true, studentId: true, supervisorId: true, projectId: true, startDate: true, endDate: true, student: { select: { firstName: true, lastName: true } } },
  });

  if (!internship) throw new PresenceError(404, "Stage introuvable.");

  const role = String(viewer.role);
  let allowed = role === "ADMIN" || role === "DIRECTION" || role === "RH";

  if (!allowed && role === "COORDINATOR") {
    const scope = await loadScope(viewer);
    allowed = !scope.scoped || (internship.projectId !== null && scope.allowed.includes(internship.projectId));
  }
  if (!allowed && isTuteur(role)) allowed = internship.supervisorId === viewer.id;
  if (!allowed && isStagiaire(role)) allowed = internship.studentId === viewer.id;
  if (!allowed) throw new PresenceError(403, "Accès refusé : ce stage ne fait pas partie de votre périmètre.");

  const since = new Date(Date.now() - Math.min(Math.max(days, 7), 365) * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const rows: any[] = await db.dailyPresence.findMany({
    where: { userId: internship.studentId, day: { gte: since } },
    orderBy: { day: "desc" },
    take: 400,
    include: { tasks: true },
  });

  const c = clock();
  const list = rows.map(toDto);
  const suspect = list.filter((r) => r.status === "SUSPECT");
  const noExit = list.filter((r) => !r.checkOutAt && r.day < c.today);

  const alerts: Array<{ level: "warning" | "info"; message: string }> = [];
  if (suspect.length) alerts.push({ level: "warning", message: `${suspect.length} jour(s) de présence à vérifier (position, altitude ou déplacement).` });
  if (noExit.length) alerts.push({ level: "info", message: `${noExit.length} jour(s) sans pointage de départ ni tâches déclarées.` });

  return {
    internship: {
      id: internship.id,
      title: internship.title,
      studentId: internship.studentId,
      studentName: `${internship.student?.firstName ?? ""} ${internship.student?.lastName ?? ""}`.trim(),
      startDate: internship.startDate.toISOString(),
      endDate: internship.endDate ? internship.endDate.toISOString() : null,
    },
    totals: {
      daysPresent: list.length,
      daysCheckedOut: list.filter((r) => r.checkOutAt).length,
      daysSuspect: suspect.length,
      tasksLogged: list.reduce((n, r) => n + r.tasks.length, 0),
      lastDay: list[0]?.day ?? null,
    },
    alerts,
    days: list,
  };
}

/* ------------------------------ notifications (tuteur, coordinateurs, administration) ------------------------------ */

const FLAG_TEXT: Record<string, string> = {
  OUT_OF_ZONE: "hors de la zone attendue",
  ALTITUDE_MISMATCH: "altitude incohérente avec le terrain",
  LEFT_SITE: "position de départ éloignée de l'arrivée",
  VERY_SHORT_PRESENCE: "présence très courte",
};

const flagText = (f: string): string => (f.endsWith("_AT_EXIT") ? `au départ : ${FLAG_TEXT[f.replace("_AT_EXIT", "")] ?? f}` : FLAG_TEXT[f] ?? f);

const flagsText = (flags: string[]): string => flags.filter((f) => !INFO_FLAGS.includes(f)).map(flagText).join(", ");

async function personName(userId: number): Promise<string> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
  return u ? `${u.firstName} ${u.lastName}`.trim() : "Un membre";
}

/** Tuteur du stage + coordinateurs du projet concernés. */
async function overseers(internshipId: number | null, projectId: number | null): Promise<number[]> {
  const ids = new Set<number>();
  let project = projectId;

  if (internshipId) {
    const i = await prisma.internship.findUnique({ where: { id: internshipId }, select: { supervisorId: true, projectId: true } });
    if (i?.supervisorId) ids.add(i.supervisorId);
    if (!project) project = i?.projectId ?? null;
  }

  if (project) {
    const rows: Array<{ userId: number }> = await db.projectCoordinator.findMany({ where: { projectId: project }, select: { userId: true } });
    rows.forEach((r) => ids.add(r.userId));
  }

  return Array.from(ids);
}

type NotePayload = { title: string; message: string; type: "INFO" | "WARNING"; channels: "app" };

/** Prévient les responsables ; sans responsable connu et si fallback, l'administration et la direction. */
async function tell(internshipId: number | null, projectId: number | null, payload: NotePayload, exclude: number | undefined, fallback: boolean): Promise<void> {
  const ids = await overseers(internshipId, projectId);

  if (ids.length) await notifyUsers(ids, payload, exclude);
  else if (fallback) await notifyRoles(["ADMIN", "DIRECTION"], payload, exclude);
}

async function notifySuspect(user: Viewer, row: any, title: string, flags: string[]): Promise<void> {
  try {
    const name = await personName(user.id);
    await tell(row.internshipId ?? null, row.projectId ?? null, { title, message: `${name} : ${flagsText(flags)}. À vérifier dans les présences du ${row.day}.`, type: "WARNING", channels: "app" }, user.id, true);
  } catch (error) {
    logger.warn(`Notification de présence impossible : ${(error as Error).message}`);
  }
}

const rejectedToday = new Set<string>();

async function notifyRejected(user: Viewer, internship: { id: number; projectId: number | null } | null, projectId: number | null, reason: string): Promise<void> {
  try {
    const key = `${user.id}:${clock().today}`;
    if (rejectedToday.has(key)) return;
    rejectedToday.add(key);

    const name = await personName(user.id);
    await tell(internship?.id ?? null, projectId, { title: "Pointage refusé", message: `${name} : ${reason}`, type: "WARNING", channels: "app" }, user.id, true);
  } catch (error) {
    logger.warn(`Notification de pointage refusé impossible : ${(error as Error).message}`);
  }
}

async function notifyOnCheckOut(user: Viewer, row: any, tasks: number, activities: number, newlySuspect: boolean): Promise<void> {
  try {
    const name = await personName(user.id);

    // Résumé de la journée : au tuteur / coordinateurs d'un stagiaire, ou aux coordinateurs d'un projet dont l'avancement a bougé
    if (row.internshipId || activities > 0) {
      const message = row.internshipId
        ? `${name} a terminé sa journée : ${tasks} tâche(s) déclarée(s).`
        : `${name} a mis à jour l'avancement du projet (${activities} activité(s)).`;
      await tell(row.internshipId ?? null, row.projectId ?? null, { title: row.internshipId ? "Journée de stage terminée" : "Avancement du projet mis à jour", message, type: "INFO", channels: "app" }, user.id, false);
    }

    if (newlySuspect) await notifySuspect(user, row, "Départ à vérifier", Array.isArray(row.flags) ? row.flags : []);
  } catch (error) {
    logger.warn(`Notification de départ impossible : ${(error as Error).message}`);
  }
}

/* ------------------------------ rappels automatiques ------------------------------ */

async function alreadyToday(userId: number, title: string, dayStart: Date): Promise<boolean> {
  const found = await prisma.notification.findFirst({ where: { userId, title, createdAt: { gte: dayStart } }, select: { id: true } });
  return !!found;
}

/** Une personne ne reçoit chaque rappel qu'une fois par jour (même après un redémarrage). */
async function notifyOncePerDay(userIds: number[], payload: NotePayload, dayStart: Date): Promise<void> {
  const fresh: number[] = [];
  for (const id of userIds) if (!(await alreadyToday(id, payload.title, dayStart))) fresh.push(id);
  if (fresh.length) await notifyUsers(fresh, payload);
}

async function remindMissing(): Promise<void> {
  const c = clock();
  if (!c.workingDay) return;

  const dayStart = new Date(`${c.today}T00:00:00+03:00`);
  const digests = new Map<number, string[]>();
  const addDigest = (recipients: number[], name: string) => recipients.forEach((r) => digests.set(r, [...(digests.get(r) ?? []), name]));

  // 1) Dès 10h : stagiaires en cours sans pointage d'arrivée
  if (c.hour >= 10 && c.hour < CLOSE_HOUR) {
    const interns = await prisma.internship.findMany({
      where: { status: "IN_PROGRESS", startDate: { lte: new Date() }, OR: [{ endDate: null }, { endDate: { gte: dayStart } }] },
      take: 500,
      select: { id: true, studentId: true, supervisorId: true, projectId: true, student: { select: { firstName: true, lastName: true } } },
    });
    const present = new Set<number>((await db.dailyPresence.findMany({ where: { day: c.today }, select: { userId: true } })).map((r: { userId: number }) => r.userId));
    const absent = interns.filter((i) => !present.has(i.studentId));

    for (const i of absent) {
      await notifyOncePerDay([i.studentId], { title: "Pointage d'arrivée manquant", message: "Vous n'avez pas encore pointé votre arrivée aujourd'hui. Ouvrez « Présences » et cliquez sur « Pointer mon arrivée ».", type: "INFO", channels: "app" }, dayStart);
      addDigest(await overseers(i.id, i.projectId), `${i.student?.firstName ?? ""} ${i.student?.lastName ?? ""}`.trim());
    }

    for (const [recipient, names] of digests) {
      await notifyOncePerDay([recipient], { title: "Stagiaires sans pointage d'arrivée", message: `${names.length} stagiaire(s) n'ont pas pointé leur arrivée : ${names.slice(0, 8).join(", ")}${names.length > 8 ? "…" : ""}.`, type: "WARNING", channels: "app" }, dayStart);
    }
    digests.clear();
  }

  // 2) Dès 17h : arrivée pointée mais départ (et tâches du jour) non pointé
  if (c.hour >= CLOSE_HOUR && c.hour < 22) {
    const open: any[] = await db.dailyPresence.findMany({ where: { day: c.today, checkOutAt: null }, select: { userId: true, internshipId: true, projectId: true } });

    for (const p of open) {
      await notifyOncePerDay([p.userId], { title: "Départ à pointer", message: "Avant de partir, déclarez les tâches faites aujourd'hui puis cliquez sur « Pointer mon départ ».", type: "INFO", channels: "app" }, dayStart);
      addDigest(await overseers(p.internshipId ?? null, p.projectId ?? null), await personName(p.userId));
    }

    for (const [recipient, names] of digests) {
      await notifyOncePerDay([recipient], { title: "Départs non pointés", message: `${names.length} personne(s) n'ont pas pointé leur départ ni déclaré leurs tâches : ${names.slice(0, 8).join(", ")}${names.length > 8 ? "…" : ""}.`, type: "WARNING", channels: "app" }, dayStart);
    }
  }
}

/** Rappels : arrivée manquante (10h) et départ non pointé (17h), pour la personne et pour son tuteur / ses coordinateurs. */
export function startPresenceScheduler(): void {
  const run = () => void remindMissing().catch((e) => logger.warn(`Rappels de présence impossibles : ${(e as Error).message}`));
  setTimeout(run, 45_000);
  setInterval(run, 15 * 60 * 1000);
}

/* ------------------------------ fiche d'un membre : présence et tâches ------------------------------ */

/** Présences GPS + tâches du jour d'un membre (fiche membre) ; stagiaire : avec ses tâches de stage, sinon avec les activités de projet mises à jour. */
export async function userJournal(viewer: Viewer, userId: number, days = 60) {
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, firstName: true, lastName: true, role: true } });
  if (!target) throw new PresenceError(404, "Membre introuvable.");

  const role = String(viewer.role);
  let allowed = viewer.id === userId || role === "ADMIN" || role === "DIRECTION" || role === "RH";

  if (!allowed && isTuteur(role)) {
    allowed = !!(await prisma.internship.findFirst({ where: { studentId: userId, supervisorId: viewer.id }, select: { id: true } }));
  }

  if (!allowed && role === "COORDINATOR") {
    const scope = await loadScope(viewer);
    if (!scope.scoped) allowed = true;
    else {
      const viaPresence = await db.dailyPresence.findFirst({ where: { userId, projectId: { in: scope.allowed } }, select: { id: true } });
      const viaInternship = await prisma.internship.findFirst({ where: { studentId: userId, projectId: { in: scope.allowed } }, select: { id: true } });
      allowed = !!(viaPresence || viaInternship);
    }
  }

  if (!allowed) throw new PresenceError(403, "Accès refusé : ce membre ne fait pas partie de votre périmètre.");

  const since = new Date(Date.now() - Math.min(Math.max(days, 7), 365) * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const rows: any[] = await db.dailyPresence.findMany({ where: { userId, day: { gte: since } }, orderBy: { day: "desc" }, take: 400, include: { tasks: true } });

  const activityIds = Array.from(new Set(rows.flatMap((r) => (r.tasks as any[]).map((t) => t.activityId)).filter((x): x is number => !!x)));
  const projectIds = Array.from(new Set(rows.map((r) => r.projectId).filter((x): x is number => !!x)));
  const [acts, projs] = await Promise.all([
    activityIds.length ? prisma.activity.findMany({ where: { id: { in: activityIds } }, select: { id: true, title: true } }) : [],
    projectIds.length ? prisma.project.findMany({ where: { id: { in: projectIds } }, select: { id: true, name: true } }) : [],
  ]);
  const actTitle = new Map(acts.map((a) => [a.id, a.title]));
  const projName = new Map(projs.map((p) => [p.id, p.name]));

  const c = clock();
  const list = rows.map((r) => {
    const d = toDto(r);
    return { ...d, projectName: d.projectId ? projName.get(d.projectId) ?? null : null, tasks: d.tasks.map((t) => ({ ...t, activityTitle: t.activityId ? actTitle.get(t.activityId) ?? null : null })) };
  });
  const suspect = list.filter((r) => r.status === "SUSPECT");
  const noExit = list.filter((r) => !r.checkOutAt && r.day < c.today);

  const alerts: Array<{ level: "warning" | "info"; message: string }> = [];
  if (suspect.length) alerts.push({ level: "warning", message: `${suspect.length} jour(s) de présence à vérifier (position, altitude ou déplacement).` });
  if (noExit.length) alerts.push({ level: "info", message: `${noExit.length} jour(s) sans pointage de départ ni tâches déclarées.` });

  return {
    user: { id: target.id, name: `${target.firstName} ${target.lastName}`.trim(), role: String(target.role) },
    totals: {
      daysPresent: list.length,
      daysCheckedOut: list.filter((r) => r.checkOutAt).length,
      daysSuspect: suspect.length,
      tasksLogged: list.reduce((n, r) => n + r.tasks.length, 0),
      lastDay: list[0]?.day ?? null,
    },
    alerts,
    days: list,
  };
}
