import { Request, Response } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { getReqUser } from "../utils/dataScope";

/**
 * Notifications persistées en base (table Notification).
 * Chaque utilisateur ne voit / ne modifie QUE ses propres notifications.
 */

const NOTIFICATION_TYPES = ["INFO", "SUCCESS", "WARNING", "ERROR"];

function unauthorized(res: Response): void {
  res.status(401).json({
    success: false,
    message: "Utilisateur non authentifié",
  });
}

function parseId(req: Request, res: Response): number | null {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({
      success: false,
      message: "Identifiant notification invalide",
    });
    return null;
  }

  return id;
}

export async function getNotifications(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = getReqUser(req);
    if (!user) return unauthorized(res);

    const data = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error("Erreur récupération notifications", error);

    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des notifications",
    });
  }
}

export async function getNotificationById(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = getReqUser(req);
    if (!user) return unauthorized(res);

    const id = parseId(req, res);
    if (id === null) return;

    const notification = await prisma.notification.findFirst({
      where: { id, userId: user.id },
    });

    if (!notification) {
      res.status(404).json({
        success: false,
        message: "Notification introuvable",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    logger.error("Erreur récupération notification", error);

    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de la notification",
    });
  }
}

export async function createNotification(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { userId, title, message, type } = req.body;

    if (!userId || !title || !message) {
      res.status(400).json({
        success: false,
        message: "userId, title et message sont obligatoires",
      });
      return;
    }

    const normalizedType = String(type ?? "INFO").toUpperCase();

    if (!NOTIFICATION_TYPES.includes(normalizedType)) {
      res.status(400).json({
        success: false,
        message: "Type de notification invalide",
      });
      return;
    }

    const recipient = await prisma.user.findUnique({
      where: { id: Number(userId) },
      select: { id: true },
    });

    if (!recipient) {
      res.status(404).json({
        success: false,
        message: "Destinataire introuvable",
      });
      return;
    }

    const notification = await prisma.notification.create({
      data: {
        userId: recipient.id,
        title: String(title),
        message: String(message),
        type: normalizedType as never,
      },
    });

    res.status(201).json({
      success: true,
      message: "Notification créée avec succès",
      data: notification,
    });
  } catch (error) {
    logger.error("Erreur création notification", error);

    res.status(500).json({
      success: false,
      message: "Erreur lors de la création de la notification",
    });
  }
}

export async function markNotificationAsRead(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = getReqUser(req);
    if (!user) return unauthorized(res);

    const id = parseId(req, res);
    if (id === null) return;

    const result = await prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { read: true },
    });

    if (result.count === 0) {
      res.status(404).json({
        success: false,
        message: "Notification introuvable",
      });
      return;
    }

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Notification marquée comme lue",
      data: notification,
    });
  } catch (error) {
    logger.error("Erreur lecture notification", error);

    res.status(500).json({
      success: false,
      message: "Erreur lors de la mise à jour de la notification",
    });
  }
}

export async function markAllNotificationsAsRead(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = getReqUser(req);
    if (!user) return unauthorized(res);

    await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });

    res.status(200).json({
      success: true,
      message: "Notifications marquées comme lues",
    });
  } catch (error) {
    logger.error("Erreur lecture notifications", error);

    res.status(500).json({
      success: false,
      message: "Erreur lors de la mise à jour des notifications",
    });
  }
}

export async function deleteNotification(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = getReqUser(req);
    if (!user) return unauthorized(res);

    const id = parseId(req, res);
    if (id === null) return;

    const result = await prisma.notification.deleteMany({
      where: { id, userId: user.id },
    });

    if (result.count === 0) {
      res.status(404).json({
        success: false,
        message: "Notification introuvable",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Notification supprimée avec succès",
    });
  } catch (error) {
    logger.error("Erreur suppression notification", error);

    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression de la notification",
    });
  }
}
