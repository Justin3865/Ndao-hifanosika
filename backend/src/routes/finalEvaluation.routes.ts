import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import {
  createFeedback,
  deleteFeedback,
  getCriteria,
  getProjectEvaluation,
  listInternshipEvaluations,
  listProjectEvaluations,
} from "../controllers/finalEvaluation.controller";

/** Monté sur /api/final-evaluation */
const router = Router();

const READ = ["ADMIN", "DIRECTION", "DAF", "COMMUNICATION", "COORDINATOR"] as const;
// Saisie des questionnaires de satisfaction (enquêtes auprès des partenaires / bénéficiaires)
const WRITE = ["ADMIN", "DIRECTION", "COORDINATOR"] as const;
const STAGES = ["ADMIN", "DIRECTION", "DAF", "COMMUNICATION", "COORDINATOR", "RH", "TUTEUR_L3", "TUTEUR_M2"] as const;

router.use(authenticate);

// ----- Projets -----
router.get("/criteria", authorizeRoles(...READ), getCriteria);
router.get("/projects", authorizeRoles(...READ), listProjectEvaluations);
router.get("/projects/:id", authorizeRoles(...READ), getProjectEvaluation);
router.post("/projects/:id/feedback", authorizeRoles(...WRITE), createFeedback);
router.delete("/feedback/:fid", authorizeRoles(...WRITE), deleteFeedback);

// ----- Stages (un tuteur ne voit que ses stagiaires) -----
router.get("/internships", authorizeRoles(...STAGES), listInternshipEvaluations);

export default router;
