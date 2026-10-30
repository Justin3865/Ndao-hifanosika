import { Request, Response, Router } from "express";
import { logger } from "../config/logger";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import { db } from "../utils/db";

/**
 * /api/partners — partenaires des projets (nom, slogan, logo).
 * Le slogan et le logo servent ensuite sur les certificats des bénéficiaires.
 */
const router = Router();

router.use(authenticate);

const READERS = ["ADMIN", "DIRECTION", "DAF", "COMMUNICATION", "COORDINATOR", "RH"];
const WRITERS = ["ADMIN", "DIRECTION", "DAF", "COMMUNICATION", "COORDINATOR", "RH"];
const TYPES = ["FUNDING_PARTNER", "IMPLEMENTING_PARTNER", "TECHNICAL_PARTNER", "INSTITUTIONAL_PARTNER", "OTHER"];

// Logo envoyé en data-URL (même principe que l'avatar du profil)
const LOGO_RE = /^data:image\/(jpeg|png|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/;
const LOGO_MAX = 400_000;

const text = (v: unknown, max: number) => {
  const s = String(v ?? "").trim().slice(0, max);
  return s === "" ? null : s;
};

router.get("/", authorizeRoles(...READERS), async (_req: Request, res: Response) => {
  try {
    const partners = await db.partner.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    res.json({ success: true, count: partners.length, partners });
  } catch (error) {
    logger.error("Erreur liste partenaires", error);
    res.status(500).json({ success: false, message: "Impossible de récupérer les partenaires." });
  }
});

router.post("/", authorizeRoles(...WRITERS), async (req: Request, res: Response) => {
  try {
    const body = req.body ?? {};
    const name = text(body.name, 150);

    if (!name) return res.status(400).json({ success: false, message: "Le nom du partenaire est obligatoire." });

    const type = body.type ? String(body.type) : "OTHER";
    if (!TYPES.includes(type)) return res.status(400).json({ success: false, message: "Type de partenaire invalide." });

    const logo = body.logoUrl ? String(body.logoUrl) : null;
    if (logo && (!LOGO_RE.test(logo) || logo.length > LOGO_MAX)) {
      return res.status(400).json({ success: false, message: "Logo invalide (PNG, JPG, WEBP ou SVG, 400 Ko maximum)." });
    }

    const duplicate = await db.partner.findFirst({ where: { name: { equals: name, mode: "insensitive" }, isActive: true } });
    if (duplicate) return res.status(409).json({ success: false, message: "Ce partenaire existe déjà.", partner: duplicate });

    const partner = await db.partner.create({
      data: {
        name,
        type,
        slogan: text(body.slogan, 200),
        logoUrl: logo,
        website: text(body.website, 200),
        description: text(body.description, 1000),
        email: text(body.email, 150),
        phone: text(body.phone, 40),
        address: text(body.address, 250),
      },
    });

    res.status(201).json({ success: true, message: "Partenaire créé.", partner });
  } catch (error) {
    logger.error("Erreur création partenaire", error);
    res.status(500).json({ success: false, message: "Impossible de créer le partenaire." });
  }
});

router.put("/:id", authorizeRoles(...WRITERS), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: "Identifiant invalide." });

    const body = req.body ?? {};
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = text(body.name, 150);
      if (!name) return res.status(400).json({ success: false, message: "Le nom du partenaire est obligatoire." });
      data.name = name;
    }

    if (body.type !== undefined) {
      if (!TYPES.includes(String(body.type))) return res.status(400).json({ success: false, message: "Type de partenaire invalide." });
      data.type = String(body.type);
    }

    if (body.slogan !== undefined) data.slogan = text(body.slogan, 200);
    if (body.website !== undefined) data.website = text(body.website, 200);
    if (body.description !== undefined) data.description = text(body.description, 1000);

    if (body.logoUrl !== undefined) {
      const logo = body.logoUrl ? String(body.logoUrl) : null;
      if (logo && (!LOGO_RE.test(logo) || logo.length > LOGO_MAX)) {
        return res.status(400).json({ success: false, message: "Logo invalide (PNG, JPG, WEBP ou SVG, 400 Ko maximum)." });
      }
      data.logoUrl = logo;
    }

    if (!Object.keys(data).length) return res.status(400).json({ success: false, message: "Aucune donnée à modifier." });

    const partner = await db.partner.update({ where: { id }, data });
    res.json({ success: true, message: "Partenaire modifié.", partner });
  } catch (error) {
    logger.error("Erreur modification partenaire", error);
    res.status(500).json({ success: false, message: "Impossible de modifier le partenaire." });
  }
});

// Désactivation (les certificats déjà délivrés gardent leur copie du logo/slogan)
router.delete("/:id", authorizeRoles("ADMIN", "DIRECTION"), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: "Identifiant invalide." });

    await db.partner.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: "Partenaire désactivé." });
  } catch (error) {
    logger.error("Erreur suppression partenaire", error);
    res.status(500).json({ success: false, message: "Impossible de désactiver le partenaire." });
  }
});

export default router;
