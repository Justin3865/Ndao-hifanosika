/**
 * Saisie manuelle d'avancement (projets + stages) pour tester la note finale.
 * Route AJOUTÉE : ne modifie aucune route / aucun calcul existant.
 * Montée sur /api/manual-progress (voir INSTALL.md).
 *
 * Projets : écrit dans Activity.progress / status (lu par finalEvaluation « réalisation »).
 *           La mise à jour d'une activité existante utilise la route déjà en place
 *           PATCH /api/monitoring/activities/:id/progress.
 * Stages  : écrit dans InternshipTask / InternshipEvaluation (lus par internshipMonitoring).
 */
import { Router, Request, Response } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import { getReqUser, canSeeInternship } from "../utils/dataScope";
import { PRESENCE_MONTHS } from "../services/internshipMonitoring.service";
import { recordSnapshot, statusFromProgress } from "../services/monitoring.service";

const router = Router();
router.use(authenticate);

const PROJECT_WRITE = ["ADMIN", "DIRECTION", "COORDINATOR"] as const;
const STAGE_WRITE = ["ADMIN", "RH", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2"] as const;

const TASK_STATUSES = ["TODO", "IN_PROGRESS", "COMPLETED", "BLOCKED", "CANCELLED"] as const;
type TaskStatus = (typeof TASK_STATUSES)[number];

const int = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};
const num = (v: unknown): number | null => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const str = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
};
const date = (v: unknown): Date | null => {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
};
const dayKey = (d: Date) => d.toISOString().slice(0, 10);
/** Dernier jour pris en compte pour la présence : fin de la durée prévue, sinon fin du stage. */
const monthsEnd = (start: Date, months: number): Date => {
  const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, start.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - 1);
  d.setUTCHours(23, 59, 59, 999);
  return d;
};
const limitOf = (i: { startDate: Date; endDate: Date | null; durationMonths: number | null }, role?: string): Date | null => {
  const months = i.durationMonths || (role ? (String(role).endsWith("M2") ? PRESENCE_MONTHS.M2 : PRESENCE_MONTHS.L3) : null);
  return months ? monthsEnd(i.startDate, months) : i.endDate;
};
const bad = (res: Response, message: string) => res.status(400).json({ success: false, message });
const fail = (res: Response, e: unknown, message: string) => {
  logger.error(`[manual-progress] ${message}`, e);
  return res.status(500).json({ success: false, message });
};

/* ----------------------------- PROJETS ----------------------------- */

router.get("/projects/:id/activities", authorizeRoles(...PROJECT_WRITE), async (req: Request, res: Response) => {
  try {
    const projectId = int(req.params.id);
    if (!projectId) return bad(res, "Projet invalide.");
    const activities = await prisma.activity.findMany({
      where: { projectId },
      select: {
        id: true, title: true, progress: true, status: true, startDate: true, endDate: true, updatedAt: true,
        location: true, budget: true, description: true,
      },
      orderBy: { id: "asc" },
    });
    return res.json({ success: true, activities });
  } catch (e) {
    return fail(res, e, "Impossible de lister les activités.");
  }
});

