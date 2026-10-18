import bcrypt from "bcrypt";
import { Request, Response, Router } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { authenticate } from "../middlewares/auth.middleware";
import { getReqUser } from "../utils/dataScope";

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

    res.json({ success: true, data: user });
  } catch (error) {
    logger.error("Erreur profil", error);
    sendError(res, error, "Erreur serveur");
  }
});

router.put("/", async (req: Request, res: Response) => {
  try {
    const me = getReqUser(req);
    const { firstName, lastName, phone } = req.body ?? {};

    if (!String(firstName ?? "").trim() || !String(lastName ?? "").trim()) {
      return res.status(400).json({ success: false, message: "Prénom et nom sont obligatoires" });
    }

    const user = await prisma.user.update({
      where: { id: me!.id },
      data: {
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        phone: phone ? String(phone).trim() : null,
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
