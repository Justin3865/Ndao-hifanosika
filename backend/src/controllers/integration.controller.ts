import { Request, Response } from "express";
import { logger } from "../config/logger";
import { sendError } from "../middlewares/error.middleware";
import { scheduleAnomalyCheck } from "../services/anomalyRealtime.service";
import { loadData, runAnalysis } from "../services/insights.service";
import { IntegrationSnapshot, getIntegration, invalidateIntegration } from "../services/integration.service";
import { canSeeInternship, getReqUser } from "../utils/dataScope";

/**
 * Pont « stagiaires ↔ activités ↔ Suivi & Évaluation ↔ Évaluation finale ↔ Analyses IA ».
 * Lecture seule (sauf /refresh) : aucune route ni aucun calcul existant n'est modifié.
 */

const wrap =
  (message: string, fn: (req: Request, res: Response) => Promise<unknown>) => async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (error) {
      logger.error(message, error);
      sendError(res, error, message);
    }
  };

const idParam = (req: Request): number => {
  const value = Number(req.params.id);
  return Number.isInteger(value) && value > 0 ? value : 0;
};

/** Un tuteur ne voit que ses stagiaires, un stagiaire que lui-même (même règle que les routes de stages). */
function visibleInternships(req: Request, snapshot: IntegrationSnapshot) {
  const user = getReqUser(req);
  return snapshot.internships.filter((i) => canSeeInternship(user, { studentId: i.studentId, supervisorId: i.supervisorId }));
}

const stripOwners = <T extends { ownerIds?: number[] }>(rows: T[]) => rows.map(({ ownerIds: _ownerIds, ...row }) => row);

/** Comment les données circulent (affiché tel quel dans la page « Analyses IA »). */
const FLOW = [
  { from: "Stagiaire", to: "Stage", via: "tâches, rapports, présence GPS, évaluations du tuteur", route: "/api/manual-progress/internships/:id" },
  { from: "Stage", to: "Projet", via: "Internship.projectId + InternshipProject (un stagiaire compte une fois par projet)", route: "/api/integration/internships" },
  { from: "Activités / jalons / indicateurs", to: "Suivi & Évaluation", via: "avancement réel vs prévu", route: "/api/monitoring/overview" },
  { from: "Suivi & Évaluation + stages + satisfaction + budget", to: "Évaluation finale (/20)", via: "notes automatiques projets et stagiaires", route: "/api/final-evaluation/projects" },
  { from: "Tout ce qui précède", to: "Analyses IA", via: "performance, anomalies, synthèse, tableau de bord, alertes", route: "/api/ai/*" },
];

export const getOverview = wrap("Impossible de calculer la vue d'ensemble.", async (req, res) => {
  const snapshot = await getIntegration();
  const internships = visibleInternships(req, snapshot);

  res.json({
    success: true,
    data: {
      generatedAt: snapshot.generatedAt,
      totals: snapshot.totals,
      flow: FLOW,
      anomalies: {
        total: snapshot.anomalies.length,
        high: snapshot.anomalies.filter((a) => a.severity === "HIGH").length,
        top: stripOwners(snapshot.anomalies.slice(0, 8)),
      },
      internships: internships.length,
    },
  });
});

export const listProjects = wrap("Impossible de calculer les projets reliés.", async (_req, res) => {
  const snapshot = await getIntegration();

  res.json({
    success: true,
    data: {
      generatedAt: snapshot.generatedAt,
      projects: snapshot.projects.map((project) => ({
        ...project,
        anomalies: snapshot.anomalies.filter((a) => a.projectId === project.projectId).length,
      })),
    },
  });
});

export const getProject = wrap("Impossible de calculer le projet relié.", async (req, res) => {
  const id = idParam(req);
  if (!id) return res.status(400).json({ success: false, message: "Identifiant de projet invalide." });

  const snapshot = await getIntegration();
  const project = snapshot.projects.find((p) => p.projectId === id);
  if (!project) return res.status(404).json({ success: false, message: "Projet introuvable." });

  // score IA final (base IA + pont) : même valeur que « Analyses IA → Performance »
  let ai: { score: number | null; baseScore: number | null; level: string } | null = null;
  try {
    const analysis = await runAnalysis(await loadData());
    const row = analysis.performance.find((p) => p.projectId === id) as ({ baseScore?: number | null } & (typeof analysis.performance)[number]) | undefined;
    if (row) ai = { score: row.score, baseScore: row.baseScore ?? null, level: row.level };
  } catch (error) {
    logger.warn("Score IA du projet indisponible", error);
  }

  res.json({
    success: true,
    data: {
      ...project,
      ai,
      internships: snapshot.internships.filter((i) => i.projectIds.includes(id)),
      anomalies: stripOwners(snapshot.anomalies.filter((a) => a.projectId === id)),
    },
  });
});

export const listInternships = wrap("Impossible de calculer les stagiaires reliés.", async (req, res) => {
  const snapshot = await getIntegration();
  const items = visibleInternships(req, snapshot);

  res.json({
    success: true,
    data: {
      generatedAt: snapshot.generatedAt,
      count: items.length,
      stageRows: snapshot.totals.internRows,
      internships: items,
    },
  });
});

export const getInternship = wrap("Impossible de calculer le stagiaire relié.", async (req, res) => {
  const id = idParam(req);
  if (!id) return res.status(400).json({ success: false, message: "Identifiant de stage invalide." });

  const snapshot = await getIntegration();
  const item = visibleInternships(req, snapshot).find((i) => i.id === id);
  if (!item) return res.status(404).json({ success: false, message: "Stage introuvable." });

  res.json({
    success: true,
    data: {
      ...item,
      projectsDetail: snapshot.projects
        .filter((p) => item.projectIds.includes(p.projectId))
        .map((p) => ({ projectId: p.projectId, name: p.name, code: p.code, finalScore: p.finalScore, verdict: p.verdict, progress: p.progress })),
      anomalies: stripOwners(snapshot.anomalies.filter((a) => a.entityKind === "internship" && a.entityId === id)),
    },
  });
});

export const listAnomalies = wrap("Impossible de lister les anomalies reliées.", async (_req, res) => {
  const snapshot = await getIntegration();
  res.json({ success: true, data: { generatedAt: snapshot.generatedAt, count: snapshot.anomalies.length, anomalies: stripOwners(snapshot.anomalies) } });
});

/** POST /refresh — recalcule tout de suite et reprogramme l'analyse d'anomalies (utile après import SQL / seed). */
export const refresh = wrap("Impossible de recalculer.", async (_req, res) => {
  invalidateIntegration();
  const snapshot = await getIntegration(true);
  scheduleAnomalyCheck("integration-refresh");

  res.json({ success: true, data: { generatedAt: snapshot.generatedAt, totals: snapshot.totals } });
});
