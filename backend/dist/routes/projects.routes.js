"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const project_controller_1 = require("../controllers/project.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
/**
 * GET /api/projects
 */
router.get("/", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "DAF", "COMMUNICATION", "COORDINATOR"), project_controller_1.getProjects);
/**
 * GET /api/projects/:id
 */
router.get("/:id", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "DAF", "COMMUNICATION", "COORDINATOR"), project_controller_1.getProjectById);
/**
 * POST /api/projects
 */
router.post("/", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "DAF", "COORDINATOR"), project_controller_1.createProject);
/**
 * PUT /api/projects/:id
 */
router.put("/:id", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "DAF", "COORDINATOR"), project_controller_1.updateProject);
/**
 * DELETE /api/projects/:id
 */
router.delete("/:id", (0, role_middleware_1.authorizeRoles)("ADMIN"), project_controller_1.deleteProject);
exports.default = router;
//# sourceMappingURL=projects.routes.js.map