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
import {
  getDatasetHistory,
  getDatasetLatest,
  getDatasetRun,
  getDatasets,
  runDatasetTest,
} from "../controllers/datasets.controller";

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

// Jeux de données : listes d'entraînement / de test (ménages, stagiaires, S&E des projets)
router.get("/datasets", authorizeRoles(...AI_ROLES), getDatasets);
router.get("/datasets/runs/:id", authorizeRoles(...AI_ROLES), getDatasetRun);
router.get("/datasets/:kind/latest", authorizeRoles(...AI_ROLES), getDatasetLatest);
router.get("/datasets/:kind/history", authorizeRoles(...AI_ROLES), getDatasetHistory);
router.post("/datasets/:kind/run", authorizeRoles("ADMIN", "DSI"), runDatasetTest);
router.delete("/models/:id", authorizeRoles("ADMIN", "DSI"), removeModel);

export default router;