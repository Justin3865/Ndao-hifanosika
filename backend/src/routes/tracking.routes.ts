import crypto from "crypto";
import { Request, Response, Router } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import { emitToTracking, recordLocation } from "../realtime/socket";
import { getReqUser } from "../utils/dataScope";
import { db } from "../utils/db";
import {
  MISSION_ROLES,
  createSurvey,
  fieldSummary,
  finishMission,
  getActiveMission,
  listAgents,
  recordMissionPosition,
  startMission,
} from "../services/field.service";

import { sendError } from "../middlewares/error.middleware";
import { missionCode } from "../utils/entityMatricule";
import { haversineKm } from "../ml/geo";
import { cleanTrack, trackDistanceKm } from "../utils/gpsTrack";
/* ===================================================================
 * SUIVI TERRAIN — position partagée par le bénéficiaire LUI-MÊME,
 * après consentement, avec possibilité d'arrêter à tout moment.
 * Seule la DERNIÈRE position est conservée (pas d'historique).
 * =================================================================== */

export const trackingRouter = Router();
export const publicTrackingRouter = Router();

/* ---------- Zones d'intervention (villes) ---------- */


const targetSelect = {
  id: true,
  firstName: true,
  lastName: true,
  age: true,
  vulnerable: true,
  latitude: true,
  longitude: true,
  locationAccuracy: true,
  lastSeenAt: true,
  trackingEnabled: true,
  trackingToken: true,
  projectId: true,
  project: { select: { id: true, name: true, createdById: true } },
} as const;

/** ADMIN / DIRECTION : tout. COORDINATOR : seulement ses projets. */
function projectScope(req: Request): Record<string, unknown> {
  const user = getReqUser(req);
  if (user?.role === "COORDINATOR") {
    return { project: { createdById: user.id } };
  }
  return {};
}

trackingRouter.use(authenticate);

/** GET /api/tracking/targets — bénéficiaires suivis (carte en direct) */
trackingRouter.get(
  "/targets",
  authorizeRoles("ADMIN", "DIRECTION", "COORDINATOR"),
  async (req: Request, res: Response) => {
    try {
      const rows = await prisma.beneficiary.findMany({
        where: { trackingToken: { not: null }, ...projectScope(req) } as never,
        select: targetSelect,
        orderBy: { lastSeenAt: "desc" },
      });

      res.json({
        success: true,
        data: rows.map((row) => ({
          id: row.id,
          firstName: row.firstName,
          lastName: row.lastName,
          age: row.age,
          vulnerable: row.vulnerable,
          latitude: row.latitude,
          longitude: row.longitude,
          locationAccuracy: row.locationAccuracy,
          lastSeenAt: row.lastSeenAt,
          trackingEnabled: row.trackingEnabled,
          project: row.project
            ? { id: row.project.id, name: row.project.name }
            : null,
        })),
      });
    } catch (error) {
      logger.error("Erreur tracking targets", error);
      sendError(res, error, "Erreur serveur");
    }
  },
);

/** GET /api/tracking/zones — zones d'intervention (table Zone) avec chiffres */
trackingRouter.get(
  "/zones",
  authorizeRoles("ADMIN", "DIRECTION", "DAF", "COMMUNICATION", "COORDINATOR"),
  async (_req: Request, res: Response) => {
    try {
      const norm = (value: string) =>
        value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

      const [zones, activities, beneficiaries] = await Promise.all([
        db.zone.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
        prisma.activity.findMany({ select: { projectId: true, location: true } }),
        prisma.beneficiary.findMany({ select: { id: true, projectId: true, zoneId: true } as never }),
      ]);

      type Row = { id: number; projectId: number; zoneId?: number | null };

      res.json({
        success: true,
        data: (zones as Array<{ id: number; name: string; latitude: number; longitude: number; radiusKm: number | null; isHeadquarters: boolean }>).map((zone) => {
          const key = norm(zone.name);
          const inZone = activities.filter((a) => norm(a.location ?? "").includes(key));
          const projectIds = new Set(inZone.map((a) => a.projectId));

          const people = new Set(
            (beneficiaries as unknown as Row[])
              .filter((b) => b.zoneId === zone.id || projectIds.has(b.projectId))
              .map((b) => b.id),
          );

          return {
            id: zone.id,
            city: zone.name,
            latitude: zone.latitude,
            longitude: zone.longitude,
            radiusKm: zone.radiusKm,
            isHeadquarters: zone.isHeadquarters,
            activities: inZone.length,
            projects: projectIds.size,
            beneficiaries: people.size,
          };
        }),
      });
    } catch (error) {
      logger.error("Erreur tracking zones", error);
      sendError(res, error, "Erreur serveur");
    }
  },
);

