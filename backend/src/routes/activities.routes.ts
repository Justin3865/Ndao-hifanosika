import { Router } from "express";

import {
  getActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
} from "../controllers/activity.controller";

import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";

const router = Router();

/*
 * Toutes les routes /activities nécessitent
 * un JWT Bearer valide et un utilisateur ACTIVE.
 */
router.use(authenticate);

/**
 * GET /api/activities
 *
 * Consultation des activités.
 */
router.get(
  "/",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "COMMUNICATION",
    "COORDINATOR",
    "TUTEUR_L3",
    "TUTEUR_M2",
    "STAGIAIRE_L3",
    "STAGIAIRE_M2",
  ),
  getActivities,
);

/**
 * GET /api/activities/:id
 *
 * Consultation du détail d'une activité.
 */
router.get(
  "/:id",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "COMMUNICATION",
    "COORDINATOR",
    "TUTEUR_L3",
    "TUTEUR_M2",
    "STAGIAIRE_L3",
    "STAGIAIRE_M2",
  ),
  getActivityById,
);

/**
 * POST /api/activities
 *
 * Création d'une activité.
 */
router.post(
  "/",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "COMMUNICATION",
    "COORDINATOR",
    "TUTEUR_L3",
    "TUTEUR_M2",
  ),
  createActivity,
);

/**
 * PUT /api/activities/:id
 *
 * Modification d'une activité.
 */
router.put(
  "/:id",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "COMMUNICATION",
    "COORDINATOR",
    "TUTEUR_L3",
    "TUTEUR_M2",
  ),
  updateActivity,
);

/**
 * DELETE /api/activities/:id
 *
 * Suppression réservée aux rôles autorisés.
 */
router.delete(
  "/:id",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "COORDINATOR",
  ),
  deleteActivity,
);

export default router;