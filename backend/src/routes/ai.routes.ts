import { Router } from "express";

import {
  aiHealth,
  scoreDropoutRisk,
} from "../controllers/ai.controller";

import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import { chat, getHouseholds, getModels, trainModels } from "../controllers/ml.controller";
import {
  getAnomalies,
  getDropoutRiskList,
  getPerformance,
  getSummary,
} from "../controllers/insights.controller";

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

const AI_ROLES = ["ADMIN", "DIRECTION", "DSI", "COORDINATOR"] as const;

router.get("/summary", authorizeRoles(...AI_ROLES), getSummary);
router.get("/performance", authorizeRoles(...AI_ROLES), getPerformance);
router.get("/anomalies", authorizeRoles(...AI_ROLES), getAnomalies);
router.get("/dropout-risk", authorizeRoles(...AI_ROLES), getDropoutRiskList);

router.post("/train", authorizeRoles("ADMIN", "DSI"), trainModels);
router.get("/models", authorizeRoles(...AI_ROLES), getModels);

// Données personnelles de ménages : ADMIN, DIRECTION, COORDINATOR uniquement
const FIELD_ROLES = ["ADMIN", "DIRECTION", "COORDINATOR"] as const;
router.get("/households", authorizeRoles(...FIELD_ROLES), getHouseholds);
router.post("/chat", authorizeRoles(...FIELD_ROLES), chat);

export default router;