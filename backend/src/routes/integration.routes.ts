import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import { getChain, getInternCurves, getProjectCurves, getRemovalImpact } from "../controllers/curves.controller";
import {
  getInternship,
  getOverview,
  getProject,
  listAnomalies,
  listInternships,
  listProjects,
  refresh,
} from "../controllers/integration.controller";

/** Monté sur /api/integration — voir INSTALL.md */
const router = Router();

const READ = ["ADMIN", "DIRECTION", "DSI", "DAF", "COMMUNICATION", "COORDINATOR"] as const;
// Comme /api/final-evaluation/internships : un tuteur ne voit que ses stagiaires (filtre appliqué dans le contrôleur)
const STAGES = [...READ, "RH", "TUTEUR_L3", "TUTEUR_M2"] as const;

router.use(authenticate);

router.get("/overview", authorizeRoles(...STAGES), getOverview);
router.get("/projects", authorizeRoles(...READ), listProjects);
router.get("/projects/:id", authorizeRoles(...READ), getProject);
router.get("/internships", authorizeRoles(...STAGES), listInternships);
router.get("/internships/:id", authorizeRoles(...STAGES), getInternship);
router.get("/anomalies", authorizeRoles(...READ), listAnomalies);
// Courbes d'interpolation Lagrange / Hermite : PROJETS et STAGIAIRES séparément (cohorte ou courbe individuelle)
router.get("/curves/projects", authorizeRoles(...READ), getProjectCurves);
router.get("/curves/interns", authorizeRoles(...STAGES), getInternCurves);
// Chaîne stagiaire → activités → S&E → évaluation finale → IA, et simulation « si ce stagiaire est supprimé »
router.get("/chain/:internshipId", authorizeRoles(...STAGES), getChain);
router.get("/impact/:internshipId", authorizeRoles(...READ), getRemovalImpact);
router.post("/refresh", authorizeRoles("ADMIN", "DIRECTION", "DSI", "COORDINATOR"), refresh);

export default router;
