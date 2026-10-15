"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const member_controller_1 = require("../controllers/member.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
/**
 * GET /api/members
 */
router.get("/", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "RH", "COORDINATOR"), member_controller_1.getMembers);
/**
 * GET /api/members/:id
 */
router.get("/:id", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "RH", "COORDINATOR"), member_controller_1.getMemberById);
/**
 * PUT /api/members/:id
 */
router.put("/:id", (0, role_middleware_1.authorizeRoles)("ADMIN", "RH"), member_controller_1.updateMember);
/**
 * PATCH /api/members/:id/deactivate
 */
router.patch("/:id/deactivate", (0, role_middleware_1.authorizeRoles)("ADMIN", "RH"), member_controller_1.deactivateMember);
exports.default = router;
//# sourceMappingURL=members.routes.js.map