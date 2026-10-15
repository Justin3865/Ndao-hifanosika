"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notification_controller_1 = require("../controllers/notification.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
/**
 * GET /api/notifications
 */
router.get("/", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "DSI", "DAF", "RH", "COMMUNICATION", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2", "STAGIAIRE_L3", "STAGIAIRE_M2"), notification_controller_1.getNotifications);
/**
 * GET /api/notifications/:id
 */
router.get("/:id", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "DSI", "DAF", "RH", "COMMUNICATION", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2", "STAGIAIRE_L3", "STAGIAIRE_M2"), notification_controller_1.getNotificationById);
/**
 * POST /api/notifications
 *
 * Création réservée aux rôles administratifs.
 */
router.post("/", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "DSI", "RH"), notification_controller_1.createNotification);
/**
 * PATCH /api/notifications/:id/read
 */
router.patch("/:id/read", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "DSI", "DAF", "RH", "COMMUNICATION", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2", "STAGIAIRE_L3", "STAGIAIRE_M2"), notification_controller_1.markNotificationAsRead);
/**
 * PATCH /api/notifications/read-all
 */
router.patch("/read-all", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "DSI", "DAF", "RH", "COMMUNICATION", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2", "STAGIAIRE_L3", "STAGIAIRE_M2"), notification_controller_1.markAllNotificationsAsRead);
/**
 * DELETE /api/notifications/:id
 */
router.delete("/:id", (0, role_middleware_1.authorizeRoles)("ADMIN", "DSI", "RH"), notification_controller_1.deleteNotification);
exports.default = router;
//# sourceMappingURL=notifications.routes.js.map