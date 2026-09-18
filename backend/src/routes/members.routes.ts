import { Router } from "express";

import {
  getMembers,
  getMemberById,
  updateMember,
  deactivateMember,
} from "../controllers/member.controller";

const router = Router();

/**
 * GET /api/members
 * Liste des membres actifs
 */
router.get("/", getMembers);

/**
 * GET /api/members/:id
 * Détails d'un membre
 */
router.get("/:id", getMemberById);

/**
 * PUT /api/members/:id
 * Modification d'un membre
 */
router.put("/:id", updateMember);

/**
 * PATCH /api/members/:id/deactivate
 * Désactivation d'un membre
 */
router.patch("/:id/deactivate", deactivateMember);

export default router;