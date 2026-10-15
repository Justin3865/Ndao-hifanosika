"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const milestone_controller_1 = require("../controllers/milestone.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
/**
 * GET /api/milestones
 */
router.get("/", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2"), milestone_controller_1.getMilestones);
/**
 * GET /api/milestones/:id
 */
router.get("/:id", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2"), milestone_controller_1.getMilestoneById);
/**
 * POST /api/milestones
 */
router.post("/", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2"), milestone_controller_1.createMilestone);
/**
 * PUT /api/milestones/:id
 */
router.put("/:id", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2"), milestone_controller_1.updateMilestone);
/**
 * DELETE /api/milestones/:id
 */
router.delete("/:id", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "COORDINATOR"), milestone_controller_1.deleteMilestone);
exports.default = router;
//# sourceMappingURL=milestones.routes.js.map