/** GET /api/tracking/staff — agents qui partagent leur position (mission en cours) */
trackingRouter.get(
  "/staff",
  authorizeRoles("ADMIN", "DIRECTION", "COORDINATOR"),
  async (_req: Request, res: Response) => {
    try {
      const rows = await prisma.user.findMany({
        where: { sharingLocation: true, latitude: { not: null }, longitude: { not: null } },
        select: { id: true, firstName: true, lastName: true, role: true, latitude: true, longitude: true, altitude: true, locationUpdatedAt: true },
      });

      const limit = Date.now() - 6 * 3600 * 1000;

      res.json({
        success: true,
        data: rows
          .filter((r) => r.locationUpdatedAt && r.locationUpdatedAt.getTime() > limit)
          .map((r) => ({
            id: r.id,
            name: `${r.firstName} ${r.lastName}`,
            role: r.role,
            latitude: r.latitude,
            longitude: r.longitude,
            altitude: r.altitude,
            updatedAt: r.locationUpdatedAt,
          })),
      });
    } catch (error) {
      logger.error("Erreur tracking staff", error);
      sendError(res, error, "Erreur serveur");
    }
  },
);

/** GET /api/tracking/beneficiaries/:id — état du lien d'un bénéficiaire */
trackingRouter.get(
  "/beneficiaries/:id",
  authorizeRoles("ADMIN", "DIRECTION", "COORDINATOR"),
  async (req: Request, res: Response) => {
    try {
      const row = await prisma.beneficiary.findFirst({
        where: { id: Number(req.params.id), ...projectScope(req) } as never,
        select: targetSelect,
      });

      if (!row) {
        return res.status(404).json({ success: false, message: "Bénéficiaire introuvable" });
      }

      res.json({
        success: true,
        data: {
          hasLink: !!row.trackingToken,
          path: row.trackingToken ? `/suivi/${row.trackingToken}` : null,
          trackingEnabled: row.trackingEnabled,
          lastSeenAt: row.lastSeenAt,
          latitude: row.latitude,
          longitude: row.longitude,
          age: row.age,
        },
      });
    } catch (error) {
      logger.error("Erreur tracking state", error);
      sendError(res, error, "Erreur serveur");
    }
  },
);

/** POST /api/tracking/beneficiaries/:id/link — (re)génère le lien personnel */
trackingRouter.post(
  "/beneficiaries/:id/link",
  authorizeRoles("ADMIN", "COORDINATOR"),
  async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);

      const row = await prisma.beneficiary.findFirst({
        where: { id, ...projectScope(req) } as never,
        select: { id: true },
      });

      if (!row) {
        return res.status(404).json({ success: false, message: "Bénéficiaire introuvable" });
      }

      const token = crypto.randomBytes(24).toString("hex");

      // Nouveau lien = ancien consentement et ancienne position effacés
      await prisma.beneficiary.update({
        where: { id },
        data: {
          trackingToken: token,
          trackingEnabled: false,
          consentAt: null,
          latitude: null,
          longitude: null,
          locationAccuracy: null,
          lastSeenAt: null,
        },
      });

      res.json({ success: true, data: { path: `/suivi/${token}` } });
    } catch (error) {
      logger.error("Erreur tracking link", error);
      sendError(res, error, "Erreur serveur");
    }
  },
);

/** DELETE /api/tracking/beneficiaries/:id — révoque le lien et efface la position */
trackingRouter.delete(
  "/beneficiaries/:id",
  authorizeRoles("ADMIN", "COORDINATOR"),
  async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);

      const row = await prisma.beneficiary.findFirst({
        where: { id, ...projectScope(req) } as never,
        select: { id: true },
      });

      if (!row) {
        return res.status(404).json({ success: false, message: "Bénéficiaire introuvable" });
      }

      await prisma.beneficiary.update({
        where: { id },
        data: {
          trackingToken: null,
          trackingEnabled: false,
          consentAt: null,
          latitude: null,
          longitude: null,
          locationAccuracy: null,
          lastSeenAt: null,
        },
      });

      emitToTracking("target:offline", { id });
      res.json({ success: true, message: "Suivi révoqué" });
    } catch (error) {
      logger.error("Erreur tracking revoke", error);
      sendError(res, error, "Erreur serveur");
    }
  },
);

