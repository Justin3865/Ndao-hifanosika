import { Router } from "express";

import {
  deleteActivity,
  getActivities,
  getActivity,
  getState,
  getSummary,
  putActivity,
} from "../controllers/attendance.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { coordinatorScope } from "../middlewares/coordinatorScope.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";

const router = Router();

router.use(authenticate);
router.use(coordinatorScope);

const READ = ["ADMIN", "DIRECTION", "COORDINATOR"] as const;
const WRITE = ["ADMIN", "COORDINATOR"] as const;

/** GET /api/attendance/state — heure serveur + règles (jour ouvrable, 08h–17h) */
router.get("/state", authorizeRoles(...READ), getState);
/** GET /api/attendance/summary?projectId= — taux de présence par bénéficiaire */
router.get("/summary", authorizeRoles(...READ), getSummary);
/** GET /api/attendance/activities?projectId= — séances d'un projet */
router.get("/activities", authorizeRoles(...READ), getActivities);
/** GET /api/attendance/activity/:id — liste de présence + journal horodaté */
router.get("/activity/:id", authorizeRoles(...READ), getActivity);
/** PUT /api/attendance/activity/:id — enregistre (séance du jour, jour ouvrable, 08h–17h) */
router.put("/activity/:id", authorizeRoles(...WRITE), putActivity);
/** DELETE /api/attendance/activity/:id[?beneficiaryId=] — supprime le pointage (mêmes règles) ; horodaté */
router.delete("/activity/:id", authorizeRoles(...WRITE), deleteActivity);

export default router;
