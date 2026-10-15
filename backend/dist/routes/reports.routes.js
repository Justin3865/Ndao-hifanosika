"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const report_controller_1 = require("../controllers/report.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
/**
 * GET /api/reports/dashboard
 */
router.get("/dashboard", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "DAF", "RH", "COMMUNICATION", "COORDINATOR"), report_controller_1.getDashboardReport);
/**
 * GET /api/reports/projects/:projectId
 */
router.get("/projects/:projectId", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "DAF", "COMMUNICATION", "COORDINATOR"), report_controller_1.getProjectReport);
/**
 * GET /api/reports/evaluations
 */
router.get("/evaluations", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "RH", "COORDINATOR"), report_controller_1.getEvaluationReport);
/**
 * GET /api/reports/beneficiaries
 */
router.get("/beneficiaries", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "DAF", "RH", "COORDINATOR"), report_controller_1.getBeneficiaryReport);
exports.default = router;
//# sourceMappingURL=reports.routes.js.map