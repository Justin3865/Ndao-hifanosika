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
  changePassword,
} from "../controllers/auth.controller";

import { authenticate } from "../middlewares/auth.middleware";
import { twoFactorGate } from "../middlewares/twoFactorGate.middleware";
import { loginRateLimit, resetRateLimit } from "../middlewares/loginRateLimit.middleware";

const router = Router();

/**
 * POST /api/auth/login
 *
 * Public
 *
 * twoFactorGate : si le compte a activé l'authentification à deux facteurs, réclame le code
 * de l'application d'authentification avant de laisser le contrôleur ouvrir la session.
 */
router.post("/login", loginRateLimit, twoFactorGate, login);

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
router.post("/register", resetRateLimit, register);

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
  resetRateLimit,
  forgotPassword,
);

/**
 * POST /api/auth/verify-reset-code
 *
 * Public
 */
router.post(
  "/verify-reset-code",
  resetRateLimit,
  verifyResetCode,
);

/**
 * POST /api/auth/reset-password
 *
 * Public
 */
router.post(
  "/reset-password",
  resetRateLimit,
  resetPassword,
);

/**
 * POST /api/auth/change-password
 *
 * Protégé par JWT. Corps : { currentPassword, newPassword, confirmPassword? }
 * (contrat de srcf/src/services/auth.service.ts::changePassword).
 */
router.post("/change-password", authenticate, changePassword);

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