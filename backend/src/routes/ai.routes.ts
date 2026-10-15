import { Router } from "express";

import {
  aiHealth,
  scoreDropoutRisk,
} from "../controllers/ai.controller";

import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";

const router = Router();

router.use(authenticate);

/**
 * GET /api/ai/health
 */
router.get(
  "/health",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "DSI",
    "COORDINATOR",
  ),
  aiHealth,
);

/**
 * POST /api/ai/score/dropout-risk
 */
router.post(
  "/score/dropout-risk",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "DSI",
    "COORDINATOR",
  ),
  scoreDropoutRisk,
);

export default router;