/* ===================================================================
 * AGENTS EN MISSION : liste, synthèse, historique (administration)
 * =================================================================== */

const ADMIN_VIEW = ["ADMIN", "DIRECTION", "COORDINATOR"] as const;

/** GET /api/tracking/agents — tous les agents : en ligne / hors ligne / en mission + dernière position */
trackingRouter.get("/agents", authorizeRoles(...ADMIN_VIEW), async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await listAgents() });
  } catch (error) {
    logger.error("Erreur tracking agents", error);
    sendError(res, error, "Erreur serveur");
  }
});

/** GET /api/tracking/summary — chiffres clés du suivi terrain */
trackingRouter.get("/summary", authorizeRoles(...ADMIN_VIEW), async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await fieldSummary() });
  } catch (error) {
    logger.error("Erreur tracking summary", error);
    sendError(res, error, "Erreur serveur");
  }
});

/** GET /api/tracking/missions?agentId=&from= — historique des missions (90 jours) */
trackingRouter.get("/missions", authorizeRoles(...ADMIN_VIEW), async (req: Request, res: Response) => {
  try {
    const agentId = req.query.agentId ? Number(req.query.agentId) : undefined;
    const fromParam = req.query.from ? new Date(String(req.query.from)) : null;
    const floor = new Date(Date.now() - 90 * 24 * 3600 * 1000);
    const from = fromParam && !Number.isNaN(fromParam.getTime()) && fromParam > floor ? fromParam : floor;

    const rows = await prisma.mission.findMany({
      where: { startedAt: { gte: from }, ...(agentId ? { agentId } : {}) },
      orderBy: { startedAt: "desc" },
      take: 200,
      include: {
        agent: { select: { id: true, firstName: true, lastName: true, agentMatricule: true } },
        _count: { select: { points: true, surveys: true } },
      },
    });

    res.json({
      success: true,
      data: rows.map((m) => ({
        id: m.id,
        code: m.code,
        agent: { id: m.agent.id, name: `${m.agent.firstName} ${m.agent.lastName}`, matricule: m.agent.agentMatricule ?? null },
        startedAt: m.startedAt,
        endedAt: m.endedAt,
        distanceKm: Math.round(m.distanceKm * 10) / 10,
        pointsCount: m._count.points,
        surveysCount: m._count.surveys,
      })),
    });
  } catch (error) {
    logger.error("Erreur tracking missions", error);
    sendError(res, error, "Erreur serveur");
  }
});

/**
 * Enquêtes d'une mission avec matricule, début / fin, durée et anomalies repérées :
 * durée très courte ou trop longue, hors de la période de la mission, position éloignée du trajet, même ménage enquêté plusieurs fois.
 */
function describeSurveys(mission: any) {
  const surveys: any[] = mission.surveys ?? [];
  const points: Array<{ latitude: number; longitude: number }> = mission.points ?? [];
  const perBeneficiary = new Map<number, number>();
  surveys.forEach((sv) => perBeneficiary.set(sv.beneficiaryId, (perBeneficiary.get(sv.beneficiaryId) ?? 0) + 1));

  return surveys.map((sv) => {
    const end: Date = sv.endedAt ?? sv.createdAt;
    const start: Date | null = sv.startedAt ?? null;
    const durationSec = start ? Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000)) : null;
    const anomalies: string[] = [];

    if (durationSec !== null) {
      if (durationSec < 60) anomalies.push("Durée très courte (moins d'1 min)");
      if (durationSec > 3 * 3600) anomalies.push("Durée anormalement longue (plus de 3 h)");
    }

    if ((start && start.getTime() < mission.startedAt.getTime()) || (mission.endedAt && end.getTime() > mission.endedAt.getTime())) {
      anomalies.push("Hors de la période de la mission");
    }

    if (sv.latitude !== null && sv.longitude !== null && points.length) {
      let nearest = Infinity;
      for (const p of points) nearest = Math.min(nearest, haversineKm(sv.latitude, sv.longitude, p.latitude, p.longitude));
      if (nearest > 0.3) anomalies.push(`Position à ${nearest.toFixed(1)} km du trajet`);
    }

    if ((perBeneficiary.get(sv.beneficiaryId) ?? 0) > 1) anomalies.push("Même ménage enquêté plusieurs fois dans cette mission");

    return {
      id: sv.id,
      code: sv.code ?? null,
      beneficiaryName: `${sv.beneficiary.firstName} ${sv.beneficiary.lastName}`,
      beneficiaryMatricule: sv.beneficiary.matricule ?? null,
      latitude: sv.latitude,
      longitude: sv.longitude,
      vulnerable: sv.vulnerable,
      startedAt: start,
      endedAt: end,
      durationSec,
      anomalies,
      createdAt: sv.createdAt,
    };
  });
}

