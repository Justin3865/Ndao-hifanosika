import { Router } from "express";

import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  activateUser,
  rejectUser,
} from "../controllers/user.controller";

import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";

const router = Router();

/**
 * Toutes les routes /api/users nécessitent une authentification.
 */
router.use(authenticate);

/**
 * GET /api/users
 *
 * ADMIN : accès complet
 * DSI   : consultation technique des utilisateurs
 */
router.get(
  "/",
  authorizeRoles("ADMIN", "DSI"),
  getUsers,
);

/**
 * GET /api/users/:id
 *
 * ADMIN : accès complet
 * DSI   : consultation technique
 */
router.get(
  "/:id",
  authorizeRoles("ADMIN", "DSI"),
  getUserById,
);

/**
 * POST /api/users
 *
 * ADMIN uniquement.
 */
router.post(
  "/",
  authorizeRoles("ADMIN"),
  createUser,
);

/**
 * PUT /api/users/:id
 *
 * ADMIN uniquement.
 */
router.put(
  "/:id",
  authorizeRoles("ADMIN"),
  updateUser,
);

/**
 * DELETE /api/users/:id
 *
 * ADMIN uniquement.
 */
router.delete(
  "/:id",
  authorizeRoles("ADMIN"),
  deleteUser,
);

/**
 * PATCH /api/users/:id/activate
 *
 * ADMIN uniquement.
 */
router.patch(
  "/:id/activate",
  authorizeRoles("ADMIN"),
  activateUser,
);

/**
 * PATCH /api/users/:id/reject
 *
 * ADMIN uniquement.
 */
router.patch(
  "/:id/reject",
  authorizeRoles("ADMIN"),
  rejectUser,
);

export default router;