router.post("/projects/:id/activities", authorizeRoles(...PROJECT_WRITE), async (req: Request, res: Response) => {
  try {
    const projectId = int(req.params.id);
    const user = getReqUser(req);
    if (!projectId || !user) return bad(res, "Projet invalide.");
    const title = str(req.body?.title);
    if (!title) return bad(res, "Le titre de l'activité est obligatoire.");
    const progress = num(req.body?.progress);
    if (progress === null || progress < 0 || progress > 100) return bad(res, "L'avancement doit être compris entre 0 et 100.");

    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) return res.status(404).json({ success: false, message: "Projet introuvable." });

    // champs facultatifs de la fiche activité : lieu, période, budget, description
    const startDate = date(req.body?.startDate);
    const endDate = date(req.body?.endDate);
    if (startDate && endDate && endDate < startDate) return bad(res, "La date de fin doit être postérieure à la date de début.");
    const budget = num(req.body?.budget);
    if (budget !== null && budget < 0) return bad(res, "Le budget ne peut pas être négatif.");

    const rounded = Math.round(progress);
    const status = statusFromProgress(rounded, "PLANNED");
    const now = new Date();
    const activity = await prisma.activity.create({
      data: {
        projectId,
        title,
        startDate,
        endDate,
        location: str(req.body?.location),
        description: str(req.body?.description),
        ...(budget !== null ? { budget } : {}),
        progress: rounded,
        status,
        createdById: user.id,
        ...(rounded > 0 ? { actualStartDate: now } : {}),
        ...(status === "COMPLETED" ? { actualEndDate: now } : {}),
      },
    });
    await recordSnapshot(projectId, `Saisie manuelle : activité « ${title} » à ${rounded} %`);
    return res.status(201).json({ success: true, message: "Activité ajoutée.", activity });
  } catch (e) {
    return fail(res, e, "Impossible d'ajouter l'activité.");
  }
});

/* ------------------------------ STAGES ------------------------------ */

async function loadInternship(req: Request, res: Response) {
  const id = int(req.params.id);
  if (!id) {
    bad(res, "Stage invalide.");
    return null;
  }
  const internship = (await prisma.internship.findUnique({
    where: { id },
    select: { id: true, studentId: true, supervisorId: true, startDate: true, endDate: true, durationMonths: true },
  } as never)) as null | {
    id: number;
    studentId: number;
    supervisorId: number | null;
    startDate: Date;
    endDate: Date | null;
    durationMonths: number | null;
  };
  if (!internship) {
    res.status(404).json({ success: false, message: "Stage introuvable." });
    return null;
  }
  if (!canSeeInternship(getReqUser(req), internship)) {
    res.status(403).json({ success: false, message: "Accès refusé à ce stage." });
    return null;
  }
  return internship;
}

router.get("/internships/:id", authorizeRoles(...STAGE_WRITE), async (req: Request, res: Response) => {
  try {
    const internship = await loadInternship(req, res);
    if (!internship) return;
    const student = await prisma.user.findUnique({ where: { id: internship.studentId }, select: { role: true } });
    const limit = limitOf(internship, String(student?.role ?? ""));
    const [tasks, evaluations, missions] = await Promise.all([
      prisma.internshipTask.findMany({
        where: { internshipId: internship.id },
        select: { id: true, title: true, status: true, progress: true, dueDate: true, report: true, updatedAt: true },
        orderBy: { id: "asc" },
      }),
      prisma.internshipEvaluation.findMany({
        where: { internshipId: internship.id },
        select: { id: true, title: true, overallScore: true, evaluatedAt: true },
        orderBy: { id: "asc" },
      }),
      prisma.mission.findMany({
        where: {
          agentId: internship.studentId,
          startedAt: { gte: internship.startDate, ...(limit ? { lte: new Date(limit.getTime() + 86400000) } : {}) },
        },
        select: { startedAt: true },
      }),
    ]);
    const presenceDays = [...new Set(missions.map((m) => dayKey(m.startedAt)))].sort();
    const defaultMonths = String(student?.role).endsWith("M2") ? PRESENCE_MONTHS.M2 : PRESENCE_MONTHS.L3;
    return res.json({
      success: true,
      tasks,
      evaluations,
      presenceDays,
      durationMonths: internship.durationMonths,
      defaultMonths,
    });
  } catch (e) {
    return fail(res, e, "Impossible de lire le stage.");
  }
});

/** Durée prévue du stage (L3 = 2 mois, M2 = 6 mois, autre = libre) : sert au calcul de la présence. */
router.put("/internships/:id/duration", authorizeRoles(...STAGE_WRITE), async (req: Request, res: Response) => {
  try {
    const internship = await loadInternship(req, res);
    if (!internship) return;
    const months = num(req.body?.months);
    if (months === null || !Number.isInteger(months) || months < 1 || months > 36)
      return bad(res, "La durée doit être un nombre entier de mois entre 1 et 36.");
    await prisma.internship.update({ where: { id: internship.id }, data: { durationMonths: months } as never });
    return res.json({ success: true, message: `Durée enregistrée : ${months} mois.` });
  } catch (e) {
    return fail(res, e, "Impossible d'enregistrer la durée.");
  }
});

