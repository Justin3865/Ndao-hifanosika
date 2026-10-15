"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const evaluation_controller_1 = require("../controllers/evaluation.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
/**
 * GET /api/evaluations
 */
router.get("/", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2", "STAGIAIRE_L3", "STAGIAIRE_M2"), evaluation_controller_1.getEvaluations);
/**
 * GET /api/evaluations/:id
 */
router.get("/:id", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2", "STAGIAIRE_L3", "STAGIAIRE_M2"), evaluation_controller_1.getEvaluationById);
/**
 * POST /api/evaluations
 */
router.post("/", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2", "STAGIAIRE_L3", "STAGIAIRE_M2"), evaluation_controller_1.createEvaluation);
/**
 * PUT /api/evaluations/:id
 */
router.put("/:id", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2"), evaluation_controller_1.updateEvaluation);
/**
 * DELETE /api/evaluations/:id
 */
router.delete("/:id", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "COORDINATOR"), evaluation_controller_1.deleteEvaluation);
exports.default = router;
//# sourceMappingURL=evaluations.routes.js.map