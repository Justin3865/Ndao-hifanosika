import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { haversineKm } from "../ml/geo";
import { retrainSoon, scoreHouseholds } from "../ml/vulnerability";
import { emitToTracking, emitToUser } from "../realtime/socket";
import { isOnline } from "../realtime/presence";
import { db } from "../utils/db";
import { lookupElevation } from "../controllers/elevation.controller";

/* ===================================================================
 * Missions terrain, positions GPS des agents et enquêtes ménages
 * =================================================================== */

/** Rôles autorisés à partir en mission (tout le personnel sauf stagiaires). */
export const MISSION_ROLES = [
  "ADMIN", "DIRECTION", "DSI", "DAF", "RH", "COMMUNICATION", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2",
];

/** Rôles listés comme « agents de terrain » (surchargeable : FIELD_AGENT_ROLES=A,B,C). */
const envRoles = (process.env.FIELD_AGENT_ROLES ?? "").split(",").map((r) => r.trim()).filter(Boolean);

export const AGENT_ROLES: string[] = envRoles.length
  ? envRoles
  : MISSION_ROLES.filter((r) => r !== "ADMIN" && r !== "DIRECTION");

/** Au-delà de ce délai sans position, une mission oubliée est clôturée automatiquement. */
const STALE_MISSION_MS = 12 * 3600 * 1000;
/** Conservation de l'historique des trajets. */
export const HISTORY_DAYS = 90;

const lastStored = new Map<number, { lat: number; lng: number; at: number }>();
const altitudeCache = new Map<number, { lat: number; lng: number; altitude: number }>();

/**
 * Beaucoup d'appareils ne fournissent pas l'altitude GPS : on la complète avec un service
 * d'altitude (réutilisée tant que l'agent reste dans un rayon de 200 m, pour ne pas surcharger).
 */
async function altitudeFor(userId: number, lat: number, lng: number): Promise<number | null> {
  const cached = altitudeCache.get(userId);
  if (cached && haversineKm(cached.lat, cached.lng, lat, lng) * 1000 < 200) return cached.altitude;

  try {
    const result = await Promise.race([
      lookupElevation(lat, lng),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
    ]);

    if (result && Number.isFinite(result.elevation)) {
      altitudeCache.set(userId, { lat, lng, altitude: Math.round(result.elevation) });
      return Math.round(result.elevation);
    }
  } catch {
    /* altitude facultative */
  }

  return cached?.altitude ?? null;
}

export interface PositionInput {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number | null;
  heading?: number | null;
}

export function validCoords(lat: unknown, lng: unknown): boolean {
  const a = Number(lat);
  const b = Number(lng);
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a) <= 90 && Math.abs(b) <= 180 && !(a === 0 && b === 0);
}

const num = (v: unknown): number | null => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/* ------------------------------ Missions ------------------------------ */

export async function getActiveMission(userId: number) {
  return prisma.mission.findFirst({ where: { agentId: userId, endedAt: null }, orderBy: { startedAt: "desc" } });
}

