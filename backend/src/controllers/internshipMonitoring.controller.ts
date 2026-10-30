import { Request, Response } from "express";
import { logger } from "../config/logger";
import { sendError } from "../middlewares/error.middleware";
import { canSeeInternship, getReqUser, internshipScope } from "../utils/dataScope";
import { loadInternshipsMonitoring } from "../services/internshipMonitoring.service";

type Row = Awaited<ReturnType<typeof loadInternshipsMonitoring>>[number];

const shape = (row: Row) => {
  const { internship: i, metrics } = row;
  return {
    id: i.id,
    title: i.title,
    theme: i.theme ?? null,
    department: i.department ?? null,
    status: i.status,
    institution: i.institution,
    startDate: i.startDate,
    endDate: i.endDate,
    project: i.project,
    student: i.student,
    supervisor: i.supervisor,
    ...metrics,
  };
};

/** GET /api/monitoring/internships — S&E de tous les stagiaires (filtré selon le rôle). */
export async function getInternshipsMonitoring(req: Request, res: Response) {
  try {
    const projectId = Number(req.query.projectId);
    const rows = await loadInternshipsMonitoring(
      internshipScope(getReqUser(req)),
      Number.isInteger(projectId) && projectId > 0 ? { projectId } : {}
    );
    const items = rows.map(shape);

    return res.json({
      success: true,
      data: {
        count: items.length,
        internships: items,
        summary: {
          inProgress: items.filter((x) => x.status === "IN_PROGRESS").length,
          completed: items.filter((x) => x.status === "COMPLETED").length,
          alerts: items.reduce((a, x) => a + x.alerts.length, 0),
        },
      },
    });
  } catch (error) {
    logger.error("Erreur S&E stagiaires", error);
    return sendError(res, error, "Impossible de calculer le suivi des stagiaires.");
  }
}

/** GET /api/monitoring/internships/:id — détail : tâches, évaluations, jours de présence. */
export async function getInternshipMonitoring(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0)
      return res.status(400).json({ success: false, message: "Identifiant de stage invalide." });

    const user = getReqUser(req);
    const rows = await loadInternshipsMonitoring(internshipScope(user), { id });
    const row = rows[0];
    if (!row) return res.status(404).json({ success: false, message: "Stage introuvable." });

    if (!canSeeInternship(user, row.internship))
      return res.status(403).json({ success: false, message: "Accès refusé à ce stage." });

    return res.json({
      success: true,
      data: {
        ...shape(row),
        taskList: row.taskRows,
        evaluationList: row.internship.evaluations,
        presenceDays: [...new Set(row.missions.map((m) => m.startedAt.toISOString().slice(0, 10)))].sort(),
      },
    });
  } catch (error) {
    logger.error("Erreur S&E stagiaire", error);
    return sendError(res, error, "Impossible de calculer le suivi du stagiaire.");
  }
}
