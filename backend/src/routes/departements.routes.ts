import { Router } from "express";

import {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "../controllers/departement.controller";

const router = Router();

/**
 * GET /api/departements
 * Liste des départements
 */
router.get("/", getDepartments);

/**
 * GET /api/departements/:id
 * Détails d'un département
 */
router.get("/:id", getDepartmentById);

/**
 * POST /api/departements
 * Création d'un département
 */
router.post("/", createDepartment);

/**
 * PUT /api/departements/:id
 * Modification d'un département
 */
router.put("/:id", updateDepartment);

/**
 * DELETE /api/departements/:id
 * Suppression d'un département
 */
router.delete("/:id", deleteDepartment);

export default router;