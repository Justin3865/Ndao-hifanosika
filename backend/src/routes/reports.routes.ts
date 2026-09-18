import { Router } from "express";

import {
  getDashboardReport,
  getProjectReport,
  getEvaluationReport,
  getBeneficiaryReport,
} from "../controllers/report.controller";

const router = Router();

router.get("/dashboard", getDashboardReport);
router.get("/projects/:projectId", getProjectReport);
router.get("/evaluations", getEvaluationReport);
router.get("/beneficiaries", getBeneficiaryReport);

export default router;