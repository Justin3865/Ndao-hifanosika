// src/routes/performanceDrop.routes.ts  (AJOUT) — GET /api/performance-drop : liste des baisses détectées (ADMIN, DIRECTION, RH).
import { Request, Response, Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import { findPerformanceDrops } from "../services/performanceDrop.service";

const router = Router();

router.get("/", authenticate, authorizeRoles("ADMIN", "DIRECTION", "RH"), async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await findPerformanceDrops() });
  } catch {
    res.status(500).json({ success: false, message: "Détection indisponible pour le moment." });
  }
});

export default router;