router.post("/internships/:id/tasks", authorizeRoles(...STAGE_WRITE), async (req: Request, res: Response) => {
  try {
    const internship = await loadInternship(req, res);
    if (!internship) return;
    const title = str(req.body?.title);
    if (!title) return bad(res, "Le titre de la tâche est obligatoire.");
    let status = String(req.body?.status ?? "IN_PROGRESS") as TaskStatus;
    if (!TASK_STATUSES.includes(status)) return bad(res, "Statut invalide.");
    let progress = num(req.body?.progress) ?? 0;
    if (progress < 0 || progress > 100) return bad(res, "L'avancement doit être compris entre 0 et 100.");
    progress = Math.round(progress);
    if (status === "COMPLETED") progress = 100;
    else if (status === "TODO" && progress > 0) status = "IN_PROGRESS";

    const task = await prisma.internshipTask.create({
      data: {
        internshipId: internship.id,
        title,
        status,
        progress,
        dueDate: date(req.body?.dueDate),
        report: str(req.body?.report),
        completedAt: status === "COMPLETED" ? new Date() : null,
      },
      select: { id: true, title: true, status: true, progress: true },
    });
    return res.status(201).json({ success: true, message: "Tâche ajoutée.", task });
  } catch (e) {
    return fail(res, e, "Impossible d'ajouter la tâche.");
  }
});

/**
 * Mise à jour d'une tâche existante (équivalent, côté stage, de
 * PATCH /api/monitoring/activities/:id/progress côté projet).
 */
router.patch("/internships/:id/tasks/:taskId", authorizeRoles(...STAGE_WRITE), async (req: Request, res: Response) => {
  try {
    const internship = await loadInternship(req, res);
    if (!internship) return;
    const taskId = int(req.params.taskId);
    if (!taskId) return bad(res, "Tâche invalide.");
    const current = await prisma.internshipTask.findFirst({
      where: { id: taskId, internshipId: internship.id },
      select: { id: true, status: true, progress: true },
    });
    if (!current) return res.status(404).json({ success: false, message: "Tâche introuvable." });

    let status = String(req.body?.status ?? current.status) as TaskStatus;
    if (!TASK_STATUSES.includes(status)) return bad(res, "Statut invalide.");
    let progress = req.body?.progress === undefined ? current.progress : num(req.body?.progress);
    if (progress === null || progress < 0 || progress > 100) return bad(res, "L'avancement doit être compris entre 0 et 100.");
    progress = Math.round(progress);
    if (status === "COMPLETED") progress = 100;
    else if (progress === 100 && req.body?.status === undefined) status = "COMPLETED";
    else if (status === "TODO" && progress > 0) status = "IN_PROGRESS";

    const task = await prisma.internshipTask.update({
      where: { id: taskId },
      data: {
        status,
        progress,
        completedAt: status === "COMPLETED" ? new Date() : null,
        ...(req.body?.report !== undefined ? { report: str(req.body.report) } : {}),
      },
      select: { id: true, title: true, status: true, progress: true },
    });
    return res.json({ success: true, message: "Tâche mise à jour.", task });
  } catch (e) {
    return fail(res, e, "Impossible de mettre à jour la tâche.");
  }
});

/**
 * Saisie manuelle de la présence : crée une « mission » vide (sans point GPS) par jour ouvré présent.
 * La présence du stage = jours distincts avec mission ÷ jours ouvrés (calcul existant, inchangé).
 * Body : { from: "YYYY-MM-DD", to?: "YYYY-MM-DD" } — un jour ou une période (week-ends ignorés).
 */
