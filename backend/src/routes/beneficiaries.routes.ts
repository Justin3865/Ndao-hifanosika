import { Router } from "express";

import {
  getBeneficiaries,
  getBeneficiaryById,
  createBeneficiary,
  updateBeneficiary,
  deleteBeneficiary,
} from "../controllers/beneficiary.controller";

import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";

const router = Router();

router.use(authenticate);

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