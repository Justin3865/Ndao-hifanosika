import { Router } from "express";

import {
  getMilestones,
  getMilestoneById,
  createMilestone,
  updateMilestone,
  deleteMilestone,
} from "../controllers/milestone.controller";

import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";

const router = Router();

router.use(authenticate);

/**
 * GET /api/milestones
 */
router.get(
  "/",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "COORDINATOR",
    "TUTEUR_L3",
    "TUTEUR_M2",
  ),
  getMilestones,
);

/**
 * GET /api/milestones/:id
 */
router.get(
  "/:id",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "COORDINATOR",
    "TUTEUR_L3",
    "TUTEUR_M2",
  ),
  getMilestoneById,
);

/**
 * POST /api/milestones
 */
router.post(
  "/",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "COORDINATOR",
    "TUTEUR_L3",
    "TUTEUR_M2",
  ),
  createMilestone,
);

/**
 * PUT /api/milestones/:id
 */
router.put(
  "/:id",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "COORDINATOR",
    "TUTEUR_L3",
    "TUTEUR_M2",
  ),
  updateMilestone,
);

/**
 * DELETE /api/milestones/:id
 */
router.delete(
  "/:id",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "COORDINATOR",
  ),
  deleteMilestone,
);

export default router;