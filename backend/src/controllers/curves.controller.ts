import { Request, Response } from "express";
import { logger } from "../config/logger";
import { sendError } from "../middlewares/error.middleware";
import { CurveMethod } from "../ml/interpolation";
import { buildCurve } from "../services/curves.service";
import { getIntegration, simulateRemoval } from "../services/integration.service";
import { canSeeInternship, getReqUser } from "../utils/dataScope";

const intOrUndefined = (value: unknown): number | undefined => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

const parseMethods = (value: unknown): CurveMethod[] | undefined => {
  const v = String(value ?? "both").toLowerCase();
  if (v === "lagrange") return ["lagrange"];
  if (v === "hermite") return ["hermite"];
  return undefined; // les deux
};

/** GET /api/integration/curves/projects | /curves/interns   ?id=&level=L3|M2&method=lagrange|hermite|both */
const curves = (kind: "projects" | "interns") => async (req: Request, res: Response) => {
  try {
    const level = req.query.level === "L3" || req.query.level === "M2" ? req.query.level : undefined;
    const id = intOrUndefined(req.query.id);

    // un tuteur / stagiaire ne voit que ses propres stagiaires en courbe individuelle
    if (kind === "interns" && id) {
      const snapshot = await getIntegration();
      const person = snapshot.internships.find((i) => i.id === id || i.stageIds.includes(id));
      if (person && !canSeeInternship(getReqUser(req), { studentId: person.studentId, supervisorId: person.supervisorId })) {
        return res.status(403).json({ success: false, message: "Accès refusé à ce stagiaire." });
      }
    }

    const data = await buildCurve({ kind, id, level, methods: parseMethods(req.query.method) });
    return res.json({ success: true, data });
  } catch (error) {
    logger.error("Courbes Lagrange / Hermite en échec", error);
    return sendError(res, error, "Impossible de calculer les courbes.");
  }
};

export const getProjectCurves = curves("projects");
export const getInternCurves = curves("interns");

/**
 * GET /api/integration/impact/:internshipId
 * « Et si ce stagiaire était supprimé (ou n'avait pas fini) ? » : note finale et score IA des projets AVANT / APRÈS.
 */
export async function getRemovalImpact(req: Request, res: Response) {
  try {
    const id = intOrUndefined(req.params.internshipId);
    if (!id) return res.status(400).json({ success: false, message: "Identifiant de stage invalide." });

    const snapshot = await getIntegration();
    const person = snapshot.internships.find((i) => i.id === id || i.stageIds.includes(id));
    if (!person) return res.status(404).json({ success: false, message: "Stagiaire introuvable." });

    const impact = await simulateRemoval(person.personKey);
    return res.json({ success: true, data: impact });
  } catch (error) {
    logger.error("Simulation d'impact en échec", error);
    return sendError(res, error, "Impossible de simuler l'impact.");
  }
}

/**
 * GET /api/integration/chain/:internshipId
 * Chaîne complète d'UN stagiaire : stage → tâches/activités → Suivi & Évaluation → Évaluation finale → projets → Analyses IA.
 */
export async function getChain(req: Request, res: Response) {
  try {
    const id = intOrUndefined(req.params.internshipId);
    if (!id) return res.status(400).json({ success: false, message: "Identifiant de stage invalide." });

    const snapshot = await getIntegration();
    const person = snapshot.internships.find((i) => i.id === id || i.stageIds.includes(id));
    if (!person) return res.status(404).json({ success: false, message: "Stagiaire introuvable." });
    if (!canSeeInternship(getReqUser(req), { studentId: person.studentId, supervisorId: person.supervisorId })) {
      return res.status(403).json({ success: false, message: "Accès refusé à ce stagiaire." });
    }

    return res.json({
      success: true,
      data: {
        stagiaire: { id: person.id, personKey: person.personKey, name: person.name, level: person.level, stages: person.stagesCount, stageIds: person.stageIds },
        suiviEvaluation: { progress: person.progress, tasks: person.tasks, presenceRate: person.presenceRate, evaluations: person.evaluations, alerts: person.alerts },
        evaluationFinale: { score: person.score, verdict: person.verdict, rank: person.rank, cohortSize: person.cohortSize, phase: person.phase },
        projets: snapshot.projects
          .filter((p) => person.projectIds.includes(p.projectId))
          .map((p) => ({ projectId: p.projectId, name: p.name, finalScore: p.finalScore, integratedScore: p.integratedScore, internsAverage: p.interns.average })),
        analysesIA: { risk: person.risk, anomalies: snapshot.anomalies.filter((a) => a.entityKind === "internship" && a.entityId === person.id).length },
        routes: {
          curveSingle: `/api/integration/curves/interns?id=${person.id}`,
          curveCohort: "/api/integration/curves/interns",
          impact: `/api/integration/impact/${person.id}`,
        },
      },
    });
  } catch (error) {
    logger.error("Chaîne stagiaire en échec", error);
    return sendError(res, error, "Impossible de calculer la chaîne du stagiaire.");
  }
}
