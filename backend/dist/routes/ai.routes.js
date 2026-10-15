"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ai_controller_1 = require("../controllers/ai.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
/**
 * GET /api/ai/health
 */
router.get("/health", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "DSI", "COORDINATOR"), ai_controller_1.aiHealth);
/**
 * POST /api/ai/score/dropout-risk
 */
router.post("/score/dropout-risk", (0, role_middleware_1.authorizeRoles)("ADMIN", "DIRECTION", "DSI", "COORDINATOR"), ai_controller_1.scoreDropoutRisk);
exports.default = router;
//# sourceMappingURL=ai.routes.js.map