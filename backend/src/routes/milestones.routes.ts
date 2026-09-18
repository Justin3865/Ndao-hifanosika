import { Router } from "express";

import {
  getMilestones,
  getMilestoneById,
  createMilestone,
  updateMilestone,
  deleteMilestone,
} from "../controllers/milestone.controller";

const router = Router();

/**
 * GET /api/milestones
 * Liste des jalons
 */
router.get("/", getMilestones);

/**
 * GET /api/milestones/:id
 * Détails d'un jalon
 */
router.get("/:id", getMilestoneById);

/**
 * POST /api/milestones
 * Création d'un jalon
 */
router.post("/", createMilestone);

/**
 * PUT /api/milestones/:id
 * Modification d'un jalon
 */
router.put("/:id", updateMilestone);

/**
 * DELETE /api/milestones/:id
 * Suppression d'un jalon
 */
router.delete("/:id", deleteMilestone);

export default router;