router.post("/internships/:id/presence", authorizeRoles(...STAGE_WRITE), async (req: Request, res: Response) => {
  try {
    const internship = await loadInternship(req, res);
    if (!internship) return;
    const from = date(req.body?.from);
    const to = date(req.body?.to) ?? from;
    if (!from || !to) return bad(res, "Date de présence invalide.");
    if (to < from) return bad(res, "La date de fin précède la date de début.");
    const startDay = Date.UTC(internship.startDate.getUTCFullYear(), internship.startDate.getUTCMonth(), internship.startDate.getUTCDate());
    const now = new Date();
    const todayDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const stu = await prisma.user.findUnique({ where: { id: internship.studentId }, select: { role: true } });
    const limit = limitOf(internship, String(stu?.role ?? ""));
    const endLimit = limit
      ? Math.min(todayDay, Date.UTC(limit.getUTCFullYear(), limit.getUTCMonth(), limit.getUTCDate()))
      : todayDay;

    const days: string[] = [];
    const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
    const last = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
    while (d.getTime() <= last && days.length < 400) {
      const wd = d.getUTCDay();
      if (wd !== 0 && wd !== 6 && d.getTime() >= startDay && d.getTime() <= endLimit) days.push(dayKey(d));
      d.setUTCDate(d.getUTCDate() + 1);
    }
    if (days.length === 0) return bad(res, "Aucun jour ouvré valide dans la période (dans les dates du stage, pas dans le futur).");

    const existing = await prisma.mission.findMany({
      where: { agentId: internship.studentId, startedAt: { gte: new Date(`${days[0]}T00:00:00.000Z`), lte: new Date(`${days[days.length - 1]}T23:59:59.999Z`) } },
      select: { startedAt: true },
    });
    const already = new Set(existing.map((m) => dayKey(m.startedAt)));
    const toCreate = days.filter((k) => !already.has(k));
    if (toCreate.length) {
      await prisma.mission.createMany({
        data: toCreate.map((k) => ({
          agentId: internship.studentId,
          startedAt: new Date(`${k}T08:00:00.000Z`),
          endedAt: new Date(`${k}T16:00:00.000Z`),
          endReason: "MANUEL",
        })),
      });
    }
    return res.status(201).json({
      success: true,
      message: toCreate.length ? `Présence enregistrée : ${toCreate.length} jour(s).` : "Ces jours sont déjà enregistrés.",
    });
  } catch (e) {
    return fail(res, e, "Impossible d'enregistrer la présence.");
  }
});

router.post("/internships/:id/evaluations", authorizeRoles(...STAGE_WRITE), async (req: Request, res: Response) => {
  try {
    const internship = await loadInternship(req, res);
    const user = getReqUser(req);
    if (!internship || !user) return;
    const scores = {
      technicalScore: num(req.body?.technicalScore),
      qualityScore: num(req.body?.qualityScore),
      autonomyScore: num(req.body?.autonomyScore),
      punctualityScore: num(req.body?.punctualityScore),
      communicationScore: num(req.body?.communicationScore),
    };
    const given = Object.values(scores).filter((v): v is number => v !== null);
    if (given.some((v) => v < 0 || v > 20)) return bad(res, "Chaque note doit être comprise entre 0 et 20.");
    if (given.length === 0) return bad(res, "Renseignez au moins un critère.");
    const overall = Math.round((given.reduce((a, b) => a + b, 0) / given.length) * 100) / 100;

    const evaluation = await prisma.internshipEvaluation.create({
      data: {
        internshipId: internship.id,
        evaluatorId: user.id,
        title: str(req.body?.title) ?? "Évaluation finale",
        ...scores,
        overallScore: overall,
        comments: str(req.body?.comments),
        evaluatedAt: date(req.body?.evaluatedAt) ?? new Date(),
      },
      select: { id: true, title: true, overallScore: true },
    });
    return res.status(201).json({ success: true, message: "Évaluation ajoutée.", evaluation });
  } catch (e) {
    return fail(res, e, "Impossible d'ajouter l'évaluation.");
  }
});

export default router;
