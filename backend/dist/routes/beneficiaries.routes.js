"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const beneficiary_controller_1 = require("../controllers/beneficiary.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
/**
 * GET /api/beneficiaries
 */
router.get("/", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "DAF", "COORDINATOR"), beneficiary_controller_1.getBeneficiaries);
/**
 * GET /api/beneficiaries/:id
 */
router.get("/:id", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "DAF", "COORDINATOR"), beneficiary_controller_1.getBeneficiaryById);
/**
 * POST /api/beneficiaries
 */
router.post("/", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "DAF", "COORDINATOR"), beneficiary_controller_1.createBeneficiary);
/**
 * PUT /api/beneficiaries/:id
 */
router.put("/:id", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "DAF", "COORDINATOR"), beneficiary_controller_1.updateBeneficiary);
/**
 * DELETE /api/beneficiaries/:id
 */
router.delete("/:id", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "COORDINATOR"), beneficiary_controller_1.deleteBeneficiary);
exports.default = router;
//# sourceMappingURL=beneficiaries.routes.js.map