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

router.use(authenticate);

/**
 * GET /api/users
 */
router.get(
  "/",
  authorizeRoles(
    "ADMIN",
    "DSI",
    "RH",
  ),
  getUsers,
);

/**
 * GET /api/users/:id
 */
router.get(
  "/:id",
  authorizeRoles(
    "ADMIN",
    "DSI",
    "RH",
  ),
  getUserById,
);

/**
 * POST /api/users
 */
router.post(
  "/",
  authorizeRoles("ADMIN"),
  createUser,
);

/**
 * PUT /api/users/:id
 */
router.put(
  "/:id",
  authorizeRoles("ADMIN"),
  updateUser,
);

/**
 * DELETE /api/users/:id
 */
router.delete(
  "/:id",
  authorizeRoles("ADMIN"),
  deleteUser,
);

/**
 * PATCH /api/users/:id/activate
 */
router.patch(
  "/:id/activate",
  authorizeRoles("ADMIN"),
  activateUser,
);

/**
 * PATCH /api/users/:id/reject
 */
router.patch(
  "/:id/reject",
  authorizeRoles("ADMIN"),
  rejectUser,
);

export default router;