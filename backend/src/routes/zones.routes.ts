import { Request, Response, Router } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import { db } from "../utils/db";

import { sendError } from "../middlewares/error.middleware";
/* Zones d'intervention (et siège) — gérées par ADMIN / DIRECTION. */

const router = Router();
export const publicOrganizationRouter = Router();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

const num = (value: unknown) => (value === "" || value === null || value === undefined ? null : Number(value));
const text = (value: unknown) => (value ? String(value).trim() : null);

function toData(body: Json) {
  return {
    name: String(body.name ?? "").trim(),
    region: text(body.region),
    latitude: num(body.latitude),
    longitude: num(body.longitude),
    radiusKm: num(body.radiusKm),
    address: text(body.address),
    phone: text(body.phone),
    email: text(body.email),
    isHeadquarters: Boolean(body.isHeadquarters),
    isActive: body.isActive === undefined ? true : Boolean(body.isActive),
  };
}

function validate(data: ReturnType<typeof toData>): string | null {
  if (!data.name) return "Le nom est obligatoire";
  if (data.latitude === null || !Number.isFinite(data.latitude) || Math.abs(data.latitude) > 90) return "Latitude invalide (-90 à 90)";
  if (data.longitude === null || !Number.isFinite(data.longitude) || Math.abs(data.longitude) > 180) return "Longitude invalide (-180 à 180)";
  return null;
}

/** Un seul siège : on retire l'ancien quand un nouveau est défini. */
async function enforceSingleHq(id: number) {
  await db.zone.updateMany({ where: { isHeadquarters: true, id: { not: id } }, data: { isHeadquarters: false } });
}

router.use(authenticate);

router.get("/", authorizeRoles("ADMIN", "DIRECTION", "COORDINATOR", "DAF", "COMMUNICATION"), async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await db.zone.findMany({ orderBy: { name: "asc" } }) });
  } catch (error) {
    logger.error("Erreur liste zones", error);
    sendError(res, error, "Erreur serveur");
  }
});

router.get("/:id", authorizeRoles("ADMIN", "DIRECTION", "COORDINATOR", "DAF", "COMMUNICATION"), async (req: Request, res: Response) => {
  const zone = await db.zone.findUnique({ where: { id: Number(req.params.id) } });
  if (!zone) return res.status(404).json({ success: false, message: "Zone introuvable" });
  res.json({ success: true, data: zone });
});

router.post("/", authorizeRoles("ADMIN", "DIRECTION"), async (req: Request, res: Response) => {
  try {
    const data = toData(req.body ?? {});
    const error = validate(data);
    if (error) return res.status(400).json({ success: false, message: error });

    if (await db.zone.findUnique({ where: { name: data.name } })) {
      return res.status(409).json({ success: false, message: "Une zone porte déjà ce nom" });
    }

    const zone = await db.zone.create({ data });
    if (zone.isHeadquarters) await enforceSingleHq(zone.id);

    res.status(201).json({ success: true, data: zone });
  } catch (error) {
    logger.error("Erreur création zone", error);
    sendError(res, error, "Erreur serveur");
  }
});

router.put("/:id", authorizeRoles("ADMIN", "DIRECTION"), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const data = toData(req.body ?? {});
    const error = validate(data);
    if (error) return res.status(400).json({ success: false, message: error });

    if (!(await db.zone.findUnique({ where: { id } }))) {
      return res.status(404).json({ success: false, message: "Zone introuvable" });
    }

    const zone = await db.zone.update({ where: { id }, data });
    if (zone.isHeadquarters) await enforceSingleHq(zone.id);

    res.json({ success: true, data: zone });
  } catch (error) {
    logger.error("Erreur mise à jour zone", error);
    sendError(res, error, "Erreur serveur (nom déjà utilisé ?)");
  }
});

router.delete("/:id", authorizeRoles("ADMIN"), async (req: Request, res: Response) => {
  try {
    await db.zone.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch {
    res.status(404).json({ success: false, message: "Zone introuvable" });
  }
});

/** Zones par défaut au premier démarrage (modifiables ensuite par l'administrateur). */
export async function ensureDefaultZones(): Promise<void> {
  try {
    if ((await db.zone.count()) > 0) return;

    await db.zone.createMany({
      data: [
        { name: "Antananarivo", region: "Analamanga", latitude: -18.8792, longitude: 47.5079, radiusKm: 30 },
        { name: "Fianarantsoa", region: "Haute Matsiatra", latitude: -21.4536, longitude: 47.0857, radiusKm: 30 },
      ],
    });
  } catch (error) {
    logger.error("Zones par défaut non créées", error);
  }
}

/* ---------------- Page d'accueil publique : adresse + zones ---------------- */

publicOrganizationRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const [zones, projects, beneficiaries] = await Promise.all([
      db.zone.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      prisma.project.count(),
      prisma.beneficiary.count(),
    ]);

    const hq = zones.find((z: Json) => z.isHeadquarters) ?? null;

    res.json({
      success: true,
      data: {
        headquarters: hq
          ? { name: hq.name, address: hq.address, phone: hq.phone, email: hq.email, latitude: hq.latitude, longitude: hq.longitude }
          : null,
        zones: zones.map((z: Json) => ({ id: z.id, name: z.name, region: z.region, latitude: z.latitude, longitude: z.longitude })),
        stats: { projects, beneficiaries, zones: zones.length },
      },
    });
  } catch (error) {
    logger.error("Erreur organisation publique", error);
    sendError(res, error, "Erreur serveur");
  }
});

export default router;
