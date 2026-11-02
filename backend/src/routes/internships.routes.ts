import { Router } from "express";

import {
  getInternships,
  getInternshipById,
  createInternship,
  updateInternship,
  deleteInternship,
  getStudentMatricule,
  createTutor,
  renumberInternshipMatricules,
} from "../controllers/internship.controller";

import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";

const router = Router();

router.use(authenticate);

/**
 * GET /api/internships
 */
router.get(
  "/",
  authorizeRoles(
    "ADMIN",
    "RH",
    "COORDINATOR",
    "TUTEUR_L3",
    "TUTEUR_M2",
    "STAGIAIRE_L3",
    "STAGIAIRE_M2",
  ),
  getInternships,
);

/**
 * GET /api/internships/matricule?studentId=
 * (déclaré avant « /:id »)
 */
router.get(
  "/matricule",
  authorizeRoles(
    "ADMIN",
    "RH",
    "COORDINATOR",
    "TUTEUR_L3",
    "TUTEUR_M2",
  ),
  getStudentMatricule,
);

/**
 * GET /api/internships/:id
 */
router.get(
  "/:id",
  authorizeRoles(
    "ADMIN",
    "RH",
    "COORDINATOR",
    "TUTEUR_L3",
    "TUTEUR_M2",
    "STAGIAIRE_L3",
    "STAGIAIRE_M2",
  ),
  getInternshipById,
);

/**
 * POST /api/internships/matricules/renumber : matricules remis en ordre (0001, 0002…)
 */
router.post(
  "/matricules/renumber",
  authorizeRoles(
    "ADMIN",
    "RH",
  ),
  renumberInternshipMatricules,
);

/**
 * POST /api/internships/tutors : ajout d'un tuteur depuis le formulaire d'un stage
 */
router.post(
  "/tutors",
  authorizeRoles(
    "ADMIN",
    "RH",
    "COORDINATOR",
  ),
  createTutor,
);

/**
 * POST /api/internships
 */
router.post(
  "/",
  authorizeRoles(
    "ADMIN",
    "RH",
    "COORDINATOR",
    "TUTEUR_L3",
    "TUTEUR_M2",
  ),
  createInternship,
);

/**
 * PUT /api/internships/:id
 */
router.put(
  "/:id",
  authorizeRoles(
    "ADMIN",
    "RH",
    "COORDINATOR",
    "TUTEUR_L3",
    "TUTEUR_M2",
  ),
  updateInternship,
);

/**
 * DELETE /api/internships/:id
 */
router.delete(
  "/:id",
  authorizeRoles(
    "ADMIN",
    "RH",
  ),
  deleteInternship,
);

export default router;