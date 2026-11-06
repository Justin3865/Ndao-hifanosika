import { Router } from "express";

import {
  OBJECTIVE_MANAGERS,
  createObjective,
  deleteObjective,
  listObjectives,
  objectiveAlerts,
  updateObjective,
  updateProgress,
} from "../controllers/objectives.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";

const router = Router();
router.use(authenticate);

/** GET /api/objectives?userId= — chacun lit les siens ; ADMIN/RH/DIRECTION lisent ceux des autres */
router.get("/", listObjectives);
/** GET /api/objectives/alerts — objectifs en retard */
router.get("/alerts", authorizeRoles(...OBJECTIVE_MANAGERS), objectiveAlerts);
router.post("/", authorizeRoles("ADMIN", "RH"), createObjective);
router.put("/:id", authorizeRoles("ADMIN", "RH"), updateObjective);
/** PATCH /api/objectives/:id/progress — le propriétaire ou un gestionnaire */
router.patch("/:id/progress", updateProgress);
router.delete("/:id", authorizeRoles("ADMIN", "RH"), deleteObjective);

export default router;
