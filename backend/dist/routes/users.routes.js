"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
/**
 * GET /api/users
 */
router.get("/", (0, role_middleware_1.authorizeRoles)("ADMIN", "DSI", "RH"), user_controller_1.getUsers);
/**
 * GET /api/users/:id
 */
router.get("/:id", (0, role_middleware_1.authorizeRoles)("ADMIN", "DSI", "RH"), user_controller_1.getUserById);
/**
 * POST /api/users
 */
router.post("/", (0, role_middleware_1.authorizeRoles)("ADMIN"), user_controller_1.createUser);
/**
 * PUT /api/users/:id
 */
router.put("/:id", (0, role_middleware_1.authorizeRoles)("ADMIN"), user_controller_1.updateUser);
/**
 * DELETE /api/users/:id
 */
router.delete("/:id", (0, role_middleware_1.authorizeRoles)("ADMIN"), user_controller_1.deleteUser);
/**
 * PATCH /api/users/:id/activate
 */
router.patch("/:id/activate", (0, role_middleware_1.authorizeRoles)("ADMIN"), user_controller_1.activateUser);
/**
 * PATCH /api/users/:id/reject
 */
router.patch("/:id/reject", (0, role_middleware_1.authorizeRoles)("ADMIN"), user_controller_1.rejectUser);
exports.default = router;
//# sourceMappingURL=users.routes.js.map