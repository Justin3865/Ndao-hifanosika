import { Request, Response, Router } from "express";

import { logger } from "../config/logger";
import { authenticate } from "../middlewares/auth.middleware";
import { sendError } from "../middlewares/error.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import { PresenceError, checkIn, checkOut, getState, internshipJournal, overview, userJournal } from "../services/presence.service";
import { getReqUser } from "../utils/dataScope";

/* ===================================================================
 * /api/presence — pointage journalier avec preuve GPS (arrivée vérifiée, départ + tâches du jour),
 * et lectures pour le Suivi & Évaluation (équipe, projet, stage).
 * =================================================================== */

export const presenceRouter = Router();

presenceRouter.use(authenticate);

const MANAGERS = ["ADMIN", "DIRECTION", "RH", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2"];
const JOURNAL = ["ADMIN", "DIRECTION", "COORDINATOR", "RH", "TUTEUR_L3", "TUTEUR_M2", "STAGIAIRE_L1", "STAGIAIRE_L2", "STAGIAIRE_L3", "STAGIAIRE_M1", "STAGIAIRE_M2"];

function fail(res: Response, error: unknown, label: string): void {
  if (error instanceof PresenceError) {
    res.status(error.status).json({ success: false, message: error.message, code: error.code });
    return;
  }

  logger.error(label, error);
  sendError(res, error, "Erreur serveur");
}

const positive = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/** GET /api/presence/state — règles, siège, stage + tâches et pointage du jour de l'utilisateur connecté */
presenceRouter.get("/state", async (req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await getState(getReqUser(req)!) });
  } catch (error) {
    fail(res, error, "Erreur état de présence");
  }
});

/** POST /api/presence/check-in { mode: SIEGE|TERRAIN, latitude, longitude, altitude?, accuracy?, projectId? } */
presenceRouter.post("/check-in", async (req: Request, res: Response) => {
  try {
    res.status(201).json({ success: true, data: await checkIn(getReqUser(req)!, req.body ?? {}) });
  } catch (error) {
    fail(res, error, "Erreur pointage d'arrivée");
  }
});

/** POST /api/presence/check-out { latitude, longitude, altitude?, accuracy?, tasks: [{ internshipTaskId?, title?, note?, progress?, completed? }], summary? } */
presenceRouter.post("/check-out", async (req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await checkOut(getReqUser(req)!, req.body ?? {}) });
  } catch (error) {
    fail(res, error, "Erreur pointage de départ");
  }
});

/** GET /api/presence/overview?day=&from=&to=&projectId=&internshipId=&userId=&status= — présences de l'équipe / du projet / du stage */
presenceRouter.get("/overview", authorizeRoles(...MANAGERS), async (req: Request, res: Response) => {
  try {
    const data = await overview(getReqUser(req)!, {
      day: typeof req.query.day === "string" ? req.query.day : undefined,
      from: typeof req.query.from === "string" ? req.query.from : undefined,
      to: typeof req.query.to === "string" ? req.query.to : undefined,
      projectId: positive(req.query.projectId),
      internshipId: positive(req.query.internshipId),
      userId: positive(req.query.userId),
      status: typeof req.query.status === "string" ? req.query.status.toUpperCase() : undefined,
    });
    res.json({ success: true, data });
  } catch (error) {
    fail(res, error, "Erreur vue d'ensemble des présences");
  }
});

/** GET /api/presence/internship/:id?days=60 — journal GPS + tâches du jour d'un stagiaire (page Suivi & Évaluation) */
presenceRouter.get("/internship/:id", authorizeRoles(...JOURNAL), async (req: Request, res: Response) => {
  try {
    const id = positive(req.params.id);

    if (!id) {
      res.status(400).json({ success: false, message: "Stage invalide" });
      return;
    }

    res.json({ success: true, data: await internshipJournal(getReqUser(req)!, id, Number(req.query.days) || 60) });
  } catch (error) {
    fail(res, error, "Erreur journal de présence du stage");
  }
});

/** GET /api/presence/user/:userId?days=60 — présence GPS + tâches du jour d'un membre (fiche membre) */
presenceRouter.get("/user/:userId", authorizeRoles(...JOURNAL), async (req: Request, res: Response) => {
  try {
    const id = positive(req.params.userId);

    if (!id) {
      res.status(400).json({ success: false, message: "Membre invalide" });
      return;
    }

    res.json({ success: true, data: await userJournal(getReqUser(req)!, id, Number(req.query.days) || 60) });
  } catch (error) {
    fail(res, error, "Erreur présence du membre");
  }
});

export default presenceRouter;
