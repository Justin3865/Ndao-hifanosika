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

// Toutes les routes Projects nécessitent une authentification
router.use(authenticate);

/**
 * GET /api/projects
 * ADMIN : tous les projets
 * DIRECTION / DAF : accès aux projets
 * COORDINATOR : projets autorisés
 */
router.get(
  "/",
  authorizeRoles("ADMIN", "DIRECTION", "DAF", "COORDINATOR"),
  getProjects,
);

/**
 * GET /api/projects/:id
 */
router.get(
  "/:id",
  authorizeRoles("ADMIN", "DIRECTION", "DAF", "COORDINATOR"),
  getProjectById,
);

/**
 * POST /api/projects
 * ADMIN : création globale
 * DIRECTION / DAF / COORDINATOR : création selon leurs droits
 */
router.post(
  "/",
  authorizeRoles("ADMIN", "DIRECTION", "DAF", "COORDINATOR"),
  createProject,
);

/**
 * PUT /api/projects/:id
 */
router.put(
  "/:id",
  authorizeRoles("ADMIN", "DIRECTION", "DAF", "COORDINATOR"),
  updateProject,
);

/**
 * DELETE /api/projects/:id
 * ADMIN uniquement
 */
router.delete(
  "/:id",
  authorizeRoles("ADMIN"),
  deleteProject,
);

export default router;