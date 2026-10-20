import { NextFunction, Request, Response, Router } from "express";

// ⚠️ Votre schema utilise le générateur "prisma-client" (output: ../generated/prisma).
// Importez donc depuis le client généré, PAS depuis "@prisma/client".
// Ajustez les 3 chemins ci-dessous pour qu'ils correspondent à vos autres routes.
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma"; // la même instance que vos autres routes
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

/* ---------- Admin uniquement (rôle ADMIN de votre enum UserRole) ---------- */
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const role = String((req as any).user?.role || "").toUpperCase();
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return res
      .status(403)
      .json({ success: false, message: "Accès réservé aux administrateurs." });
  }
  next();
}

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function cleanOfferBody(body: any) {
  return {
    title: String(body.title || "").trim(),
    domain: body.domain ? String(body.domain).trim() : null,
    location: body.location ? String(body.location).trim() : null,
    duration: body.duration ? String(body.duration).trim() : null,
    deadline: body.deadline ? new Date(body.deadline) : null,
    places: body.places ? Number(body.places) : null,
    description: String(body.description || "").trim(),
  };
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
    const offer = await prisma.internshipOffer.findFirst({
      where: { id, isActive: true },
    });
    if (!offer) return res.status(404).json({ success: false, message: "Stage introuvable." });
    res.json({ success: true, data: offer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

/* =========================================================
   ADMIN : ajouter un stage
   POST /api/internship-offers
========================================================= */
router.post("/", authenticate, requireAdmin, async (req, res) => {
  const data = cleanOfferBody(req.body);

  if (!data.title || !data.description) {
    return res
      .status(400)
      .json({ success: false, message: "Le titre et la description sont obligatoires." });
  }

  try {
    const offer = await prisma.internshipOffer.create({
      data: { ...data, createdById: Number((req as any).user?.id) || null },
    });
    res.status(201).json({ success: true, data: offer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Impossible d'ajouter ce stage." });
  }
});

/* =========================================================
   ADMIN : modifier un stage
   PATCH /api/internship-offers/:id
========================================================= */
router.patch("/:id", authenticate, requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: "Identifiant invalide." });

  const data = cleanOfferBody(req.body);
  if (!data.title || !data.description) {
    return res
      .status(400)
      .json({ success: false, message: "Le titre et la description sont obligatoires." });
  }

  try {
    const offer = await prisma.internshipOffer.update({ where: { id }, data });
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
   ADMIN : retirer un stage (masqué, pas supprimé)
   DELETE /api/internship-offers/:id
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
    return res
      .status(400)
      .json({ success: false, message: "La lettre de motivation est obligatoire." });
  }

  try {
    const offer = await prisma.internshipOffer.findFirst({ where: { id, isActive: true } });
    if (!offer) return res.status(404).json({ success: false, message: "Stage introuvable." });

    if (offer.deadline) {
      const end = new Date(offer.deadline);
      end.setHours(23, 59, 59, 999);
      if (end.getTime() < Date.now()) {
        return res
          .status(400)
          .json({ success: false, message: "Les candidatures pour ce stage sont fermées." });
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
      return res
        .status(409)
        .json({ success: false, message: "Vous avez déjà postulé à ce stage." });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Impossible d'envoyer votre candidature." });
  }
});

/* =========================================================
   ADMIN : voir les candidatures d'un stage (avec infos du candidat)
   GET /api/internship-offers/:id/applications
========================================================= */
router.get("/:id/applications", authenticate, requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: "Identifiant invalide." });

  try {
    const applications = await prisma.internshipApplication.findMany({
      where: { offerId: id },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    res.json({ success: true, data: applications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

/* =========================================================
   ADMIN : accepter / refuser une candidature
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
