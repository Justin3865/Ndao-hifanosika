import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import { getAlerts, postNotify } from "../controllers/anomalyAlerts.controller";

const router = Router();

router.use(authenticate);

/** POST /api/ai/anomalies/notify : analyser et envoyer les alertes (ou aperçu avec dryRun). */
router.post("/anomalies/notify", authorizeRoles("ADMIN", "DIRECTION", "DSI"), postNotify);

/** GET /api/ai/anomalies/alerts : historique des analyses + configuration. */
router.get("/anomalies/alerts", authorizeRoles("ADMIN", "DIRECTION", "DSI", "COORDINATOR"), getAlerts);

export default router;
