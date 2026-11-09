// src/routes/kpi.routes.ts  (AJOUT) — GET /api/kpi : indicateurs §13 (ADMIN, DIRECTION, DSI). Lecture seule.
import { Request, Response, Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import { computeKpis } from "../services/kpi.service";

const router = Router();

router.get("/", authenticate, authorizeRoles("ADMIN", "DIRECTION", "DSI"), async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await computeKpis() });
  } catch {
    res.status(500).json({ success: false, message: "Indicateurs indisponibles pour le moment." });
  }
});

export default router;
