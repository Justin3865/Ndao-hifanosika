import crypto from "crypto";
import { Request, Response, Router } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import { emitToTracking, recordLocation } from "../realtime/socket";
import { getReqUser } from "../utils/dataScope";
import { db } from "../utils/db";

import { sendError } from "../middlewares/error.middleware";
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
