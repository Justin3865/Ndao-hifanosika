import { Router } from "express";

import { previewRetention, runRetention } from "../controllers/retention.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";

const router = Router();
router.use(authenticate);

/** GET /api/admin/retention — simulation (ADMIN, DSI) */
router.get("/", authorizeRoles("ADMIN", "DSI"), previewRetention);
/** POST /api/admin/retention { confirm: true } — exécution (ADMIN seul) */
router.post("/", authorizeRoles("ADMIN"), runRetention);

export default router;
