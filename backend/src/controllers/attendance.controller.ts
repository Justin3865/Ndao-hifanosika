import { Response } from "express";

import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { sendError } from "../middlewares/error.middleware";
import { ScopedRequest } from "../middlewares/coordinatorScope.middleware";
import {
  clock,
  deleteAttendance,
  getActivityAttendance,
  listActivities,
  saveAttendance,
  saveSchema,
  summary,
  sweepAbsents,
} from "../services/attendance.service";
import { canAccessProject } from "../utils/projectScopeRules";

const posInt = (v: unknown): number | undefined => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

const user = (req: AuthenticatedRequest) => req.user as unknown as { id: number; firstName?: string; lastName?: string };

/** Vérifie le périmètre d'un coordinateur sur la séance ; renvoie false (et répond 403) si hors périmètre. */
async function inScope(req: ScopedRequest, res: Response, activityId: number): Promise<boolean> {
  const scope = req.projectScope;
  if (!scope || !scope.scoped) return true;
  const data = await getActivityAttendance(activityId);
  if (!data) {
    res.status(404).json({ success: false, message: "Séance introuvable." });
    return false;
  }
  if (!canAccessProject(scope, (data.activity as { projectId: number }).projectId)) {
    res.status(403).json({ success: false, message: "Accès refusé : ce projet ne vous est pas affecté." });
    return false;
  }
  return true;
}

export async function getState(_req: AuthenticatedRequest, res: Response): Promise<void> {
  res.json({ success: true, data: clock() });
}

export async function getSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    await sweepAbsents();
    res.json({ success: true, data: await summary(posInt(req.query.projectId)) });
  } catch (error) {
    sendError(res, error, "Erreur lors du calcul des présences");
  }
}

export async function getActivities(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const projectId = posInt(req.query.projectId);
    if (!projectId) {
      res.status(400).json({ success: false, message: "projectId requis." });
      return;
    }
    res.json({ success: true, data: await listActivities(projectId) });
  } catch (error) {
    sendError(res, error, "Erreur lors de la lecture des séances");
  }
}

export async function getActivity(req: ScopedRequest, res: Response): Promise<void> {
  try {
    const id = posInt(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: "Identifiant invalide." });
      return;
    }
    if (!(await inScope(req, res, id))) return;
    await sweepAbsents();
    const data = await getActivityAttendance(id);
    if (!data) {
      res.status(404).json({ success: false, message: "Séance introuvable." });
      return;
    }
    res.json({ success: true, data });
  } catch (error) {
    sendError(res, error, "Erreur lors de la lecture de la liste de présence");
  }
}

export async function putActivity(req: ScopedRequest, res: Response): Promise<void> {
  try {
    const id = posInt(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: "Identifiant invalide." });
      return;
    }
    if (!(await inScope(req, res, id))) return;
    const input = saveSchema.parse(req.body);
    const result = await saveAttendance(id, input, user(req));
    if (result.status !== 200) {
      res.status(result.status).json({ success: false, message: result.message });
      return;
    }
    res.json({ success: true, message: "Présences enregistrées.", data: { saved: result.saved, at: result.at } });
  } catch (error) {
    sendError(res, error, "Erreur lors de l'enregistrement des présences");
  }
}

export async function deleteActivity(req: ScopedRequest, res: Response): Promise<void> {
  try {
    const id = posInt(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: "Identifiant invalide." });
      return;
    }
    if (!(await inScope(req, res, id))) return;
    const result = await deleteAttendance(id, posInt(req.query.beneficiaryId), user(req));
    if (result.status !== 200) {
      res.status(result.status).json({ success: false, message: result.message });
      return;
    }
    res.json({ success: true, message: "Pointage supprimé.", data: { deleted: result.deleted, at: result.at } });
  } catch (error) {
    sendError(res, error, "Erreur lors de la suppression du pointage");
  }
}
