// src/routes/noteAnomalies.routes.ts  (AJOUT) — porte « anomalies → note ». Aucune route existante modifiée.
//   GET  /api/note-anomalies/summary            stages avec cas de présence à vérifier (selon le rôle)
//   GET  /api/note-anomalies/gate/:internshipId détail des cas, décisions, recommandation de note
//   POST /api/note-anomalies/verify             { key, decision: JUSTIFIED|CONFIRMED|IN_REVIEW, comment }
//   GET  /api/note-anomalies/calendar?year=     jours non ouvrables (week-ends, fériés, fermetures)
//   GET  /api/note-anomalies/types              types d'anomalies complémentaires détectés
// Lecture : ADMIN, DIRECTION, RH, DSI, tuteurs (leurs stagiaires), stagiaires (leurs propres cas).
// Vérification : ADMIN, DIRECTION, RH, tuteur du stage concerné.

import { Request, Response, Router } from "express";

import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import { getReqUser } from "../utils/dataScope";
import { EXTRA_ANOMALY_TYPES } from "../services/anomalyCatalogExtra";
import { NoteGateError, calendar, gate, listSummaries, verify } from "../services/noteAnomaly.service";

const router = Router();

const READERS = ["ADMIN", "DIRECTION", "RH", "DSI", "TUTEUR_L3", "TUTEUR_M2", "STAGIAIRE_L1", "STAGIAIRE_L2", "STAGIAIRE_L3", "STAGIAIRE_M1", "STAGIAIRE_M2"];
const VERIFIERS = ["ADMIN", "DIRECTION", "RH", "TUTEUR_L3", "TUTEUR_M2"];

function fail(res: Response, error: unknown) {
  if (error instanceof NoteGateError) return res.status(error.status).json({ success: false, message: error.message });
  return res.status(500).json({ success: false, message: "Traitement impossible pour le moment." });
}

router.get("/summary", authenticate, authorizeRoles(...READERS), async (req: Request, res: Response) => {
  try {
    const viewer = getReqUser(req);
    if (!viewer) return res.status(401).json({ success: false, message: "Authentification requise" });
    res.json({ success: true, data: await listSummaries(viewer) });
  } catch (error) {
    fail(res, error);
  }
});

router.get("/gate/:internshipId", authenticate, authorizeRoles(...READERS), async (req: Request, res: Response) => {
  try {
    const viewer = getReqUser(req);
    const id = Number(req.params.internshipId);
    if (!viewer) return res.status(401).json({ success: false, message: "Authentification requise" });
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: "Identifiant de stage invalide." });
    res.json({ success: true, data: await gate(viewer, id) });
  } catch (error) {
    fail(res, error);
  }
});

router.post("/verify", authenticate, authorizeRoles(...VERIFIERS), async (req: Request, res: Response) => {
  try {
    const viewer = getReqUser(req);
    if (!viewer) return res.status(401).json({ success: false, message: "Authentification requise" });
    const { key, decision, comment } = (req.body ?? {}) as { key?: unknown; decision?: unknown; comment?: unknown };
    if (typeof key !== "string" || !key.trim()) return res.status(400).json({ success: false, message: "Clé d'anomalie requise." });
    res.json({ success: true, data: await verify(viewer, { key: key.trim(), decision: String(decision ?? ""), comment: typeof comment === "string" ? comment : "" }) });
  } catch (error) {
    fail(res, error);
  }
});

router.get("/calendar", authenticate, authorizeRoles(...READERS), (req: Request, res: Response) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  if (year < 2000 || year > 2100) return res.status(400).json({ success: false, message: "Année invalide." });
  res.json({ success: true, data: { year, days: calendar(year) } });
});

router.get("/types", authenticate, authorizeRoles(...READERS), (_req: Request, res: Response) => {
  res.json({ success: true, data: EXTRA_ANOMALY_TYPES });
});

export default router;
