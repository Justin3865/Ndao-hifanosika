import { Router } from "express";

import {
  getBeneficiaries,
  getBeneficiaryById,
  createBeneficiary,
  updateBeneficiary,
  deleteBeneficiary,
  nextBeneficiaryCode,
  renumberBeneficiaryMatricules,
} from "../controllers/beneficiary.controller";

import { authenticate } from "../middlewares/auth.middleware";
import {
  beneficiaryIdParam,
  coordinatorScope,
  guardBodyProject,
} from "../middlewares/coordinatorScope.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";

const router = Router();

router.use(authenticate);
router.use(coordinatorScope); // périmètre des coordinateurs (lot 20261108)
router.use(guardBodyProject);
router.param("id", beneficiaryIdParam);


/**
 * GET /api/beneficiaries
 */
router.get(
  "/",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "DAF",
    "COORDINATOR",
  ),
  getBeneficiaries,
);

/**
 * GET /api/beneficiaries/next-code  (avant /:id)
 */
router.get(
  "/next-code",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "DAF",
    "COORDINATOR",
  ),
  nextBeneficiaryCode,
);

/**
 * POST /api/beneficiaries/renumber  (avant /:id)
 */
router.post(
  "/renumber",
  authorizeRoles("ADMIN"),
  renumberBeneficiaryMatricules,
);

/**
 * GET /api/beneficiaries/:id
 */
router.get(
  "/:id",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "DAF",
    "COORDINATOR",
  ),
  getBeneficiaryById,
);

/**
 * POST /api/beneficiaries
 */
router.post(
  "/",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "DAF",
    "COORDINATOR",
  ),
  createBeneficiary,
);

/**
 * PUT /api/beneficiaries/:id
 */
router.put(
  "/:id",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "DAF",
    "COORDINATOR",
  ),
  updateBeneficiary,
);

/**
 * DELETE /api/beneficiaries/:id
 */
router.delete(
  "/:id",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "COORDINATOR",
  ),
  deleteBeneficiary,
);

export default router;