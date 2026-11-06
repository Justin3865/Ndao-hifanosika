import { Router } from "express";

import { exportJson } from "../controllers/exports.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { coordinatorScope } from "../middlewares/coordinatorScope.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";

const router = Router();
router.use(authenticate);

// Le droit exact dépend du jeu de données (voir canExport dans utils/gapRules.ts).
router.get("/json", authorizeRoles("ADMIN", "DIRECTION", "DAF", "RH", "COMMUNICATION", "COORDINATOR"), coordinatorScope, exportJson);

export default router;
