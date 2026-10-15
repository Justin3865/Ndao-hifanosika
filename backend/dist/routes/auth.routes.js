"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
/**
 * POST /api/auth/login
 *
 * Public
 */
router.post("/login", auth_controller_1.login);
/**
 * POST /api/auth/register
 *
 * Public
 *
 * Le rôle envoyé par le frontend est ignoré
 * par le controller.
 * Le compte créé est :
 *   role   = STAGIAIRE_L3
 *   status = PENDING
 */
router.post("/register", auth_controller_1.register);
/**
 * POST /api/auth/logout
 *
 * JWT recommandé côté frontend.
 * Le frontend supprime les tokens après déconnexion.
 */
router.post("/logout", auth_controller_1.logout);
/**
 * POST /api/auth/refresh
 *
 * Public au niveau middleware.
 * Le refresh token est vérifié dans le controller.
 */
router.post("/refresh", auth_controller_1.refresh);
/**
 * POST /api/auth/forgot-password
 *
 * Public
 */
router.post("/forgot-password", auth_controller_1.forgotPassword);
/**
 * POST /api/auth/verify-reset-code
 *
 * Public
 */
router.post("/verify-reset-code", auth_controller_1.verifyResetCode);
/**
 * POST /api/auth/reset-password
 *
 * Public
 */
router.post("/reset-password", auth_controller_1.resetPassword);
/**
 * GET /api/auth/me
 *
 * Protected by JWT.
 *
 * Le userId est récupéré depuis le JWT :
 *
 * Authorization: Bearer <accessToken>
 *
 * Il n'est plus possible de demander :
 * /auth/me/:id
 */
router.get("/me", auth_middleware_1.authenticate, auth_controller_1.me);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map