/** POST /api/tracking/missions/renumber (ADMIN) — remet les matricules de mission en ordre (0001, 0002…) */
trackingRouter.post("/missions/renumber", authorizeRoles("ADMIN"), async (_req: Request, res: Response) => {
  try {
    const count = await missionCode.renumber();
    res.json({ success: true, message: `${count} matricule(s) de mission remis en ordre.`, data: { count } });
  } catch (error) {
    logger.error("Erreur remise en ordre des matricules de mission", error);
    sendError(res, error, "Impossible de remettre les matricules en ordre");
  }
});

/** GET /api/tracking/missions/:id — trajet + enquêtes réalisées en chemin */
trackingRouter.get("/missions/:id", authorizeRoles(...ADMIN_VIEW), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const mission = await prisma.mission.findUnique({
      where: { id },
      include: {
        agent: { select: { firstName: true, lastName: true, agentMatricule: true } },
        points: { orderBy: { createdAt: "asc" }, take: 5000 },
        surveys: {
          orderBy: { createdAt: "asc" },
          include: { beneficiary: { select: { firstName: true, lastName: true, matricule: true } } },
        },
      },
    });

    if (!mission) return res.status(404).json({ success: false, message: "Mission introuvable" });

    // Tracé nettoyé (sans points imprécis ni sauts GPS) : la carte, la distance et les anomalies s'appuient dessus
    const track = cleanTrack(mission.points);
    const distanceKm = track.length >= 2 ? trackDistanceKm(track) : mission.distanceKm;

    // Mission terminée : on corrige la distance enregistrée pour que la liste et le détail affichent la même valeur
    if (mission.endedAt && Math.abs(distanceKm - mission.distanceKm) > 0.005) {
      await prisma.mission.update({ where: { id: mission.id }, data: { distanceKm } }).catch(() => undefined);
    }

    res.json({
      success: true,
      data: {
        mission: {
          id: mission.id,
          code: mission.code,
          agentName: `${mission.agent.firstName} ${mission.agent.lastName}`,
          agentMatricule: mission.agent.agentMatricule ?? null,
          startedAt: mission.startedAt,
          endedAt: mission.endedAt,
          distanceKm: Math.round(distanceKm * 100) / 100,
          pointsKept: track.length,
          pointsIgnored: mission.points.length - track.length,
        },
        points: track.map((p) => ({
          latitude: p.latitude,
          longitude: p.longitude,
          altitude: p.altitude,
          createdAt: p.createdAt,
        })),
        surveys: describeSurveys({ ...mission, points: track }),
      },
    });
  } catch (error) {
    logger.error("Erreur tracking mission détail", error);
    sendError(res, error, "Erreur serveur");
  }
});

