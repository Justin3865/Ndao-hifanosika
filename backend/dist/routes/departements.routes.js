"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const departement_controller_1 = require("../controllers/departement.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
/**
 * GET /api/departements
 */
router.get("/", (0, role_middleware_1.authorizeRoles)("ADMIN", "DSI", "RH"), departement_controller_1.getDepartments);
/**
 * GET /api/departements/:id
 */
router.get("/:id", (0, role_middleware_1.authorizeRoles)("ADMIN", "DSI", "RH"), departement_controller_1.getDepartmentById);
/**
 * POST /api/departements
 */
router.post("/", (0, role_middleware_1.authorizeRoles)("ADMIN", "DSI"), departement_controller_1.createDepartment);
/**
 * PUT /api/departements/:id
 */
router.put("/:id", (0, role_middleware_1.authorizeRoles)("ADMIN", "DSI"), departement_controller_1.updateDepartment);
/**
 * DELETE /api/departements/:id
 */
router.delete("/:id", (0, role_middleware_1.authorizeRoles)("ADMIN"), departement_controller_1.deleteDepartment);
exports.default = router;
//# sourceMappingURL=departements.routes.js.map