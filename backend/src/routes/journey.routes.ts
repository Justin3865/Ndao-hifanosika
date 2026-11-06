import { Router } from "express";

import {
  getDropoutLabels,
  getJourneySummary,
  getJourneys,
  putJourney,
} from "../controllers/journey.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { coordinatorScope, guardBeneficiaryById } from "../middlewares/coordinatorScope.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";

const router = Router();
router.use(authenticate);

/** GET /api/journey?projectId=&status= — statut du parcours (ACTIVE par défaut) */
router.get("/", authorizeRoles("ADMIN", "DIRECTION", "COORDINATOR"), coordinatorScope, getJourneys);

/** GET /api/journey/summary?projectId= — terminés / abandons / taux d'abandon */
router.get("/summary", authorizeRoles("ADMIN", "DIRECTION", "DAF", "COORDINATOR"), coordinatorScope, getJourneySummary);

/** GET /api/journey/labels — labels 0/1 pour entraîner/évaluer le modèle (ML/compare_baseline.py) */
router.get("/labels", authorizeRoles("ADMIN", "DIRECTION"), getDropoutLabels);

/** PUT /api/journey/beneficiary/:id */
router.put("/beneficiary/:id", authorizeRoles("ADMIN", "COORDINATOR"), coordinatorScope, guardBeneficiaryById, putJourney);

export default router;