/** GET /api/tracking/agents/:id/surveys — TOUTES les enquêtes d'un agent, avec les réponses complètes */
trackingRouter.get("/agents/:id/surveys", authorizeRoles(...ADMIN_VIEW), async (req: Request, res: Response) => {
  try {
    const agentId = Number(req.params.id);

    if (!Number.isInteger(agentId) || agentId <= 0) {
      return res.status(400).json({ success: false, message: "Agent invalide" });
    }

    const rows = await prisma.survey.findMany({
      where: { agentId },
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        beneficiary: {
          select: { id: true, firstName: true, lastName: true, locality: true, project: { select: { name: true } } },
        },
      },
    });

    res.json({
      success: true,
      data: rows.map((sv) => ({
        id: sv.id,
        beneficiaryId: sv.beneficiaryId,
        beneficiaryName: `${sv.beneficiary.firstName} ${sv.beneficiary.lastName}`,
        projectName: sv.beneficiary.project?.name ?? null,
        locality: sv.beneficiary.locality,
        missionId: sv.missionId,
        latitude: sv.latitude,
        longitude: sv.longitude,
        altitude: sv.altitude,
        householdSize: sv.householdSize,
        monthlyIncome: sv.monthlyIncome,
        childrenUnder5: sv.childrenUnder5,
        outOfSchoolChildren: sv.outOfSchoolChildren,
        mealsPerDay: sv.mealsPerDay,
        hasDisability: sv.hasDisability,
        healthIssues: sv.healthIssues,
        waterAccess: sv.waterAccess,
        electricityAccess: sv.electricityAccess,
        housingType: sv.housingType,
        vulnerable: sv.vulnerable,
        notes: sv.notes,
        createdAt: sv.createdAt,
      })),
    });
  } catch (error) {
    logger.error("Erreur tracking enquêtes agent", error);
    sendError(res, error, "Erreur serveur");
  }
});

/* ===================================================================
 * MA MISSION (agent) : démarrer / terminer / envoyer sa position / enquêtes
 * =================================================================== */

const MISSION_ACCESS = authorizeRoles(...MISSION_ROLES);

/** GET /api/tracking/my-mission — mission en cours (reprise après changement de page ou rechargement) */
trackingRouter.get("/my-mission", MISSION_ACCESS, async (req: Request, res: Response) => {
  try {
    const mission = await getActiveMission(getReqUser(req)!.id);
    res.json({
      success: true,
      data: { active: !!mission, missionId: mission?.id ?? null, startedAt: mission?.startedAt ?? null },
    });
  } catch (error) {
    logger.error("Erreur my-mission", error);
    sendError(res, error, "Erreur serveur");
  }
});

trackingRouter.post("/my-mission/start", MISSION_ACCESS, async (req: Request, res: Response) => {
  try {
    const mission = await startMission(getReqUser(req)!.id);
    res.json({ success: true, data: { active: true, missionId: mission.id, startedAt: mission.startedAt } });
  } catch (error) {
    logger.error("Erreur start mission", error);
    sendError(res, error, "Erreur serveur");
  }
});

/** Seule action qui termine une mission : le bouton « Terminer la mission » */
trackingRouter.post("/my-mission/finish", MISSION_ACCESS, async (req: Request, res: Response) => {
  try {
    await finishMission(getReqUser(req)!.id, "agent");
    res.json({ success: true, data: { active: false } });
  } catch (error) {
    logger.error("Erreur finish mission", error);
    sendError(res, error, "Erreur serveur");
  }
});

/** Repli HTTP si le WebSocket est indisponible */
trackingRouter.post("/my-mission/location", MISSION_ACCESS, async (req: Request, res: Response) => {
  try {
    const result = await recordMissionPosition(getReqUser(req)!.id, req.body ?? {});
    res.status(result.ok ? 200 : 400).json({ success: result.ok });
  } catch (error) {
    logger.error("Erreur position mission", error);
    sendError(res, error, "Erreur serveur");
  }
});

/** GET /api/tracking/survey-targets?q= — ménages à enquêter (champs minimaux) */
trackingRouter.get("/survey-targets", MISSION_ACCESS, async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q ?? "").trim();

    const rows = await prisma.beneficiary.findMany({
      where: q
        ? { OR: [{ firstName: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }, { matricule: { contains: q, mode: "insensitive" } }] }
        : undefined,
      select: { id: true, firstName: true, lastName: true, matricule: true, project: { select: { name: true } } },
      orderBy: { lastName: "asc" },
      take: 25,
    });

    const surveyed = await prisma.survey.findMany({
      where: { beneficiaryId: { in: rows.map((r) => r.id) } },
      select: { beneficiaryId: true },
      distinct: ["beneficiaryId"],
    });
    const done = new Set(surveyed.map((x) => x.beneficiaryId));

    res.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        name: `${r.firstName} ${r.lastName}`,
        matricule: r.matricule ?? null,
        projectName: r.project?.name ?? null,
        surveyed: done.has(r.id),
      })),
    });
  } catch (error) {
    logger.error("Erreur survey-targets", error);
    sendError(res, error, "Erreur serveur");
  }
});

