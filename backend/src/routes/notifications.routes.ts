import { Router } from "express";

import {
  getNotifications,
  getNotificationById,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "../controllers/notification.controller";

import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";

const router = Router();

router.use(authenticate);

/**
 * GET /api/notifications
 */
router.get(
  "/",
  authorizeRoles(
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
  ),
  getNotifications,
);

/**
 * GET /api/notifications/:id
 */
router.get(
  "/:id",
  authorizeRoles(
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
  ),
  getNotificationById,
);

/**
 * POST /api/notifications
 *
 * Création réservée aux rôles administratifs.
 */
router.post(
  "/",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "DSI",
    "RH",
  ),
  createNotification,
);

/**
 * PATCH /api/notifications/:id/read
 */
router.patch(
  "/:id/read",
  authorizeRoles(
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
  ),
  markNotificationAsRead,
);

/**
 * PATCH /api/notifications/read-all
 */
router.patch(
  "/read-all",
  authorizeRoles(
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
  ),
  markAllNotificationsAsRead,
);

/**
 * DELETE /api/notifications/:id
 */
router.delete(
  "/:id",
  authorizeRoles(
    "ADMIN",
    "DSI",
    "RH",
  ),
  deleteNotification,
);

export default router;