import { NextFunction, Request, Response, Router } from "express";

// ⚠️ Votre schema utilise le générateur "prisma-client" (output: ../generated/prisma).
// Importez donc depuis le client généré, PAS depuis "@prisma/client".
// Ajustez les chemins ci-dessous pour qu'ils correspondent à vos autres routes.
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma"; // la même instance que vos autres routes
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

/* ---------- Rôles autorisés à gérer les offres ----------
 * ⚠️ Même liste que OFFER_MANAGER_ROLES dans frontend/src/lib/stages.ts
 * (valeurs de l'enum UserRole du schema Prisma). */
const OFFER_MANAGER_ROLES = ["ADMIN", "RH", "COORDINATOR"];

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const role = String((req as any).user?.role || "").toUpperCase();
  if (!OFFER_MANAGER_ROLES.includes(role)) {
    return res.status(403).json({
      success: false,
      message: "Accès réservé à l'équipe de gestion des stages.",
    });
  }
  next();
}

function parseId(value: string | string[] | undefined) {
  const id = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Date valide ou null ; "invalid" si la chaîne n'est pas une date */
function parseDate(value: unknown): Date | null | "invalid" {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? "invalid" : d;
}

function cleanOfferBody(body: any) {
  const places = body.places ? Number(body.places) : null;

  return {
    title: String(body.title || "").trim(),
    domain: body.domain ? String(body.domain).trim() : null,
    location: body.location ? String(body.location).trim() : null,
    duration: body.duration ? String(body.duration).trim() : null,
    deadline: parseDate(body.deadline),
    places: places !== null && Number.isFinite(places) && places > 0 ? Math.floor(places) : null,
    description: String(body.description || "").trim(),
  };
}

/** Valide le corps d'une offre ; renvoie un message d'erreur ou null */
function validateOffer(data: ReturnType<typeof cleanOfferBody>) {
  if (!data.title || !data.description) return "Le titre et la description sont obligatoires.";
  if (data.deadline === "invalid") return "La date limite est invalide.";
  return null;
}

/* =========================================================
   PUBLIC : liste des stages disponibles
   GET /api/internship-offers
========================================================= */
router.get("/", async (_req, res) => {
  try {
    const offers = await prisma.internshipOffer.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: offers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

/* =========================================================
   PUBLIC : détail d'un stage
   GET /api/internship-offers/:id
========================================================= */
router.get("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: "Identifiant invalide." });

  try {
    const offer = await prisma.internshipOffer.findFirst({ where: { id, isActive: true } });
    if (!offer) return res.status(404).json({ success: false, message: "Stage introuvable." });
    res.json({ success: true, data: offer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

/* =========================================================
   GESTION : publier une nouvelle offre
   POST /api/internship-offers          (ADMIN, RH, COORDINATOR)
========================================================= */
router.post("/", authenticate, requireAdmin, async (req, res) => {
  const data = cleanOfferBody(req.body);
  const problem = validateOffer(data);
  if (problem) return res.status(400).json({ success: false, message: problem });

  try {
    const offer = await prisma.internshipOffer.create({
      data: {
        ...data,
        deadline: data.deadline as Date | null,
        createdById: Number((req as any).user?.id) || null,
      },
    });
    res.status(201).json({ success: true, data: offer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Impossible d'ajouter ce stage." });
  }
});

/* =========================================================
   GESTION : modifier une offre
   PATCH /api/internship-offers/:id     (ADMIN, RH, COORDINATOR)
========================================================= */
router.patch("/:id", authenticate, requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: "Identifiant invalide." });

  const data = cleanOfferBody(req.body);
  const problem = validateOffer(data);
  if (problem) return res.status(400).json({ success: false, message: problem });

  try {
    const offer = await prisma.internshipOffer.update({
      where: { id },
      data: { ...data, deadline: data.deadline as Date | null },
    });
    res.json({ success: true, data: offer });
  } catch (error) {
    if ((error as Prisma.PrismaClientKnownRequestError).code === "P2025") {
      return res.status(404).json({ success: false, message: "Stage introuvable." });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

/* =========================================================
   GESTION : retirer une offre (masquée, pas supprimée)
   DELETE /api/internship-offers/:id    (ADMIN, RH, COORDINATOR)
========================================================= */
router.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: "Identifiant invalide." });

  try {
    await prisma.internshipOffer.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: "Stage retiré." });
  } catch (error) {
    if ((error as Prisma.PrismaClientKnownRequestError).code === "P2025") {
      return res.status(404).json({ success: false, message: "Stage introuvable." });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

/* =========================================================
   CONNECTÉ : postuler
   POST /api/internship-offers/:id/applications
========================================================= */
router.post("/:id/applications", authenticate, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: "Identifiant invalide." });

  const userId = Number((req as any).user?.id);
  const motivation = String(req.body.motivation || "").trim();

  if (!motivation) {
    return res.status(400).json({ success: false, message: "La lettre de motivation est obligatoire." });
  }

  try {
    const offer = await prisma.internshipOffer.findFirst({ where: { id, isActive: true } });
    if (!offer) return res.status(404).json({ success: false, message: "Stage introuvable." });

    if (offer.deadline) {
      const end = new Date(offer.deadline);
      end.setHours(23, 59, 59, 999);
      if (end.getTime() < Date.now()) {
        return res.status(400).json({ success: false, message: "Les candidatures pour ce stage sont fermées." });
      }
    }

    const application = await prisma.internshipApplication.create({
      data: {
        offerId: id,
        userId,
        phone: req.body.phone ? String(req.body.phone).trim() : null,
        school: req.body.school ? String(req.body.school).trim() : null,
        level: req.body.level ? String(req.body.level).trim() : null,
        motivation,
      },
    });

    res.status(201).json({ success: true, data: application });
  } catch (error) {
    if ((error as Prisma.PrismaClientKnownRequestError).code === "P2002") {
      return res.status(409).json({ success: false, message: "Vous avez déjà postulé à ce stage." });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Impossible d'envoyer votre candidature." });
  }
});

/* =========================================================
   GESTION : candidatures d'une offre (avec infos du candidat)
   GET /api/internship-offers/:id/applications   (ADMIN, RH, COORDINATOR)
========================================================= */
router.get("/:id/applications", authenticate, requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: "Identifiant invalide." });

  try {
    const applications = await prisma.internshipApplication.findMany({
      where: { offerId: id },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    res.json({ success: true, data: applications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

/* =========================================================
   GESTION : accepter / refuser une candidature
   PATCH /api/internship-offers/applications/:applicationId
   body : { status: "PENDING" | "ACCEPTED" | "REJECTED" }
========================================================= */
router.patch("/applications/:applicationId", authenticate, requireAdmin, async (req, res) => {
  const applicationId = parseId(req.params.applicationId);
  if (!applicationId) return res.status(400).json({ success: false, message: "Identifiant invalide." });

  const status = String(req.body.status || "").toUpperCase();
  if (!["PENDING", "ACCEPTED", "REJECTED"].includes(status)) {
    return res.status(400).json({ success: false, message: "Statut invalide." });
  }

  try {
    const application = await prisma.internshipApplication.update({
      where: { id: applicationId },
      data: { status: status as any },
    });
    res.json({ success: true, data: application });
  } catch (error) {
    if ((error as Prisma.PrismaClientKnownRequestError).code === "P2025") {
      return res.status(404).json({ success: false, message: "Candidature introuvable." });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

export default router;
