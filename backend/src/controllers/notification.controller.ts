import { Request, Response } from "express";
import { logger } from "../config/logger";

type NotificationItem = {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
  read: boolean;
  createdAt: string;
};

const notifications: NotificationItem[] = [];

let nextNotificationId = 1;

export async function getNotifications(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const userId = req.query.userId
      ? Number(req.query.userId)
      : undefined;

    const data = userId
      ? notifications.filter(
          (notification) => notification.userId === userId,
        )
      : notifications;

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
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      res.status(400).json({
        success: false,
        message: "Identifiant notification invalide",
      });
      return;
    }

    const notification = notifications.find(
      (item) => item.id === id,
    );

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
    const {
      userId,
      title,
      message,
      type,
    } = req.body;

    if (!userId || !title || !message) {
      res.status(400).json({
        success: false,
        message: "userId, title et message sont obligatoires",
      });
      return;
    }

    const notification: NotificationItem = {
      id: nextNotificationId++,
      userId: Number(userId),
      title,
      message,
      type: type ?? "INFO",
      read: false,
      createdAt: new Date().toISOString(),
    };

    notifications.unshift(notification);

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
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      res.status(400).json({
        success: false,
        message: "Identifiant notification invalide",
      });
      return;
    }

    const notification = notifications.find(
      (item) => item.id === id,
    );

    if (!notification) {
      res.status(404).json({
        success: false,
        message: "Notification introuvable",
      });
      return;
    }

    notification.read = true;

    res.status(200).json({
      success: true,
      message: "Notification marquée comme lue",
      data: notification,
    });
  } catch (error) {
    logger.error("Erreur notification lue", error);

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
    const userId = req.body.userId
      ? Number(req.body.userId)
      : undefined;

    notifications.forEach((notification) => {
      if (!userId || notification.userId === userId) {
        notification.read = true;
      }
    });

    res.status(200).json({
      success: true,
      message: "Notifications marquées comme lues",
    });
  } catch (error) {
    logger.error("Erreur notifications lues", error);

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
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      res.status(400).json({
        success: false,
        message: "Identifiant notification invalide",
      });
      return;
    }

    const index = notifications.findIndex(
      (item) => item.id === id,
    );

    if (index === -1) {
      res.status(404).json({
        success: false,
        message: "Notification introuvable",
      });
      return;
    }

    notifications.splice(index, 1);

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