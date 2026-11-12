import { Router } from "express";

import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  nextProjectCode,
  renumberProjectCodes,
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
    "STAGIAIRE_L3",
    "STAGIAIRE_M2",
    "STAGIAIRE_L1",
    "STAGIAIRE_L2",
    "STAGIAIRE_M1",
  ),
  getProjects,
);

/**
 * GET /api/projects/next-code  (avant /:id)
 */
router.get(
  "/next-code",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "DAF",
    "COORDINATOR",
  ),
  nextProjectCode,
);

/**
 * POST /api/projects/renumber  (avant /:id)
 */
router.post(
  "/renumber",
  authorizeRoles("ADMIN"),
  renumberProjectCodes,
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
    "STAGIAIRE_L3",
    "STAGIAIRE_M2",
    "STAGIAIRE_L1",
    "STAGIAIRE_L2",
    "STAGIAIRE_M1",
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