export async function startMission(userId: number) {
  const active = await getActiveMission(userId);

  if (active) {
    const last = await prisma.missionPoint.findFirst({
      where: { missionId: active.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    const lastActivity = (last?.createdAt ?? active.startedAt).getTime();

    // Mission oubliée depuis longtemps : on la clôture et on en ouvre une nouvelle
    if (Date.now() - lastActivity > STALE_MISSION_MS) {
      await finishMission(userId, "auto");
    } else {
      await prisma.user.update({ where: { id: userId }, data: { sharingLocation: true } });
      return active;
    }
  }

  const mission = await prisma.mission.create({ data: { agentId: userId } });
  await prisma.user.update({ where: { id: userId }, data: { sharingLocation: true } });
  emitToUser(userId, "mission:state", { active: true, missionId: mission.id, startedAt: mission.startedAt });
  emitToTracking("mission:started", { id: userId, missionId: mission.id });
  return mission;
}

export async function finishMission(userId: number, reason: "agent" | "auto" = "agent") {
  const active = await getActiveMission(userId);

  if (active) {
    await prisma.mission.update({ where: { id: active.id }, data: { endedAt: new Date(), endReason: reason } });
    lastStored.delete(active.id);
  }

  await prisma.user
    .update({
      where: { id: userId },
      data: { sharingLocation: false, latitude: null, longitude: null, altitude: null },
    })
    .catch(() => undefined);

  emitToUser(userId, "mission:state", { active: false });
  emitToTracking("staff:offline", { id: userId });
  return active;
}

export async function recordMissionPosition(userId: number, p: PositionInput) {
  if (!validCoords(p.latitude, p.longitude)) return { ok: false as const, reason: "coordonnees_invalides" };

  const mission = (await getActiveMission(userId)) ?? (await startMission(userId));
  const latitude = Number(p.latitude);
  const longitude = Number(p.longitude);
  const altitude = num(p.altitude) ?? (await altitudeFor(userId, latitude, longitude));
  const accuracy = num(p.accuracy);
  const heading = num(p.heading);
  const now = Date.now();

  // On ne stocke un point d'historique que s'il apporte quelque chose (≥ 15 m ou ≥ 60 s)
  const prev = lastStored.get(mission.id);
  const moved = prev ? haversineKm(prev.lat, prev.lng, latitude, longitude) * 1000 : Infinity;

  if (!prev || moved >= 15 || now - prev.at >= 60_000) {
    await prisma.missionPoint.create({
      data: { missionId: mission.id, latitude, longitude, altitude, accuracy, heading },
    });

    // Un saut de plus de 5 km entre deux points = signal GPS aberrant, non compté dans la distance
    if (prev && moved >= 15 && moved < 5000) {
      await prisma.mission.update({ where: { id: mission.id }, data: { distanceKm: { increment: moved / 1000 } } });
    }

    lastStored.set(mission.id, { lat: latitude, lng: longitude, at: now });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { latitude, longitude, altitude, locationUpdatedAt: new Date(now), sharingLocation: true },
    select: { id: true, firstName: true, lastName: true, role: true },
  });

  emitToTracking("staff:location", {
    id: user.id,
    name: `${user.firstName} ${user.lastName}`,
    role: user.role,
    latitude,
    longitude,
    altitude,
    accuracy,
    heading,
    missionId: mission.id,
    updatedAt: new Date(now).toISOString(),
  });

  return { ok: true as const, missionId: mission.id };
}

/** Supprime les points de trajet de plus de 90 jours et clôture les missions oubliées. */
export async function housekeeping() {
  const limit = new Date(Date.now() - HISTORY_DAYS * 24 * 3600 * 1000);
  await prisma.missionPoint.deleteMany({ where: { createdAt: { lt: limit } } });

  const open = await prisma.mission.findMany({ where: { endedAt: null }, select: { id: true, agentId: true, startedAt: true } });

  for (const m of open) {
    const last = await prisma.missionPoint.findFirst({
      where: { missionId: m.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    if (Date.now() - (last?.createdAt ?? m.startedAt).getTime() > STALE_MISSION_MS) {
      logger.info(`Mission #${m.id} clôturée automatiquement (aucun signal depuis 12 h)`);
      await finishMission(m.agentId, "auto");
    }
  }
}

/* ------------------------------ Siège ONG ------------------------------ */

export async function getHqInfo() {
  const hq = (await db.zone.findFirst({ where: { isHeadquarters: true, isActive: true } })) as {
    name: string; address: string | null; latitude: number; longitude: number;
  } | null;

  if (hq) return { name: hq.name, address: hq.address, latitude: hq.latitude, longitude: hq.longitude };

  const lat = Number(process.env.ORG_LAT);
  const lng = Number(process.env.ORG_LNG);

  return process.env.ORG_LAT && process.env.ORG_LNG && validCoords(lat, lng)
    ? { name: "Siège de l'ONG", address: null, latitude: lat, longitude: lng }
    : null;
}

/* ------------------------------ Agents ------------------------------ */

export type AgentStatusKey = "MISSION" | "ONLINE" | "OFFLINE";

export async function listAgents() {
  const [hq, active, surveyTotals, today] = await Promise.all([
    getHqInfo(),
    prisma.mission.findMany({ where: { endedAt: null }, select: { id: true, agentId: true, startedAt: true } }),
    prisma.survey.groupBy({ by: ["agentId"], _count: { _all: true } }),
    prisma.survey.groupBy({
      by: ["agentId"],
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      _count: { _all: true },
    }),
  ]);

  const activeByAgent = new Map(active.map((m) => [m.agentId, m]));

  const users = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      OR: [{ role: { in: AGENT_ROLES as never[] } }, { id: { in: active.map((m) => m.agentId) } }],
    },
    select: {
      id: true, firstName: true, lastName: true, role: true, phone: true,
      latitude: true, longitude: true, altitude: true, locationUpdatedAt: true,
      department: { select: { name: true } },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  const totals = new Map(surveyTotals.map((s) => [s.agentId, s._count._all]));
  const todays = new Map(today.map((s) => [s.agentId, s._count._all]));

  return users.map((u) => {
    const mission = activeByAgent.get(u.id) ?? null;
    const online = isOnline(u.id);
    const status: AgentStatusKey = mission ? "MISSION" : online ? "ONLINE" : "OFFLINE";
    const hasPosition = u.latitude !== null && u.longitude !== null;

    return {
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      role: u.role,
      phone: u.phone,
      department: u.department?.name ?? null,
      status,
      online,
      latitude: hasPosition ? u.latitude : null,
      longitude: hasPosition ? u.longitude : null,
      altitude: hasPosition ? u.altitude : null,
      updatedAt: u.locationUpdatedAt,
      missionId: mission?.id ?? null,
      missionStartedAt: mission?.startedAt ?? null,
      distanceToHqKm:
        hq && hasPosition
          ? Math.round(haversineKm(hq.latitude, hq.longitude, u.latitude as number, u.longitude as number) * 10) / 10
          : null,
      surveysToday: todays.get(u.id) ?? 0,
      surveysTotal: totals.get(u.id) ?? 0,
      extra: !AGENT_ROLES.includes(u.role),
    };
  });
}

export async function fieldSummary() {
  const [agents, hq, households, surveysTotal] = await Promise.all([
    listAgents(),
    getHqInfo(),
    scoreHouseholds(),
    prisma.survey.count(),
  ]);

  const surveyed = households.filter((h) => h.surveyed);

  return {
    agentsTotal: agents.length,
    agentsOnline: agents.filter((a) => a.online).length,
    agentsOnMission: agents.filter((a) => a.status === "MISSION").length,
    /** Somme des ménages enquêtés par l'ensemble des agents */
    surveyedHouseholds: surveyed.length,
    surveysTotal,
    /** Ménages enquêtés par les agents en mission dont le score est ≥ 70 */
    priorityHouseholds: surveyed.filter((h) => h.score >= 70).length,
    priorityToSurvey: households.filter((h) => !h.surveyed && h.score >= 70).length,
    method: households[0]?.method ?? "HEURISTIQUE",
    hq,
  };
}

/* ------------------------------ Enquêtes ------------------------------ */

export interface SurveyInput {
  beneficiaryId: number;
  latitude?: number | null;
  longitude?: number | null;
  altitude?: number | null;
  householdSize?: number | null;
  monthlyIncome?: number | null;
  childrenUnder5?: number | null;
  outOfSchoolChildren?: number | null;
  mealsPerDay?: number | null;
  hasDisability?: boolean;
  healthIssues?: boolean | null;
  waterAccess?: boolean | null;
  electricityAccess?: boolean | null;
  housingType?: string | null;
  vulnerable?: boolean;
  notes?: string | null;
}

const int = (v: unknown, max = 1000): number | null => {
  const n = num(v);
  return n === null || n < 0 || n > max ? null : Math.round(n);
};

const bool = (v: unknown): boolean | null => (v === true || v === "true" ? true : v === false || v === "false" ? false : null);

export async function createSurvey(userId: number, body: SurveyInput) {
  const mission = await getActiveMission(userId);

  if (!mission) {
    return { ok: false as const, status: 409, message: "Démarrez votre mission avant de réaliser une enquête." };
  }

  const beneficiary = await prisma.beneficiary.findUnique({
    where: { id: Number(body.beneficiaryId) },
    select: { id: true, firstName: true, lastName: true },
  });

  if (!beneficiary) return { ok: false as const, status: 404, message: "Bénéficiaire introuvable" };

  const agent = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true, latitude: true, longitude: true, altitude: true },
  });

  // Position du ménage = position GPS de l'agent au moment de l'enquête
  const useBody = validCoords(body.latitude, body.longitude);
  const latitude = useBody ? Number(body.latitude) : agent?.latitude ?? null;
  const longitude = useBody ? Number(body.longitude) : agent?.longitude ?? null;
  const altitude = useBody ? num(body.altitude) ?? agent?.altitude ?? null : agent?.altitude ?? null;

  if (latitude === null || longitude === null) {
    return { ok: false as const, status: 409, message: "Position GPS indisponible : attendez le signal GPS puis réessayez." };
  }

  const data = {
    beneficiaryId: beneficiary.id,
    agentId: userId,
    missionId: mission.id,
    latitude,
    longitude,
    altitude,
    householdSize: int(body.householdSize, 100),
    monthlyIncome: num(body.monthlyIncome) !== null && Number(body.monthlyIncome) >= 0 ? Number(body.monthlyIncome) : null,
    childrenUnder5: int(body.childrenUnder5, 50),
    outOfSchoolChildren: int(body.outOfSchoolChildren, 50),
    mealsPerDay: int(body.mealsPerDay, 10),
    hasDisability: body.hasDisability === true,
    healthIssues: bool(body.healthIssues),
    waterAccess: bool(body.waterAccess),
    electricityAccess: bool(body.electricityAccess),
    housingType: body.housingType ? String(body.housingType).slice(0, 60) : null,
    vulnerable: body.vulnerable === true,
    notes: body.notes ? String(body.notes).slice(0, 1000) : null,
  };

  const survey = await prisma.survey.create({ data });

  // Le dossier du bénéficiaire reprend les données relevées sur place
  await db.beneficiary.update({
    where: { id: beneficiary.id },
    data: {
      homeLatitude: latitude,
      homeLongitude: longitude,
      homeAltitude: altitude,
      householdSize: data.householdSize,
      monthlyIncome: data.monthlyIncome,
      childrenUnder5: data.childrenUnder5,
      hasDisability: data.hasDisability,
      vulnerable: data.vulnerable,
    },
  });

  emitToTracking("survey:new", {
    id: survey.id,
    beneficiaryId: beneficiary.id,
    beneficiaryName: `${beneficiary.firstName} ${beneficiary.lastName}`,
    agentId: userId,
    agentName: `${agent?.firstName ?? ""} ${agent?.lastName ?? ""}`.trim(),
  });

  // Les nouvelles enquêtes enrichissent le modèle (réentraînement groupé)
  retrainSoon();

  return { ok: true as const, data: survey };
}
