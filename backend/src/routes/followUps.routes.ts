import { Router } from "express";

import {
  getFollowUpImpact,
  getFollowUps,
  postFollowUpSync,
  putFollowUpComplete,
} from "../controllers/followUp.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";

const router = Router();

router.use(authenticate);

/** GET /api/follow-ups?projectId=&status=&horizon= */
router.get("/", authorizeRoles("ADMIN", "DIRECTION", "COORDINATOR"), getFollowUps);

/** GET /api/follow-ups/impact?projectId= — taux de réponse, d'insertion, satisfaction par horizon */
router.get("/impact", authorizeRoles("ADMIN", "DIRECTION", "DAF", "COORDINATOR"), getFollowUpImpact);

/** POST /api/follow-ups/sync — crée les relances manquantes (aussi exécuté automatiquement) */
router.post("/sync", authorizeRoles("ADMIN", "DIRECTION", "COORDINATOR"), postFollowUpSync);

/** PUT /api/follow-ups/:id/complete */
router.put("/:id/complete", authorizeRoles("ADMIN", "COORDINATOR"), putFollowUpComplete);

export default router;
