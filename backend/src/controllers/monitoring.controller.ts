import { Request, Response } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { sendError } from "../middlewares/error.middleware";
import {
  analyseProject,
  buildAlerts,
  computeMonitoring,
  indicatorProgress,
  loadAllProjectContexts,
  loadProjectContext,
  num,
  recordSnapshot,
  statusFromProgress,
} from "../services/monitoring.service";

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

const intParam = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const bad = (res: Response, message: string) =>
  res.status(400).json({ success: false, message });

const notFound = (res: Response, what: string) =>
  res.status(404).json({ success: false, message: `${what} introuvable.` });

const optStr = (v: unknown): string | null | undefined =>
  v === undefined ? undefined : v === null || String(v).trim() === "" ? null : String(v).trim();

const optNum = (v: unknown): number | null | undefined => {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const optDate = (v: unknown): Date | null | undefined => {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
};

const userId = (req: Request) => (req as AuthenticatedRequest).user?.id ?? null;

const fail = (res: Response, error: unknown, msg: string) => {
  logger.error(msg, error);
  return sendError(res, error, msg);
};

// ------------------------------------------------------------
// Lecture : vue globale + détail projet
// ------------------------------------------------------------

/** GET /api/monitoring/overview */
export async function getOverview(_req: Request, res: Response) {
  try {
    const projects = await loadAllProjectContexts();
    const items = projects.map((p) => {
      const m = computeMonitoring(p);
      return { ...m, alerts: buildAlerts(p, m) };
    });

    return res.json({
      success: true,
      data: {
        count: items.length,
        projects: items,
        summary: {
          active: items.filter((i) => i.status === "ACTIVE").length,
          late: items.filter((i) => i.trend === "LATE" || i.trend === "CRITICAL").length,
          alerts: items.reduce((a, i) => a + i.alerts.length, 0),
        },
      },
    });
  } catch (error) {
    return fail(res, error, "Impossible de calculer le suivi & évaluation.");
  }
}

/** GET /api/monitoring/projects/:id */
export async function getProjectMonitoring(req: Request, res: Response) {
  try {
    const id = intParam(req.params.id);
    if (!id) return bad(res, "Identifiant de projet invalide.");

    const project = await loadProjectContext(id);
    if (!project) return notFound(res, "Projet");

    const m = computeMonitoring(project);
    return res.json({ success: true, data: { ...m, alerts: buildAlerts(project, m) } });
  } catch (error) {
    return fail(res, error, "Impossible de calculer le suivi du projet.");
  }
}

/** GET /api/monitoring/projects/:id/objectives — arbre Objectifs → Résultats → Indicateurs */
export async function getObjectives(req: Request, res: Response) {
  try {
    const id = intParam(req.params.id);
    if (!id) return bad(res, "Identifiant de projet invalide.");

    const objectives = await prisma.projectObjective.findMany({
      where: { projectId: id },
      orderBy: [{ order: "asc" }, { id: "asc" }],
      include: {
        results: {
          orderBy: [{ order: "asc" }, { id: "asc" }],
          include: { indicators: { orderBy: { id: "asc" } } },
        },
      },
    });

    return res.json({ success: true, objectives });
  } catch (error) {
    return fail(res, error, "Impossible de récupérer les objectifs.");
  }
}

/** GET /api/monitoring/projects/:id/snapshots */
export async function getSnapshots(req: Request, res: Response) {
  try {
    const id = intParam(req.params.id);
    if (!id) return bad(res, "Identifiant de projet invalide.");

    const snapshots = await prisma.projectMonitoringSnapshot.findMany({
      where: { projectId: id },
      orderBy: { recordedAt: "asc" },
      take: 365,
    });
    return res.json({ success: true, snapshots });
  } catch (error) {
    return fail(res, error, "Impossible de récupérer l'historique.");
  }
}

/** POST /api/monitoring/projects/:id/snapshots — forcer un point d'historique */
export async function postSnapshot(req: Request, res: Response) {
  try {
    const id = intParam(req.params.id);
    if (!id) return bad(res, "Identifiant de projet invalide.");
    const snapshot = await recordSnapshot(id, optStr(req.body?.note) ?? undefined);
    if (!snapshot) return bad(res, "Avancement non calculable : aucune donnée de suivi.");
    return res.status(201).json({ success: true, snapshot });
  } catch (error) {
    return fail(res, error, "Impossible d'enregistrer le point d'historique.");
  }
}

/** GET /api/monitoring/projects/:id/analysis — analyse IA (ai-service) */
export async function getAnalysis(req: Request, res: Response) {
  try {
    const id = intParam(req.params.id);
    if (!id) return bad(res, "Identifiant de projet invalide.");
    const analysis = await analyseProject(id);
    if (!analysis) return notFound(res, "Projet");
    return res.json({ success: true, data: analysis });
  } catch (error) {
    return fail(res, error, "Impossible de produire l'analyse.");
  }
}

// ------------------------------------------------------------
// Écriture : objectifs / résultats / indicateurs
// ------------------------------------------------------------

export async function createObjective(req: Request, res: Response) {
  try {
    const projectId = intParam(req.params.id);
    const title = optStr(req.body?.title);
    if (!projectId) return bad(res, "Identifiant de projet invalide.");
    if (!title) return bad(res, "Le titre de l'objectif est obligatoire.");
    if (!(await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } })))
      return notFound(res, "Projet");

    const objective = await prisma.projectObjective.create({
      data: { projectId, title, description: optStr(req.body?.description) ?? null, order: Number(req.body?.order) || 0 },
    });
    return res.status(201).json({ success: true, objective });
  } catch (error) {
    return fail(res, error, "Impossible de créer l'objectif.");
  }
}

