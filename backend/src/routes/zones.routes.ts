import { Request, Response, Router } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import { getReqUser } from "../utils/dataScope";
import { notifyRoles } from "../utils/notify";

export const zonesRouter = Router();
export const publicOrgRouter = Router();

const num = (v: unknown) => (v === undefined || v === null || v === "" ? null : Number(v));

function parseZone(body: any) {
  const name = String(body?.name ?? "").trim();
  const latitude = num(body?.latitude);
  const longitude = num(body?.longitude);
  const altitude = num(body?.altitude);
  if (!name) return { error: "Le nom de la zone est obligatoire." };
  if (latitude === null || latitude < -90 || latitude > 90) return { error: "Latitude invalide." };
  if (longitude === null || longitude < -180 || longitude > 180) return { error: "Longitude invalide." };
  if (altitude !== null && Number.isNaN(altitude)) return { error: "Altitude invalide." };
  return {
    data: {
      name,
      region: body?.region ? String(body.region).trim() : null,
      district: body?.district ? String(body.district).trim() : null,
      latitude,
      longitude,
      altitude,
      active: body?.active === undefined ? true : Boolean(body.active),
    },
  };
}

zonesRouter.use(authenticate);

zonesRouter.get("/", async (_req: Request, res: Response) => {
  const zones = await prisma.zoneIntervention.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { beneficiaries: true } } },
  });
  res.json({ success: true, data: zones });
});

zonesRouter.post("/", authorizeRoles("ADMIN", "DIRECTION"), async (req: Request, res: Response) => {
  try {
    const parsed = parseZone(req.body);
    if ("error" in parsed) return res.status(400).json({ success: false, message: parsed.error });
    const exists = await prisma.zoneIntervention.findUnique({ where: { name: parsed.data.name } });
    if (exists) return res.status(409).json({ success: false, message: "Une zone porte déjà ce nom." });
    const zone = await prisma.zoneIntervention.create({
      data: { ...parsed.data, createdById: getReqUser(req)?.id ?? null },
    });
    await notifyRoles(["ADMIN", "DIRECTION", "COORDINATOR"], {
      title: "Nouvelle zone d'intervention",
      message: `La zone « ${zone.name} » a été ajoutée.`,
      type: "INFO",
    }, getReqUser(req)?.id);
    return res.status(201).json({ success: true, message: "Zone créée.", data: zone });
  } catch (error) {
    logger.error("Erreur création zone", error);
    return res.status(500).json({ success: false, message: "Erreur interne du serveur." });
  }
});

zonesRouter.put("/:id", authorizeRoles("ADMIN", "DIRECTION"), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const parsed = parseZone(req.body);
    if ("error" in parsed) return res.status(400).json({ success: false, message: parsed.error });
    const zone = await prisma.zoneIntervention.update({ where: { id }, data: parsed.data });
    return res.json({ success: true, message: "Zone mise à jour.", data: zone });
  } catch (error) {
    logger.error("Erreur modification zone", error);
    return res.status(404).json({ success: false, message: "Zone introuvable." });
  }
});

zonesRouter.delete("/:id", authorizeRoles("ADMIN"), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const used = await prisma.beneficiary.count({ where: { zoneId: id } });
    if (used > 0) {
      return res.status(409).json({ success: false, message: `Impossible : ${used} bénéficiaire(s) sont rattachés à cette zone. Désactivez-la plutôt.` });
    }
    await prisma.zoneIntervention.delete({ where: { id } });
    return res.json({ success: true, message: "Zone supprimée." });
  } catch {
    return res.status(404).json({ success: false, message: "Zone introuvable." });
  }
});

/**
 * GET /api/public/organization — page d'accueil (publique).
 * Adresse de l'ONG (variables .env) + zones actives avec simple effectif.
 * Aucune donnée personnelle ni position de bénéficiaire n'est exposée.
 */
publicOrgRouter.get("/", async (_req: Request, res: Response) => {
  const zones = await prisma.zoneIntervention.findMany({
    where: { active: true },
    select: { id: true, name: true, region: true, latitude: true, longitude: true, altitude: true, _count: { select: { beneficiaries: true } } },
    orderBy: { name: "asc" },
  });
  res.json({
    success: true,
    data: {
      name: process.env.ORG_NAME || "Ndao Hifanosika",
      address: process.env.ORG_ADDRESS || "",
      latitude: process.env.ORG_LAT ? Number(process.env.ORG_LAT) : null,
      longitude: process.env.ORG_LNG ? Number(process.env.ORG_LNG) : null,
      zones: zones.map((z) => ({ ...z, beneficiaries: z._count.beneficiaries, _count: undefined })),
    },
  });
});
