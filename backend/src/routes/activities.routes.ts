import { Router } from "express";

import {
  getActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
} from "../controllers/activity.controller";

const router = Router();

/**
 * GET /api/activities
 * Liste des activités
 */
router.get("/", getActivities);

/**
 * GET /api/activities/:id
 * Détails d'une activité
 */
router.get("/:id", getActivityById);

/**
 * POST /api/activities
 * Création d'une activité
 */
router.post("/", createActivity);

/**
 * PUT /api/activities/:id
 * Modification d'une activité
 */
router.put("/:id", updateActivity);

/**
 * DELETE /api/activities/:id
 * Suppression d'une activité
 */
router.delete("/:id", deleteActivity);

export default router;