export async function updateObjective(req: Request, res: Response) {
  try {
    const id = intParam(req.params.id);
    if (!id) return bad(res, "Identifiant invalide.");
    const title = optStr(req.body?.title);
    if (title === null) return bad(res, "Le titre ne peut pas être vide.");

    const objective = await prisma.projectObjective.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(req.body?.description !== undefined ? { description: optStr(req.body.description) } : {}),
        ...(req.body?.order !== undefined ? { order: Number(req.body.order) || 0 } : {}),
      },
    });
    return res.json({ success: true, objective });
  } catch (error) {
    return fail(res, error, "Impossible de modifier l'objectif.");
  }
}

export async function deleteObjective(req: Request, res: Response) {
  try {
    const id = intParam(req.params.id);
    if (!id) return bad(res, "Identifiant invalide.");
    const existing = await prisma.projectObjective.findUnique({ where: { id }, select: { projectId: true } });
    if (!existing) return notFound(res, "Objectif");
    await prisma.projectObjective.delete({ where: { id } });
    await recordSnapshot(existing.projectId);
    return res.json({ success: true, message: "Objectif supprimé." });
  } catch (error) {
    return fail(res, error, "Impossible de supprimer l'objectif.");
  }
}

export async function createResult(req: Request, res: Response) {
  try {
    const objectiveId = intParam(req.params.id);
    const title = optStr(req.body?.title);
    if (!objectiveId) return bad(res, "Identifiant d'objectif invalide.");
    if (!title) return bad(res, "Le titre du résultat est obligatoire.");
    if (!(await prisma.projectObjective.findUnique({ where: { id: objectiveId }, select: { id: true } })))
      return notFound(res, "Objectif");

    const result = await prisma.projectResult.create({
      data: { objectiveId, title, description: optStr(req.body?.description) ?? null, order: Number(req.body?.order) || 0 },
    });
    return res.status(201).json({ success: true, result });
  } catch (error) {
    return fail(res, error, "Impossible de créer le résultat.");
  }
}

export async function updateResult(req: Request, res: Response) {
  try {
    const id = intParam(req.params.id);
    if (!id) return bad(res, "Identifiant invalide.");
    const title = optStr(req.body?.title);
    if (title === null) return bad(res, "Le titre ne peut pas être vide.");
    const progress = optNum(req.body?.progress);

    const result = await prisma.projectResult.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(req.body?.description !== undefined ? { description: optStr(req.body.description) } : {}),
        ...(progress !== undefined && progress !== null ? { progress: Math.round(Math.min(Math.max(progress, 0), 100)) } : {}),
      },
    });
    return res.json({ success: true, result });
  } catch (error) {
    return fail(res, error, "Impossible de modifier le résultat.");
  }
}

