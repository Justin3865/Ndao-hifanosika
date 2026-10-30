import bcrypt from "bcrypt";
import { Request, Response, Router } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import { getReqUser } from "../utils/dataScope";
import { identitySelect, missingIdentity, parseIdentity } from "../utils/identity";

import { sendError } from "../middlewares/error.middleware";
/** Profil de l'utilisateur CONNECTÉ (jamais d'id dans l'URL). */
const router = Router();

router.use(authenticate);

const profileSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  birthDate: true,
  birthPlace: true,
  cinNumber: true,
  cinIssuedAt: true,
  cinIssuedPlace: true,
  cinDuplicata: true,
  cinDuplicataAt: true,
  notifyEmail: true,
  notifySms: true,
  gender: true,
  role: true,
  status: true,
  avatarUrl: true,
  createdAt: true,
  lastLoginAt: true,
  department: { select: { id: true, name: true } },
} as const;

/** Identité d'un utilisateur (stagiaire…) : préremplit les formulaires de l'encadrement */
router.get("/identity/:userId", authorizeRoles("ADMIN", "DIRECTION", "RH", "COORDINATOR"), async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ success: false, message: "Utilisateur invalide" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: identitySelect });

    if (!user) return res.status(404).json({ success: false, message: "Utilisateur introuvable" });

    return res.json({ success: true, data: user, missing: missingIdentity(user) });
  } catch (error) {
    logger.error("Lecture de l'identité impossible", error);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const me = getReqUser(req);

    const user = await prisma.user.findUnique({
      where: { id: me!.id },
      select: profileSelect,
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable" });
    }

    res.json({ success: true, data: user, missing: missingIdentity(user) });
  } catch (error) {
    logger.error("Erreur profil", error);
    sendError(res, error, "Erreur serveur");
  }
});

router.put("/", async (req: Request, res: Response) => {
  try {
    const me = getReqUser(req);
    const { firstName, lastName, phone, birthDate, birthPlace } = req.body ?? {};

    // Le prénom est facultatif (certaines personnes n'en ont pas)
    if (!String(lastName ?? "").trim()) {
      return res.status(400).json({ success: false, message: "Le nom est obligatoire" });
    }

    // Date de naissance : facultative, mais doit être valide et dans le passé
    const birth = birthDate ? new Date(birthDate) : null;

    if (birth && (Number.isNaN(birth.getTime()) || birth.getTime() > Date.now() || birth.getFullYear() < 1900)) {
      return res.status(400).json({ success: false, message: "Date de naissance invalide" });
    }

    // CIN : numéro (12 chiffres), délivrance, duplicata (champs facultatifs, ignorés s'ils sont absents)
    const identity = parseIdentity(req.body, { birth: false });

    if (identity.error) {
      return res.status(400).json({ success: false, message: identity.error });
    }

    const user = await prisma.user.update({
      where: { id: me!.id },
      data: {
        firstName: String(firstName ?? "").trim(),
        lastName: String(lastName).trim(),
        phone: phone ? String(phone).trim() : null,
        birthDate: birth,
        birthPlace: birthPlace ? String(birthPlace).trim() || null : null,
        ...identity.data,
      },
      select: profileSelect,
    });

    res.json({ success: true, data: user });
  } catch (error) {
    logger.error("Erreur mise à jour profil", error);
    sendError(res, error, "Erreur serveur");
  }
});

router.put("/preferences", async (req: Request, res: Response) => {
  try {
    const me = getReqUser(req);

    const user = await prisma.user.update({
      where: { id: me!.id },
      data: {
        notifyEmail: Boolean(req.body?.notifyEmail),
        notifySms: Boolean(req.body?.notifySms),
      },
      select: profileSelect,
    });

    res.json({ success: true, data: user });
  } catch (error) {
    logger.error("Erreur préférences", error);
    sendError(res, error, "Erreur serveur");
  }
});

router.put("/password", async (req: Request, res: Response) => {
  try {
    const me = getReqUser(req);
    const { currentPassword, newPassword } = req.body ?? {};

    if (!currentPassword || !newPassword || String(newPassword).length < 12) {
      return res.status(400).json({
        success: false,
        message: "Mot de passe actuel requis et nouveau mot de passe de 12 caractères minimum",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: me!.id },
      select: { password: true },
    });

    const valid =
      !!user && (await bcrypt.compare(String(currentPassword), user.password));

    if (!valid) {
      return res.status(400).json({ success: false, message: "Mot de passe actuel incorrect" });
    }

    await prisma.user.update({
      where: { id: me!.id },
      data: { password: await bcrypt.hash(String(newPassword), 12) },
    });

    res.json({ success: true, message: "Mot de passe modifié" });
  } catch (error) {
    logger.error("Erreur changement mot de passe", error);
    sendError(res, error, "Erreur serveur");
  }
});

// Photo : image déjà réduite côté navigateur (256 px), stockée en data-URL
router.put("/avatar", async (req: Request, res: Response) => {
  try {
    const me = getReqUser(req);
    const avatar = String(req.body?.avatar ?? "");

    if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(avatar)) {
      return res.status(400).json({ success: false, message: "Image invalide (JPEG, PNG ou WebP)" });
    }

    if (avatar.length > 300_000) {
      return res.status(413).json({ success: false, message: "Image trop lourde" });
    }

    const user = await prisma.user.update({
      where: { id: me!.id },
      data: { avatarUrl: avatar },
      select: profileSelect,
    });

    res.json({ success: true, data: user });
  } catch (error) {
    logger.error("Erreur avatar", error);
    sendError(res, error, "Erreur serveur");
  }
});

router.delete("/avatar", async (req: Request, res: Response) => {
  try {
    const me = getReqUser(req);

    await prisma.user.update({
      where: { id: me!.id },
      data: { avatarUrl: null },
    });

    res.json({ success: true });
  } catch (error) {
    logger.error("Erreur suppression avatar", error);
    sendError(res, error, "Erreur serveur");
  }
});

export default router;
