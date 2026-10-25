import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import {
  addComment, checkIn, closeMerit, decide, deleteComment, downloadProof, getMerit, getMeritHistory, getMine,
  getMyMerit, getSpace, join, leave, rate, saveProof, saveReport,
} from "../controllers/activitySpace.controller";

/** Monté sur /api/activity-space */
const router = Router();

const ACTIVITY_ROLES = [
  "ADMIN", "DIRECTION", "COMMUNICATION", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2", "STAGIAIRE_L3", "STAGIAIRE_M2",
] as const;
const INTERNS = ["STAGIAIRE_L3", "STAGIAIRE_M2"] as const;
const REVIEWERS = ["ADMIN", "DIRECTION", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2"] as const;
const MERIT_ROLES = ["ADMIN", "DIRECTION", "COORDINATOR", "RH", "TUTEUR_L3", "TUTEUR_M2", "STAGIAIRE_L3", "STAGIAIRE_M2"] as const;

router.use(authenticate);

// Ordre de mérite (avant les routes /:id)
router.get("/merit", authorizeRoles(...MERIT_ROLES), getMerit);
router.get("/merit/me", authorizeRoles(...INTERNS), getMyMerit);
router.get("/merit/history", authorizeRoles(...MERIT_ROLES), getMeritHistory);
router.post("/merit/close", authorizeRoles("ADMIN", "DIRECTION", "COORDINATOR", "RH"), closeMerit);

router.get("/mine", authorizeRoles(...INTERNS), getMine);

router.patch("/participations/:pid/decision", authorizeRoles(...REVIEWERS), decide);
router.patch("/participations/:pid/rating", authorizeRoles(...REVIEWERS), rate);
router.get("/participations/:pid/proof", authorizeRoles(...ACTIVITY_ROLES), downloadProof);
router.delete("/comments/:cid", authorizeRoles(...ACTIVITY_ROLES), deleteComment);

router.get("/:id/space", authorizeRoles(...ACTIVITY_ROLES), getSpace);
router.post("/:id/join", authorizeRoles(...INTERNS), join);
router.delete("/:id/join", authorizeRoles(...INTERNS), leave);
router.put("/:id/report", authorizeRoles(...INTERNS), saveReport);
router.post("/:id/proof", authorizeRoles(...INTERNS), saveProof);
router.post("/:id/checkin", authorizeRoles(...INTERNS), checkIn);
router.post("/:id/comments", authorizeRoles(...ACTIVITY_ROLES), addComment);

export default router;