export async function deleteResult(req: Request, res: Response) {
  try {
    const id = intParam(req.params.id);
    if (!id) return bad(res, "Identifiant invalide.");
    await prisma.projectResult.delete({ where: { id } });
    return res.json({ success: true, message: "Résultat supprimé." });
  } catch (error) {
    return fail(res, error, "Impossible de supprimer le résultat.");
  }
}

export async function createIndicator(req: Request, res: Response) {
  try {
    const resultId = intParam(req.params.id);
    const name = optStr(req.body?.name);
    if (!resultId) return bad(res, "Identifiant de résultat invalide.");
    if (!name) return bad(res, "Le nom de l'indicateur est obligatoire.");
    if (!(await prisma.projectResult.findUnique({ where: { id: resultId }, select: { id: true } })))
      return notFound(res, "Résultat");

    const baseline = optNum(req.body?.baseline);
    const target = optNum(req.body?.target);
    if (target !== undefined && target !== null && baseline !== undefined && baseline !== null && target === baseline)
      return bad(res, "La cible doit être différente de la valeur de référence.");

    const indicator = await prisma.projectIndicator.create({
      data: {
        resultId,
        name,
        description: optStr(req.body?.description) ?? null,
        unit: optStr(req.body?.unit) ?? null,
        baseline: baseline ?? null,
        target: target ?? null,
        currentValue: baseline ?? null,
        source: optStr(req.body?.source) ?? null,
        frequency: optStr(req.body?.frequency) ?? null,
        responsibleId: intParam(req.body?.responsibleId),
      },
    });
    return res.status(201).json({ success: true, indicator });
  } catch (error) {
    return fail(res, error, "Impossible de créer l'indicateur.");
  }
}

export async function updateIndicator(req: Request, res: Response) {
  try {
    const id = intParam(req.params.id);
    if (!id) return bad(res, "Identifiant invalide.");
    const name = optStr(req.body?.name);
    if (name === null) return bad(res, "Le nom ne peut pas être vide.");

    const indicator = await prisma.projectIndicator.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(req.body?.description !== undefined ? { description: optStr(req.body.description) } : {}),
        ...(req.body?.unit !== undefined ? { unit: optStr(req.body.unit) } : {}),
        ...(req.body?.baseline !== undefined ? { baseline: optNum(req.body.baseline) } : {}),
        ...(req.body?.target !== undefined ? { target: optNum(req.body.target) } : {}),
        ...(req.body?.source !== undefined ? { source: optStr(req.body.source) } : {}),
        ...(req.body?.frequency !== undefined ? { frequency: optStr(req.body.frequency) } : {}),
      },
    });
    return res.json({ success: true, indicator });
  } catch (error) {
    return fail(res, error, "Impossible de modifier l'indicateur.");
  }
}

export async function deleteIndicator(req: Request, res: Response) {
  try {
    const id = intParam(req.params.id);
    if (!id) return bad(res, "Identifiant invalide.");
    await prisma.projectIndicator.delete({ where: { id } });
    return res.json({ success: true, message: "Indicateur supprimé." });
  } catch (error) {
    return fail(res, error, "Impossible de supprimer l'indicateur.");
  }
}

// ------------------------------------------------------------
// Collecte : une mesure met à jour toute la chaîne
// ------------------------------------------------------------

/** POST /api/monitoring/indicators/:id/measurements { value, collectedAt?, note? } */
export async function addMeasurement(req: Request, res: Response) {
  try {
    const id = intParam(req.params.id);
    const value = optNum(req.body?.value);
    if (!id) return bad(res, "Identifiant d'indicateur invalide.");
    if (value === undefined || value === null) return bad(res, "La valeur mesurée est obligatoire et doit être numérique.");
    const collectedAt = optDate(req.body?.collectedAt);
    if (collectedAt === null) return bad(res, "Date de collecte invalide.");

    const indicator = await prisma.projectIndicator.findUnique({
      where: { id },
      include: { result: { include: { objective: { select: { projectId: true } } } } },
    });
    if (!indicator) return notFound(res, "Indicateur");

    const when = collectedAt ?? new Date();
    const measurement = await prisma.indicatorMeasurement.create({
      data: { indicatorId: id, value, collectedAt: when, collectedById: userId(req), note: optStr(req.body?.note) ?? null },
    });

    // La valeur actuelle = mesure la plus récente
    const latest = await prisma.indicatorMeasurement.findFirst({
      where: { indicatorId: id },
      orderBy: { collectedAt: "desc" },
    });
    const updated = await prisma.projectIndicator.update({
      where: { id },
      data: { currentValue: latest?.value ?? value, lastCollectedAt: latest?.collectedAt ?? when },
    });

    // Propagation : Indicateur → Résultat
    const siblings = await prisma.projectIndicator.findMany({ where: { resultId: indicator.resultId } });
    const progresses = siblings
      .map((i) => indicatorProgress({ baseline: i.baseline, target: i.target, currentValue: i.currentValue }))
      .filter((v): v is number => v !== null);
    if (progresses.length) {
      await prisma.projectResult.update({
        where: { id: indicator.resultId },
        data: { progress: Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length) },
      });
    }

    // Résultat → Projet → historique
    await recordSnapshot(indicator.result.objective.projectId);

    return res.status(201).json({ success: true, measurement, indicator: updated });
  } catch (error) {
    return fail(res, error, "Impossible d'enregistrer la mesure.");
  }
}

