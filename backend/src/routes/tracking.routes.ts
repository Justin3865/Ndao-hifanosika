import crypto from "crypto";
import { Request, Response, Router } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import { emitToTracking, recordLocation } from "../realtime/socket";
import { getReqUser } from "../utils/dataScope";

/* ===================================================================
 * SUIVI TERRAIN — position partagée par le bénéficiaire LUI-MÊME,
 * après consentement, avec possibilité d'arrêter à tout moment.
 * Seule la DERNIÈRE position est conservée (pas d'historique).
 * =================================================================== */

export const trackingRouter = Router();
export const publicTrackingRouter = Router();

/* ---------- Zones d'intervention (villes) ---------- */

const CITIES: Record<string, { latitude: number; longitude: number }> = {
  antananarivo: { latitude: -18.8792, longitude: 47.5079 },
  fianarantsoa: { latitude: -21.4536, longitude: 47.0857 },
  toamasina: { latitude: -18.1443, longitude: 49.3958 },
  mahajanga: { latitude: -15.7167, longitude: 46.3167 },
  toliara: { latitude: -23.35, longitude: 43.6667 },
  antsiranana: { latitude: -12.2787, longitude: 49.2917 },
  antsirabe: { latitude: -19.8659, longitude: 47.0333 },
};

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
      res.status(500).json({ success: false, message: "Erreur serveur" });
    }
  },
);

/** GET /api/tracking/zones — répartition par ville (dashboard) */
trackingRouter.get(
  "/zones",
  authorizeRoles("ADMIN", "DIRECTION", "DAF", "COMMUNICATION", "COORDINATOR"),
  async (_req: Request, res: Response) => {
    try {
      const [activities, beneficiaries] = await Promise.all([
        prisma.activity.findMany({
          select: { projectId: true, location: true },
        }),
        prisma.beneficiary.groupBy({
          by: ["projectId"],
          _count: { _all: true },
        }),
      ]);

      const perProject = new Map(
        beneficiaries.map((row) => [row.projectId, row._count._all]),
      );

      const zones = new Map<
        string,
        { activities: number; projects: Set<number> }
      >();

      for (const activity of activities) {
        const city = Object.keys(CITIES).find((name) =>
          (activity.location ?? "").toLowerCase().includes(name),
        );
        if (!city) continue;

        const zone = zones.get(city) ?? { activities: 0, projects: new Set() };
        zone.activities += 1;
        zone.projects.add(activity.projectId);
        zones.set(city, zone);
      }

      res.json({
        success: true,
        data: Array.from(zones.entries()).map(([city, zone]) => ({
          city: city.charAt(0).toUpperCase() + city.slice(1),
          ...CITIES[city],
          activities: zone.activities,
          projects: zone.projects.size,
          beneficiaries: Array.from(zone.projects).reduce(
            (sum, id) => sum + (perProject.get(id) ?? 0),
            0,
          ),
        })),
      });
    } catch (error) {
      logger.error("Erreur tracking zones", error);
      res.status(500).json({ success: false, message: "Erreur serveur" });
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
      res.status(500).json({ success: false, message: "Erreur serveur" });
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
      res.status(500).json({ success: false, message: "Erreur serveur" });
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
      res.status(500).json({ success: false, message: "Erreur serveur" });
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
    res.status(500).json({ success: false, message: "Erreur serveur" });
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
    res.status(500).json({ success: false, message: "Erreur serveur" });
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
    res.status(500).json({ success: false, message: "Erreur serveur" });
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
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});
