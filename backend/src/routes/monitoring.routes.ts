import { Router } from "express";

import {
  addMeasurement,
  createIndicator,
  createObjective,
  createResult,
  deleteIndicator,
  deleteObjective,
  deleteResult,
  getAnalysis,
  getMeasurements,
  getObjectives,
  getOverview,
  getProjectMonitoring,
  getSnapshots,
  postSnapshot,
  updateActivityProgress,
  updateIndicator,
  updateObjective,
  updateProjectBudget,
  updateResult,
} from "../controllers/monitoring.controller";
import { getInternshipMonitoring, getInternshipsMonitoring } from "../controllers/internshipMonitoring.controller";

import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";

const router = Router();

router.use(authenticate);

const READ = ["ADMIN", "DIRECTION", "DAF", "COMMUNICATION", "COORDINATOR"] as const;
const WRITE = ["ADMIN", "DIRECTION", "COORDINATOR"] as const;
const FINANCE = ["ADMIN", "DIRECTION", "DAF"] as const;

// ----- Lecture -----
router.get("/overview", authorizeRoles(...READ), getOverview);
router.get("/projects/:id", authorizeRoles(...READ), getProjectMonitoring);
router.get("/projects/:id/objectives", authorizeRoles(...READ), getObjectives);
router.get("/projects/:id/snapshots", authorizeRoles(...READ), getSnapshots);
router.get("/projects/:id/analysis", authorizeRoles(...READ), getAnalysis);
router.get("/indicators/:id/measurements", authorizeRoles(...READ), getMeasurements);

// ----- Planification : objectifs → résultats → indicateurs -----
router.post("/projects/:id/objectives", authorizeRoles(...WRITE), createObjective);
router.put("/objectives/:id", authorizeRoles(...WRITE), updateObjective);
router.delete("/objectives/:id", authorizeRoles(...WRITE), deleteObjective);

router.post("/objectives/:id/results", authorizeRoles(...WRITE), createResult);
router.put("/results/:id", authorizeRoles(...WRITE), updateResult);
router.delete("/results/:id", authorizeRoles(...WRITE), deleteResult);

router.post("/results/:id/indicators", authorizeRoles(...WRITE), createIndicator);
router.put("/indicators/:id", authorizeRoles(...WRITE), updateIndicator);
router.delete("/indicators/:id", authorizeRoles(...WRITE), deleteIndicator);

// ----- Collecte & avancement -----
router.post("/indicators/:id/measurements", authorizeRoles(...WRITE), addMeasurement);
router.patch("/activities/:id/progress", authorizeRoles(...WRITE), updateActivityProgress);
router.post("/projects/:id/snapshots", authorizeRoles(...WRITE), postSnapshot);

// ----- Stagiaires (filtrés par rôle : un tuteur ne voit que ses stagiaires) -----
const INTERNSHIP_READ = ["ADMIN", "DIRECTION", "DSI", "RH", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2", "STAGIAIRE_L3", "STAGIAIRE_M2"] as const;
router.get("/internships", authorizeRoles(...INTERNSHIP_READ), getInternshipsMonitoring);
router.get("/internships/:id", authorizeRoles(...INTERNSHIP_READ), getInternshipMonitoring);

// ----- Budget -----
router.patch("/projects/:id/budget", authorizeRoles(...FINANCE), updateProjectBudget);

export default router;