/** GET /api/monitoring/indicators/:id/measurements */
export async function getMeasurements(req: Request, res: Response) {
  try {
    const id = intParam(req.params.id);
    if (!id) return bad(res, "Identifiant invalide.");
    const measurements = await prisma.indicatorMeasurement.findMany({
      where: { indicatorId: id },
      orderBy: { collectedAt: "asc" },
      take: 500,
    });
    return res.json({ success: true, measurements });
  } catch (error) {
    return fail(res, error, "Impossible de récupérer les mesures.");
  }
}

// ------------------------------------------------------------
// Avancement d'une activité (le statut est déduit automatiquement)
// ------------------------------------------------------------

/** PATCH /api/monitoring/activities/:id/progress { progress, budgetSpent? } */
export async function updateActivityProgress(req: Request, res: Response) {
  try {
    const id = intParam(req.params.id);
    if (!id) return bad(res, "Identifiant d'activité invalide.");

    const progress = optNum(req.body?.progress);
    if (progress === undefined || progress === null || progress < 0 || progress > 100)
      return bad(res, "L'avancement doit être un nombre compris entre 0 et 100.");

    const spent = optNum(req.body?.budgetSpent);
    if (spent !== undefined && (spent === null || spent < 0))
      return bad(res, "Le budget utilisé doit être un nombre positif.");

    const activity = await prisma.activity.findUnique({ where: { id } });
    if (!activity) return notFound(res, "Activité");
    if (activity.status === "CANCELLED") return bad(res, "Cette activité est annulée.");

    const rounded = Math.round(progress);
    const status = statusFromProgress(rounded, activity.status);
    const now = new Date();

    const updated = await prisma.activity.update({
      where: { id },
      data: {
        progress: rounded,
        status,
        ...(spent !== undefined ? { budgetSpent: spent } : {}),
        ...(rounded > 0 && !activity.actualStartDate ? { actualStartDate: now } : {}),
        ...(status === "COMPLETED" ? { actualEndDate: now } : { actualEndDate: null }),
      },
    });

    await recordSnapshot(activity.projectId, `Activité « ${activity.title} » : ${activity.progress} % → ${rounded} %`);

    return res.json({ success: true, message: "Avancement mis à jour.", activity: updated });
  } catch (error) {
    return fail(res, error, "Impossible de mettre à jour l'avancement.");
  }
}

/** PATCH /api/monitoring/projects/:id/budget { budgetSpent } */
export async function updateProjectBudget(req: Request, res: Response) {
  try {
    const id = intParam(req.params.id);
    const spent = optNum(req.body?.budgetSpent);
    if (!id) return bad(res, "Identifiant de projet invalide.");
    if (spent === undefined || spent === null || spent < 0)
      return bad(res, "Le budget consommé doit être un nombre positif.");

    const project = await prisma.project.findUnique({ where: { id }, select: { id: true, budget: true } });
    if (!project) return notFound(res, "Projet");

    const planned = num(project.budget);
    const updated = await prisma.project.update({ where: { id }, data: { budgetSpent: spent } });
    await recordSnapshot(id);

    return res.json({
      success: true,
      project: updated,
      warning: planned !== null && spent > planned ? "Le budget consommé dépasse le budget prévu." : undefined,
    });
  } catch (error) {
    return fail(res, error, "Impossible de mettre à jour le budget.");
  }
}
