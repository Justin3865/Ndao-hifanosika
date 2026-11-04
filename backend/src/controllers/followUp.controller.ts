import { Response } from "express";

import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { sendError } from "../middlewares/error.middleware";
import {
  completeFollowUp,
  completeFollowUpSchema,
  followUpImpact,
  listFollowUps,
  remindDueFollowUps,
  syncFollowUps,
} from "../services/followUp.service";

const intOrUndef = (v: unknown): number | undefined => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

export async function getFollowUps(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const status = typeof req.query.status === "string" ? req.query.status.toUpperCase() : undefined;
    const data = await listFollowUps({
      projectId: intOrUndef(req.query.projectId),
      horizon: intOrUndef(req.query.horizon),
      status: status && ["PENDING", "DONE", "MISSED"].includes(status) ? status : undefined,
    });
    res.json({ success: true, data });
  } catch (error) {
    sendError(res, error, "Erreur lors de la lecture des relances post-programme");
  }
}

export async function getFollowUpImpact(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    res.json({ success: true, data: await followUpImpact(intOrUndef(req.query.projectId)) });
  } catch (error) {
    sendError(res, error, "Erreur lors du calcul de l'impact post-programme");
  }
}

export async function postFollowUpSync(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const result = await syncFollowUps();
    const reminded = await remindDueFollowUps();
    res.json({ success: true, data: { ...result, reminded } });
  } catch (error) {
    sendError(res, error, "Erreur lors de la synchronisation des relances");
  }
}

export async function putFollowUpComplete(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = intOrUndef(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: "Identifiant invalide." });
      return;
    }
    const input = completeFollowUpSchema.parse(req.body);
    const updated = await completeFollowUp(id, input, req.user!.id);
    if (!updated) {
      res.status(404).json({ success: false, message: "Relance introuvable." });
      return;
    }
    res.json({ success: true, message: "Relance enregistrée.", data: updated });
  } catch (error) {
    sendError(res, error, "Erreur lors de l'enregistrement de la relance");
  }
}
