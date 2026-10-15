import { Router } from "express";

import {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "../controllers/departement.controller";

import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";

const router = Router();

router.use(authenticate);

/**
 * GET /api/departements
 */
router.get(
  "/",
  authorizeRoles(
    "ADMIN",
    "DSI",
    "RH",
  ),
  getDepartments,
);

/**
 * GET /api/departements/:id
 */
router.get(
  "/:id",
  authorizeRoles(
    "ADMIN",
    "DSI",
    "RH",
  ),
  getDepartmentById,
);

/**
 * POST /api/departements
 */
router.post(
  "/",
  authorizeRoles(
    "ADMIN",
    "DSI",
  ),
  createDepartment,
);

/**
 * PUT /api/departements/:id
 */
router.put(
  "/:id",
  authorizeRoles(
    "ADMIN",
    "DSI",
  ),
  updateDepartment,
);

/**
 * DELETE /api/departements/:id
 */
router.delete(
  "/:id",
  authorizeRoles("ADMIN"),
  deleteDepartment,
);

export default router;