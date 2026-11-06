import { Router } from "express";

import { listConsents, putConsent, revokeConsent } from "../controllers/consents.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { coordinatorScope, guardBeneficiaryById } from "../middlewares/coordinatorScope.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";

const router = Router();
router.use(authenticate);

router.get("/", authorizeRoles("ADMIN", "DIRECTION", "COORDINATOR"), coordinatorScope, listConsents);
router.put("/beneficiary/:id", authorizeRoles("ADMIN", "COORDINATOR"), coordinatorScope, guardBeneficiaryById, putConsent);
router.delete("/beneficiary/:id", authorizeRoles("ADMIN", "COORDINATOR"), coordinatorScope, guardBeneficiaryById, revokeConsent);

export default router;
