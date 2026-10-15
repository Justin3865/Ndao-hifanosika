import { Router } from "express";

import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} from "../controllers/project.controller";

import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";

const router = Router();

router.use(authenticate);

/**
 * GET /api/projects
 */
router.get(
  "/",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "DAF",
    "COMMUNICATION",
    "COORDINATOR",
  ),
  getProjects,
);

/**
 * GET /api/projects/:id
 */
router.get(
  "/:id",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "DAF",
    "COMMUNICATION",
    "COORDINATOR",
  ),
  getProjectById,
);

/**
 * POST /api/projects
 */
router.post(
  "/",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "DAF",
    "COORDINATOR",
  ),
  createProject,
);

/**
 * PUT /api/projects/:id
 */
router.put(
  "/:id",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "DAF",
    "COORDINATOR",
  ),
  updateProject,
);

/**
 * DELETE /api/projects/:id
 */
router.delete(
  "/:id",
  authorizeRoles("ADMIN"),
  deleteProject,
);

export default router;