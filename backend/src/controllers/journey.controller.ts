import { Response } from "express";

import { ScopedRequest } from "../middlewares/coordinatorScope.middleware";
import { sendError } from "../middlewares/error.middleware";
import { dropoutLabels, journeySchema, journeySummary, listJourneys, setJourney } from "../services/journey.service";
import { filterByProject } from "../utils/projectScopeRules";

const intOrUndef = (v: unknown): number | undefined => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

export async function getJourneys(req: ScopedRequest, res: Response): Promise<void> {
  try {
    const status = typeof req.query.status === "string" ? req.query.status.toUpperCase() : undefined;
    const rows = await listJourneys({
      projectId: intOrUndef(req.query.projectId),
      status: status && ["ACTIVE", "COMPLETED", "DROPPED_OUT"].includes(status) ? status : undefined,
    });
    const scope = req.projectScope ?? { scoped: false, allowed: [] };
    res.json({ success: true, data: filterByProject(scope, rows as Array<{ projectId: number }>, (r) => r.projectId) });
  } catch (error) {
    sendError(res, error, "Erreur lors de la lecture des statuts de parcours");
  }
}

export async function getJourneySummary(req: ScopedRequest, res: Response): Promise<void> {
  try {
    const scope = req.projectScope;
    const data = await journeySummary(scope?.scoped ? scope.allowed : undefined, intOrUndef(req.query.projectId));
    res.json({ success: true, data });
  } catch (error) {
    sendError(res, error, "Erreur lors du calcul du taux d'abandon");
  }
}

export async function putJourney(req: ScopedRequest, res: Response): Promise<void> {
  try {
    const id = intOrUndef(req.params.id);
    if (!id) return void res.status(400).json({ success: false, message: "Identifiant invalide." });
    const input = journeySchema.parse(req.body);
    const updated = await setJourney(id, input, req.user!.id);
    if (!updated) return void res.status(404).json({ success: false, message: "Bénéficiaire introuvable." });
    res.json({ success: true, message: "Statut du parcours enregistré.", data: updated });
  } catch (error) {
    sendError(res, error, "Erreur lors de l'enregistrement du statut du parcours");
  }
}

export async function getDropoutLabels(_req: ScopedRequest, res: Response): Promise<void> {
  try {
    res.json({ success: true, data: await dropoutLabels() });
  } catch (error) {
    sendError(res, error, "Erreur lors de l'export des labels d'abandon");
  }
}
