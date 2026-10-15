import { Router } from "express";

import {
  getDashboardReport,
  getProjectReport,
  getEvaluationReport,
  getBeneficiaryReport,
} from "../controllers/report.controller";

import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";

const router = Router();

router.use(authenticate);

/**
 * GET /api/reports/dashboard
 */
router.get(
  "/dashboard",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "DAF",
    "RH",
    "COMMUNICATION",
    "COORDINATOR",
  ),
  getDashboardReport,
);

/**
 * GET /api/reports/projects/:projectId
 */
router.get(
  "/projects/:projectId",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "DAF",
    "COMMUNICATION",
    "COORDINATOR",
  ),
  getProjectReport,
);

/**
 * GET /api/reports/evaluations
 */
router.get(
  "/evaluations",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "RH",
    "COORDINATOR",
  ),
  getEvaluationReport,
);

/**
 * GET /api/reports/beneficiaries
 */
router.get(
  "/beneficiaries",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "DAF",
    "RH",
    "COORDINATOR",
  ),
  getBeneficiaryReport,
);

export default router;