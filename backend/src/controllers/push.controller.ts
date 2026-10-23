import { Request, Response } from "express";
import { logger } from "../config/logger";
import { sendError } from "../middlewares/error.middleware";
import { getReqUser } from "../utils/dataScope";
import { db } from "../utils/db";
import { getPushPublicKey } from "../utils/webpush";

/** GET /api/notifications/push/key — clé publique VAPID (configured=false si Web Push non activé). */
export async function getPushKey(_req: Request, res: Response): Promise<void> {
  const publicKey = getPushPublicKey();

  res.status(200).json({ success: true, data: { configured: !!publicKey, publicKey } });
}

/** POST /api/notifications/push/subscribe — enregistre (ou rattache) l'appareil à l'utilisateur. */
export async function subscribePush(req: Request, res: Response): Promise<void> {
  try {
    const user = getReqUser(req);

    if (!user) {
      res.status(401).json({ success: false, message: "Utilisateur non authentifié" });
      return;
    }

    const endpoint = String(req.body?.endpoint ?? "");
    const p256dh = String(req.body?.keys?.p256dh ?? "");
    const auth = String(req.body?.keys?.auth ?? "");

    if (!/^https:\/\//.test(endpoint) || endpoint.length > 2000 || !p256dh || !auth) {
      res.status(400).json({ success: false, message: "Abonnement invalide" });
      return;
    }

    const userAgent = String(req.headers["user-agent"] ?? "").slice(0, 250) || null;

    // Un même appareil = un seul utilisateur (le dernier connecté)
    await db.pushSubscription.upsert({
      where: { endpoint },
      update: { userId: user.id, p256dh, auth, userAgent },
      create: { userId: user.id, endpoint, p256dh, auth, userAgent },
    });

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error("Erreur abonnement push", error);

    sendError(res, error, "Erreur lors de l'activation des notifications");
  }
}

/** POST /api/notifications/push/unsubscribe */
export async function unsubscribePush(req: Request, res: Response): Promise<void> {
  try {
    const user = getReqUser(req);

    if (!user) {
      res.status(401).json({ success: false, message: "Utilisateur non authentifié" });
      return;
    }

    const endpoint = String(req.body?.endpoint ?? "");

    if (endpoint) {
      await db.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error("Erreur désabonnement push", error);

    sendError(res, error, "Erreur lors de la désactivation des notifications");
  }
}
