import { Router } from "express";

import {
  login,
  register,
  logout,
  refresh,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  me,
} from "../controllers/auth.controller";

import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

/**
 * POST /api/auth/login
 *
 * Public
 */
router.post("/login", login);

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
router.post("/register", register);

/**
 * POST /api/auth/logout
 *
 * JWT recommandé côté frontend.
 * Le frontend supprime les tokens après déconnexion.
 */
router.post("/logout", logout);

/**
 * POST /api/auth/refresh
 *
 * Public au niveau middleware.
 * Le refresh token est vérifié dans le controller.
 */
router.post("/refresh", refresh);

/**
 * POST /api/auth/forgot-password
 *
 * Public
 */
router.post(
  "/forgot-password",
  forgotPassword,
);

/**
 * POST /api/auth/verify-reset-code
 *
 * Public
 */
router.post(
  "/verify-reset-code",
  verifyResetCode,
);

/**
 * POST /api/auth/reset-password
 *
 * Public
 */
router.post(
  "/reset-password",
  resetPassword,
);

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
router.get(
  "/me",
  authenticate,
  me,
);

export default router;