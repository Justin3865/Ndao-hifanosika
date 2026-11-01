import { Request, Response } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { sendError } from "../middlewares/error.middleware";
import { getReqUser, internshipScope } from "../utils/dataScope";
import {
  BENEFICIARY_CRITERIA,
  FeedbackKind,
  PARTNER_CRITERIA,
  PROJECT_WEIGHTS,
  evaluateAllProjects,
  evaluateInternships,
  evaluateOneProject,
  validateRatings,
} from "../services/finalEvaluation.service";
import { MERIT_WEIGHTS } from "../services/merit.service";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

const fail = (res: Response, status: number, message: string) => res.status(status).json({ success: false, message });

const wrap =
  (message: string, fn: (req: Request, res: Response) => Promise<unknown>) => async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (error) {
      logger.error(message, error);
      sendError(res, error, message);
    }
  };

const idParam = (req: Request, name = "id"): number => {
  const value = Number(req.params[name]);
  return Number.isInteger(value) && value > 0 ? value : 0;
};

const text = (value: unknown, max: number): string | null => {
  const clean = String(value ?? "").trim();
  return clean ? clean.slice(0, max) : null;
};

const average = (values: number[]) => (values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100 : null);

/** GET /projects — évaluation finale automatique de tous les projets, classés par note /20. */
export const listProjectEvaluations = wrap("Impossible de calculer l'évaluation des projets.", async (_req, res) => {
  const items = await evaluateAllProjects();
  const scored = items.filter((item) => item.score !== null);

  res.json({
    success: true,
    data: {
      weights: PROJECT_WEIGHTS,
      projects: items,
      summary: {
        count: items.length,
        evaluated: scored.length,
        average: average(scored.map((item) => item.score as number)),
        final: items.filter((item) => item.phase === "FINAL").length,
        satisfactionPartners: items.reduce((sum, item) => sum + item.satisfaction.partners.count, 0),
        satisfactionBeneficiaries: items.reduce((sum, item) => sum + item.satisfaction.beneficiaries.count, 0),
      },
    },
  });
});

/** GET /projects/:id — détail : composantes, satisfaction par critère, points forts / faibles, avis recueillis. */
export const getProjectEvaluation = wrap("Impossible de calculer l'évaluation du projet.", async (req, res) => {
  const id = idParam(req);
  if (!id) return fail(res, 400, "Identifiant de projet invalide.");

  const data = await evaluateOneProject(id);
  if (!data) return fail(res, 404, "Projet introuvable.");

  res.json({ success: true, data: { ...data, weights: PROJECT_WEIGHTS } });
});

/** POST /projects/:id/feedback — enregistre un questionnaire de satisfaction (partenaire ou bénéficiaire). */
export const createFeedback = wrap("Impossible d'enregistrer l'avis.", async (req, res) => {
  const projectId = idParam(req);
  if (!projectId) return fail(res, 400, "Identifiant de projet invalide.");

  const kind = String(req.body?.kind ?? "").toUpperCase() as FeedbackKind;
  if (kind !== "PARTNER" && kind !== "BENEFICIARY") return fail(res, 400, "Type d'avis invalide (PARTNER ou BENEFICIARY).");

  const project = await db.project.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!project) return fail(res, 404, "Projet introuvable.");

  const checked = validateRatings(kind, req.body?.ratings);
  if ("error" in checked) return fail(res, 400, checked.error);

  let partnerId: number | null = null;
  let beneficiaryId: number | null = null;

  if (kind === "PARTNER") {
    partnerId = Number(req.body?.partnerId);
    if (!Number.isInteger(partnerId) || partnerId <= 0) return fail(res, 400, "Choisissez le partenaire interrogé.");

    const link = await db.projectPartner.findFirst({ where: { projectId, partnerId }, select: { id: true } });
    if (!link) return fail(res, 400, "Ce partenaire n'est pas rattaché à ce projet.");
  } else if (req.body?.beneficiaryId !== undefined && req.body?.beneficiaryId !== null && req.body?.beneficiaryId !== "") {
    beneficiaryId = Number(req.body.beneficiaryId);
    if (!Number.isInteger(beneficiaryId) || beneficiaryId <= 0) return fail(res, 400, "Bénéficiaire invalide.");

    const found = await db.beneficiary.findFirst({ where: { id: beneficiaryId, projectId }, select: { id: true } });
    if (!found) return fail(res, 400, "Ce bénéficiaire n'appartient pas à ce projet.");
  }

  const user = getReqUser(req);
  const row = await db.projectFeedback.create({
    data: {
      projectId,
      kind,
      partnerId,
      beneficiaryId,
      respondent: text(req.body?.respondent, 120),
      ratings: checked.ratings,
      score: checked.score,
      comment: text(req.body?.comment, 2000),
      collectedById: user?.id ?? null,
    },
  });

  res.status(201).json({ success: true, data: row });
});

/** DELETE /feedback/:fid */
export const deleteFeedback = wrap("Impossible de supprimer l'avis.", async (req, res) => {
  const id = idParam(req, "fid");
  if (!id) return fail(res, 400, "Identifiant invalide.");

  const row = await db.projectFeedback.findUnique({ where: { id }, select: { id: true } });
  if (!row) return fail(res, 404, "Avis introuvable.");

  await db.projectFeedback.delete({ where: { id } });
  res.json({ success: true });
});

/** GET /criteria — questionnaires (pour construire les formulaires). */
export const getCriteria = wrap("Erreur", async (_req, res) => {
  res.json({ success: true, data: { PARTNER: PARTNER_CRITERIA, BENEFICIARY: BENEFICIARY_CRITERIA } });
});

/** GET /internships — évaluation finale automatique des stages (tuteur : ses stagiaires ; stagiaire : le sien). */
export const listInternshipEvaluations = wrap("Impossible de calculer l'évaluation des stages.", async (req, res) => {
  const items = await evaluateInternships(internshipScope(getReqUser(req)));
  const scored = items.filter((item) => item.score !== null);

  res.json({
    success: true,
    data: {
      weights: MERIT_WEIGHTS,
      internships: items,
      summary: {
        count: items.length,
        evaluated: scored.length,
        average: average(scored.map((item) => item.score as number)),
        final: items.filter((item) => item.phase === "FINAL").length,
      },
    },
  });
});
