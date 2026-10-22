import express, { Router } from "express";

import {
  getNotifications,
  getNotificationById,
  createNotification,
  replyToNotification,
  markNotificationAsRead,
  markNotificationAsUnread,
  archiveNotification,
  unarchiveNotification,
  markAllNotificationsAsRead,
  deleteNotification,
  uploadAttachment,
  downloadAttachment,
} from "../controllers/notification.controller";

import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";

const router = Router();

router.use(authenticate);

/** Tous les rôles peuvent lire, répondre et gérer leurs propres notifications. */
const ALL_ROLES = [
  "ADMIN",
  "DIRECTION",
  "DSI",
  "DAF",
  "RH",
  "COMMUNICATION",
  "COORDINATOR",
  "TUTEUR_L3",
  "TUTEUR_M2",
  "STAGIAIRE_L3",
  "STAGIAIRE_M2",
];

/** Rôles qui peuvent ENVOYER un nouveau message (avec pièces jointes / position). */
const SENDER_ROLES = ["ADMIN", "DIRECTION", "DSI", "RH"];

/**
 * GET /api/notifications
 */
router.get("/", authorizeRoles(...ALL_ROLES), getNotifications);

/**
 * POST /api/notifications/attachments?name=...&mime=...
 * Corps binaire brut (application/octet-stream, 25 Mo max).
 * Utilisé pour joindre un fichier à un nouveau message OU à une réponse.
 */
router.post(
  "/attachments",
  authorizeRoles(...ALL_ROLES),
  express.raw({ type: "application/octet-stream", limit: "25mb" }),
  uploadAttachment,
);

/**
 * GET /api/notifications/attachments/:id/file
 */
router.get(
  "/attachments/:id/file",
  authorizeRoles(...ALL_ROLES),
  downloadAttachment,
);

/**
 * PATCH /api/notifications/read-all
 */
router.patch("/read-all", authorizeRoles(...ALL_ROLES), markAllNotificationsAsRead);

/**
 * GET /api/notifications/:id
 */
router.get("/:id", authorizeRoles(...ALL_ROLES), getNotificationById);

/**
 * POST /api/notifications
 *
 * Création réservée aux rôles administratifs.
 */
router.post("/", authorizeRoles(...SENDER_ROLES), createNotification);

/**
 * POST /api/notifications/:id/reply
 * Réponse (texte, pièces jointes, position) à l'expéditeur du message.
 */
router.post("/:id/reply", authorizeRoles(...ALL_ROLES), replyToNotification);

/**
 * PATCH /api/notifications/:id/read  |  /unread
 */
router.patch("/:id/read", authorizeRoles(...ALL_ROLES), markNotificationAsRead);
router.patch("/:id/unread", authorizeRoles(...ALL_ROLES), markNotificationAsUnread);

/**
 * PATCH /api/notifications/:id/archive  |  /unarchive
 */
router.patch("/:id/archive", authorizeRoles(...ALL_ROLES), archiveNotification);
router.patch("/:id/unarchive", authorizeRoles(...ALL_ROLES), unarchiveNotification);

/**
 * DELETE /api/notifications/:id
 */
router.delete("/:id", authorizeRoles(...ALL_ROLES), deleteNotification);

export default router;