/** POST /api/tracking/surveys — enquête ménage (uniquement pendant une mission) */
trackingRouter.post("/surveys", MISSION_ACCESS, async (req: Request, res: Response) => {
  try {
    const result = await createSurvey(getReqUser(req)!.id, req.body ?? {});

    if (!result.ok) return res.status(result.status).json({ success: false, message: result.message });

    res.status(201).json({ success: true, data: { id: result.data.id } });
  } catch (error) {
    logger.error("Erreur création enquête", error);
    sendError(res, error, "Erreur serveur");
  }
});

/* ===================================================================
 * ROUTES PUBLIQUES (sans compte) — authentifiées par le jeton du lien
 * =================================================================== */

async function findByToken(token: string) {
  if (!token || token.length < 20) return null;

  return prisma.beneficiary.findFirst({
    where: { trackingToken: token },
    select: {
      id: true,
      firstName: true,
      age: true,
      trackingEnabled: true,
      consentAt: true,
      project: { select: { name: true } },
    },
  });
}

publicTrackingRouter.get("/:token", async (req: Request, res: Response) => {
  try {
    const row = await findByToken(String(req.params.token));

    if (!row) {
      return res.status(404).json({ success: false, message: "Lien invalide ou expiré" });
    }

    res.json({
      success: true,
      data: {
        firstName: row.firstName,
        isMinor: row.age !== null && row.age < 18,
        projectName: row.project?.name ?? null,
        sharing: row.trackingEnabled && !!row.consentAt,
      },
    });
  } catch (error) {
    logger.error("Erreur public tracking", error);
    sendError(res, error, "Erreur serveur");
  }
});

/** Consentement explicite (+ accord du parent/tuteur pour un mineur) */
publicTrackingRouter.post("/:token/consent", async (req: Request, res: Response) => {
  try {
    const row = await findByToken(String(req.params.token));

    if (!row) {
      return res.status(404).json({ success: false, message: "Lien invalide ou expiré" });
    }

    const isMinor = row.age !== null && row.age < 18;

    if (isMinor && req.body?.guardianConfirmed !== true) {
      return res.status(400).json({
        success: false,
        message: "L'accord d'un parent ou tuteur est obligatoire pour un mineur.",
      });
    }

    await prisma.beneficiary.update({
      where: { id: row.id },
      data: { trackingEnabled: true, consentAt: new Date() },
    });

    res.json({ success: true });
  } catch (error) {
    logger.error("Erreur consentement tracking", error);
    sendError(res, error, "Erreur serveur");
  }
});

/** Envoi de position (repli HTTP si le WebSocket n'est pas disponible) */
publicTrackingRouter.post("/:token/location", async (req: Request, res: Response) => {
  try {
    const result = await recordLocation(
      String(req.params.token),
      Number(req.body?.latitude),
      Number(req.body?.longitude),
      req.body?.accuracy !== undefined ? Number(req.body.accuracy) : undefined,
    );

    res.status(result.ok ? 200 : 400).json({ success: result.ok, reason: result.reason });
  } catch (error) {
    logger.error("Erreur public location", error);
    sendError(res, error, "Erreur serveur");
  }
});

/** Arrêt du partage : la position est effacée immédiatement */
publicTrackingRouter.post("/:token/stop", async (req: Request, res: Response) => {
  try {
    const row = await findByToken(String(req.params.token));

    if (!row) {
      return res.status(404).json({ success: false, message: "Lien invalide ou expiré" });
    }

    await prisma.beneficiary.update({
      where: { id: row.id },
      data: {
        trackingEnabled: false,
        consentAt: null,
        latitude: null,
        longitude: null,
        locationAccuracy: null,
        lastSeenAt: null,
      },
    });

    emitToTracking("target:offline", { id: row.id });
    res.json({ success: true });
  } catch (error) {
    logger.error("Erreur stop tracking", error);
    sendError(res, error, "Erreur serveur");
  }
});