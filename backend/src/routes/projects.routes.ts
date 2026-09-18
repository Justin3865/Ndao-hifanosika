import { Router } from "express";

import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} from "../controllers/project.controller";

const router = Router();

/**
 * GET /api/projects
 * Liste des projets
 */
router.get("/", getProjects);

/**
 * GET /api/projects/:id
 * Détails d'un projet
 */
router.get("/:id", getProjectById);

/**
 * POST /api/projects
 * Création d'un projet
 */
router.post("/", createProject);

/**
 * PUT /api/projects/:id
 * Modification d'un projet
 */
router.put("/:id", updateProject);

/**
 * DELETE /api/projects/:id
 * Suppression d'un projet
 */
router.delete("/:id", deleteProject);

export default router;