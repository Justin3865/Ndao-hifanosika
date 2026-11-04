import { Router } from "express";

import { sendError } from "../middlewares/error.middleware";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import { getNarrative } from "../services/narrative.service";

const router = Router();

router.use(authenticate);

/** GET /api/ai/narrative?period=T3 2026 — synthèse narrative automatique (aide à la décision) */
router.get("/narrative", authorizeRoles("ADMIN", "DIRECTION", "DSI", "DAF", "COORDINATOR"), async (req, res) => {
  try {
    const period = typeof req.query.period === "string" ? req.query.period.slice(0, 80) : undefined;
    res.json({ success: true, data: await getNarrative(period) });
  } catch (error) {
    sendError(res, error, "Erreur lors de la génération de la synthèse");
  }
});

export default router;
