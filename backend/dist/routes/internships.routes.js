"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const internship_controller_1 = require("../controllers/internship.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
/**
 * GET /api/internships
 */
router.get("/", (0, role_middleware_1.authorizeRoles)("ADMIN", "RH", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2", "STAGIAIRE_L3", "STAGIAIRE_M2"), internship_controller_1.getInternships);
/**
 * GET /api/internships/:id
 */
router.get("/:id", (0, role_middleware_1.authorizeRoles)("ADMIN", "RH", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2", "STAGIAIRE_L3", "STAGIAIRE_M2"), internship_controller_1.getInternshipById);
/**
 * POST /api/internships
 */
router.post("/", (0, role_middleware_1.authorizeRoles)("ADMIN", "RH", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2"), internship_controller_1.createInternship);
/**
 * PUT /api/internships/:id
 */
router.put("/:id", (0, role_middleware_1.authorizeRoles)("ADMIN", "RH", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2"), internship_controller_1.updateInternship);
/**
 * DELETE /api/internships/:id
 */
router.delete("/:id", (0, role_middleware_1.authorizeRoles)("ADMIN", "RH"), internship_controller_1.deleteInternship);
exports.default = router;
//# sourceMappingURL=internships.routes.js.map