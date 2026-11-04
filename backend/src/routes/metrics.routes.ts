import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import { queueStats } from "../utils/jobQueue";
import { snapshot } from "../utils/perfStats";

const router = Router();

router.use(authenticate);

/** GET /api/metrics/perf — p50/p95 par route + état de la file d'attente (admin / DSI / direction) */
router.get("/perf", authorizeRoles("ADMIN", "DSI", "DIRECTION"), (_req, res) => {
  const routes = snapshot();
  res.json({
    success: true,
    data: {
      targetMs: Number(process.env.PERF_SLOW_MS || 500),
      routes: routes.slice(0, 50),
      overBudget: routes.filter((r) => !r.route.includes("/api/ai") && r.p95 > Number(process.env.PERF_SLOW_MS || 500)),
      queue: queueStats(),
      uptimeSeconds: Math.round(process.uptime()),
    },
  });
});

export default router;
