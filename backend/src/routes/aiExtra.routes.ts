import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import {
  getAnomalyCatalog,
  getChartData,
  getComparison,
  getComparisonHistory,
  getModelHistory,
  removeModel,
  runComparison,
} from "../controllers/aiExtra.controller";

/**
 * Routes additionnelles « IA » – montées sur /api/ai (voir l'instruction de montage).
 */
const router = Router();
const AI_ROLES = ["ADMIN", "DIRECTION", "DSI", "COORDINATOR"] as const;

router.use(authenticate);

router.get("/anomalies/catalog", authorizeRoles(...AI_ROLES), getAnomalyCatalog);
router.get("/charts", authorizeRoles(...AI_ROLES), getChartData);
router.get("/compare", authorizeRoles(...AI_ROLES), getComparison);
router.get("/compare/history", authorizeRoles(...AI_ROLES), getComparisonHistory);
router.post("/compare/run", authorizeRoles("ADMIN", "DSI"), runComparison);
router.get("/models/history", authorizeRoles(...AI_ROLES), getModelHistory);
router.delete("/models/:id", authorizeRoles("ADMIN", "DSI"), removeModel);

export default router;