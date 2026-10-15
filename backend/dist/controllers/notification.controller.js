"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotifications = getNotifications;
exports.getNotificationById = getNotificationById;
exports.createNotification = createNotification;
exports.markNotificationAsRead = markNotificationAsRead;
exports.markAllNotificationsAsRead = markAllNotificationsAsRead;
exports.deleteNotification = deleteNotification;
const logger_1 = require("../config/logger");
const notifications = [];
let nextNotificationId = 1;
async function getNotifications(req, res) {
    try {
        const userId = req.query.userId
            ? Number(req.query.userId)
            : undefined;
        const data = userId
            ? notifications.filter((notification) => notification.userId === userId)
            : notifications;
        res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        logger_1.logger.error("Erreur récupération notifications", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des notifications",
        });
    }
}
async function getNotificationById(req, res) {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            res.status(400).json({
                success: false,
                message: "Identifiant notification invalide",
            });
            return;
        }
        const notification = notifications.find((item) => item.id === id);
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
    }
    catch (error) {
        logger_1.logger.error("Erreur récupération notification", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération de la notification",
        });
    }
}
async function createNotification(req, res) {
    try {
        const { userId, title, message, type, } = req.body;
        if (!userId || !title || !message) {
            res.status(400).json({
                success: false,
                message: "userId, title et message sont obligatoires",
            });
            return;
        }
        const notification = {
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
    }
    catch (error) {
        logger_1.logger.error("Erreur création notification", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la création de la notification",
        });
    }
}
async function markNotificationAsRead(req, res) {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            res.status(400).json({
                success: false,
                message: "Identifiant notification invalide",
            });
            return;
        }
        const notification = notifications.find((item) => item.id === id);
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
    }
    catch (error) {
        logger_1.logger.error("Erreur notification lue", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la mise à jour de la notification",
        });
    }
}
async function markAllNotificationsAsRead(req, res) {
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
    }
    catch (error) {
        logger_1.logger.error("Erreur notifications lues", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la mise à jour des notifications",
        });
    }
}
async function deleteNotification(req, res) {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            res.status(400).json({
                success: false,
                message: "Identifiant notification invalide",
            });
            return;
        }
        const index = notifications.findIndex((item) => item.id === id);
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
    }
    catch (error) {
        logger_1.logger.error("Erreur suppression notification", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la suppression de la notification",
        });
    }
}
//# sourceMappingURL=notification.controller.js.map