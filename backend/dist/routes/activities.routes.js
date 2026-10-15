"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const activity_controller_1 = require("../controllers/activity.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const router = (0, express_1.Router)();
/*
 * Toutes les routes /activities nécessitent
 * un JWT Bearer valide et un utilisateur ACTIVE.
 */
router.use(auth_middleware_1.authenticate);
/**
 * GET /api/activities
 *
 * Consultation des activités.
 */
router.get("/", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "COMMUNICATION", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2", "STAGIAIRE_L3", "STAGIAIRE_M2"), activity_controller_1.getActivities);
/**
 * GET /api/activities/:id
 *
 * Consultation du détail d'une activité.
 */
router.get("/:id", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "COMMUNICATION", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2", "STAGIAIRE_L3", "STAGIAIRE_M2"), activity_controller_1.getActivityById);
/**
 * POST /api/activities
 *
 * Création d'une activité.
 */
router.post("/", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "COMMUNICATION", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2"), activity_controller_1.createActivity);
/**
 * PUT /api/activities/:id
 *
 * Modification d'une activité.
 */
router.put("/:id", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "COMMUNICATION", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2"), activity_controller_1.updateActivity);
/**
 * DELETE /api/activities/:id
 *
 * Suppression réservée aux rôles autorisés.
 */
router.delete("/:id", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "COORDINATOR"), activity_controller_1.deleteActivity);
exports.default = router;
//# sourceMappingURL=activities.routes.js.map