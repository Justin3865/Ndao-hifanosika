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

const router = Router();

/**
 * POST /api/auth/login
 */
router.post("/login", login);

/**
 * POST /api/auth/register
 */
router.post("/register", register);

/**
 * POST /api/auth/logout
 */
router.post("/logout", logout);

/**
 * POST /api/auth/refresh
 */
router.post("/refresh", refresh);

/**
 * POST /api/auth/forgot-password
 */
router.post("/forgot-password", forgotPassword);

/**
 * POST /api/auth/verify-reset-code
 */
router.post("/verify-reset-code", verifyResetCode);

/**
 * POST /api/auth/reset-password
 */
router.post("/reset-password", resetPassword);

/**
 * GET /api/auth/me/:id
 */
router.get("/me/:id", me);

export default router;