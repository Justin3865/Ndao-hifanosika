import { Router } from "express";

import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/user.controller";

const router = Router();

/**
 * GET /api/users
 * Liste des utilisateurs
 */
router.get("/", getUsers);

/**
 * GET /api/users/:id
 * Détails d'un utilisateur
 */
router.get("/:id", getUserById);

/**
 * POST /api/users
 * Création d'un utilisateur
 */
router.post("/", createUser);

/**
 * PUT /api/users/:id
 * Modification d'un utilisateur
 */
router.put("/:id", updateUser);

/**
 * DELETE /api/users/:id
 * Suppression d'un utilisateur
 */
router.delete("/:id", deleteUser);

export default router;