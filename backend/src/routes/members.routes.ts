import { Router } from "express";

import {
  getMembers,
  getMemberById,
  updateMember,
  deactivateMember,
} from "../controllers/member.controller";

import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";

const router = Router();

router.use(authenticate);

/**
 * GET /api/members
 */
router.get(
  "/",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "RH",
    "COORDINATOR",
  ),
  getMembers,
);

/**
 * GET /api/members/:id
 */
router.get(
  "/:id",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "RH",
    "COORDINATOR",
  ),
  getMemberById,
);

/**
 * PUT /api/members/:id
 */
router.put(
  "/:id",
  authorizeRoles(
    "ADMIN",
    "RH",
  ),
  updateMember,
);

/**
 * PATCH /api/members/:id/deactivate
 */
router.patch(
  "/:id/deactivate",
  authorizeRoles(
    "ADMIN",
    "RH",
  ),
  deactivateMember,
);

export default router;