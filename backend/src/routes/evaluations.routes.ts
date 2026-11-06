import { Router } from "express";

import {
  getEvaluations,
  getEvaluationById,
  createEvaluation,
  updateEvaluation,
  deleteEvaluation,
} from "../controllers/evaluation.controller";

import { authenticate } from "../middlewares/auth.middleware";
import {
  coordinatorScope,
  evaluationIdParam,
  guardBodyProject,
} from "../middlewares/coordinatorScope.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";

const router = Router();

router.use(authenticate);
router.use(coordinatorScope); // périmètre des coordinateurs (lot 20261108)
router.use(guardBodyProject);
router.param("id", evaluationIdParam);


/**
 * GET /api/evaluations
 */
router.get(
  "/",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "COORDINATOR",
    "TUTEUR_L3",
    "TUTEUR_M2",
    "STAGIAIRE_L3",
    "STAGIAIRE_M2",
    "STAGIAIRE_L1",
    "STAGIAIRE_L2",
    "STAGIAIRE_M1",
  ),
  getEvaluations,
);

/**
 * GET /api/evaluations/:id
 */
router.get(
  "/:id",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "COORDINATOR",
    "TUTEUR_L3",
    "TUTEUR_M2",
    "STAGIAIRE_L3",
    "STAGIAIRE_M2",
    "STAGIAIRE_L1",
    "STAGIAIRE_L2",
    "STAGIAIRE_M1",
  ),
  getEvaluationById,
);

/**
 * POST /api/evaluations
 */
router.post(
  "/",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "COORDINATOR",
    "TUTEUR_L3",
    "TUTEUR_M2",
    "STAGIAIRE_L3",
    "STAGIAIRE_M2",
    "STAGIAIRE_L1",
    "STAGIAIRE_L2",
    "STAGIAIRE_M1",
  ),
  createEvaluation,
);

/**
 * PUT /api/evaluations/:id
 */
router.put(
  "/:id",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "COORDINATOR",
    "TUTEUR_L3",
    "TUTEUR_M2",
  ),
  updateEvaluation,
);

/**
 * DELETE /api/evaluations/:id
 */
router.delete(
  "/:id",
  authorizeRoles(
    "ADMIN",
    "DIRECTION",
    "COORDINATOR",
  ),
  deleteEvaluation,
);

export default router;