import { Request, Response, Router } from "express";

import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { authenticate } from "../middlewares/auth.middleware";
import { dataProtection } from "../middlewares/dataProtection.middleware";
import { sendError } from "../middlewares/error.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";
import {
  EnrollmentError,
  RuleInput,
  createCandidateSurvey,
  enrollManually,
  getRule,
  listEnquetes,
  lowerThreshold,
  nextEnqueteInfo,
  overview,
  runSelection,
  saveRule,
} from "../services/enrollment.service";
import { MISSION_ROLES } from "../services/field.service";
import { loadScope } from "../services/projectScope.service";
import { getReqUser } from "../utils/dataScope";
import { canAccessProject } from "../utils/projectScopeRules";

/* ===================================================================
 * /api/enrollment — enquêtes de mission, critères et quotas par projet,
 * sélection automatique des bénéficiaires.
 * =================================================================== */

export const enrollmentRouter = Router();

enrollmentRouter.use(authenticate);
// Même protection que les autres routes de données personnelles (mineurs, femmes vulnérables)
enrollmentRouter.use(dataProtection as never);

const VIEW = authorizeRoles("ADMIN", "DIRECTION", "COORDINATOR");
const FIELD = authorizeRoles(...MISSION_ROLES);
const ADMIN_DIRECTION = authorizeRoles("ADMIN", "DIRECTION");

function fail(res: Response, error: unknown, label: string): void {
  if (error instanceof EnrollmentError) {
    res.status(error.status).json({ success: false, message: error.message });
    return;
  }

  logger.error(label, error);
  sendError(res, error, "Erreur serveur");
}

const projectIdParam = (req: Request): number | null => {
  const id = Number(req.params.projectId ?? req.body?.projectId ?? req.query.projectId);
  return Number.isInteger(id) && id > 0 ? id : null;
};

/** GET /api/enrollment/overview — quota, places restantes et critères de chaque projet */
enrollmentRouter.get("/overview", VIEW, async (req: Request, res: Response) => {
  try {
    const scope = await loadScope(getReqUser(req)!);
    res.json({ success: true, data: await overview(scope.scoped ? scope.allowed : null) });
  } catch (error) {
    fail(res, error, "Erreur enrollment overview");
  }
});

/** GET /api/enrollment/enquetes?q=&status=&kind=&projectId=&limit= — TOUTES les enquêtes réalisées en mission */
enrollmentRouter.get("/enquetes", VIEW, async (req: Request, res: Response) => {
  try {
    const user = getReqUser(req)!;
    const scope = await loadScope(user);
    const projectId = projectIdParam(req);

    if (projectId && !canAccessProject(scope, projectId)) {
      res.status(403).json({ success: false, message: "Accès refusé : ce projet ne vous est pas affecté." });
      return;
    }

    const data = await listEnquetes({
      q: String(req.query.q ?? ""),
      status: String(req.query.status ?? ""),
      kind: String(req.query.kind ?? ""),
      projectId,
      limit: Number(req.query.limit) || 100,
      scope: scope.scoped ? { allowed: scope.allowed, userId: user.id } : null,
    });

    res.json({ success: true, data });
  } catch (error) {
    fail(res, error, "Erreur enrollment enquetes");
  }
});

/** GET /api/enrollment/next-code — prochain matricule d'ENQUÊTE (NH-AAAA-ENQ-0001) + matricule de l'agent auquel l'enquête sera rattachée */
enrollmentRouter.get("/next-code", FIELD, async (req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await nextEnqueteInfo(getReqUser(req)!.id) });
  } catch (error) {
    fail(res, error, "Erreur calcul du prochain matricule d'enquête");
  }
});

/** POST /api/enrollment/candidates — enquête d'un NOUVEAU ménage pendant la mission (puis sélection automatique) */
enrollmentRouter.post("/candidates", FIELD, async (req: Request, res: Response) => {
  try {
    const { candidate, selection } = await createCandidateSurvey(getReqUser(req)!.id, req.body ?? {});

    const mine = selection?.projects.flatMap((p) => p.selected.map((s) => ({ ...s, projectId: p.projectId, projectName: p.projectName }))).find((s) => s.candidateId === candidate.id);

    // Matricule bénéficiaire : seulement si le ménage vient d'être sélectionné
    const beneficiaryId = mine?.beneficiaryId ?? candidate.beneficiaryId ?? null;
    const beneficiary = beneficiaryId ? await prisma.beneficiary.findUnique({ where: { id: beneficiaryId }, select: { matricule: true } }) : null;

    res.status(201).json({
      success: true,
      data: {
        id: candidate.id,
        code: candidate.code,
        agentMatricule: candidate.agentMatricule ?? null,
        beneficiaryMatricule: beneficiary?.matricule ?? null,
        status: candidate.status,
        score: candidate.score,
        method: candidate.scoreMethod,
        enrolled: !!mine,
        projectName: mine?.projectName ?? null,
        beneficiaryId,
        waitlistRank: candidate.waitlistRank,
      },
    });
  } catch (error) {
    fail(res, error, "Erreur création candidat");
  }
});

/** GET /api/enrollment/rules/:projectId */
enrollmentRouter.get("/rules/:projectId", VIEW, async (req: Request, res: Response) => {
  try {
    const projectId = projectIdParam(req);
    const scope = await loadScope(getReqUser(req)!);

    if (!projectId) {
      res.status(400).json({ success: false, message: "Projet invalide" });
      return;
    }

    if (!canAccessProject(scope, projectId)) {
      res.status(403).json({ success: false, message: "Accès refusé : ce projet ne vous est pas affecté." });
      return;
    }

    res.json({ success: true, data: await getRule(projectId) });
  } catch (error) {
    fail(res, error, "Erreur lecture critères");
  }
});

/** PUT /api/enrollment/rules/:projectId — enregistre les critères, puis relance la sélection automatique du projet */
enrollmentRouter.put("/rules/:projectId", VIEW, async (req: Request, res: Response) => {
  try {
    const user = getReqUser(req)!;
    const projectId = projectIdParam(req);
    const scope = await loadScope(user);

    if (!projectId) {
      res.status(400).json({ success: false, message: "Projet invalide" });
      return;
    }

    if (!canAccessProject(scope, projectId)) {
      res.status(403).json({ success: false, message: "Accès refusé : ce projet ne vous est pas affecté." });
      return;
    }

    const rule = await saveRule(projectId, (req.body ?? {}) as RuleInput, user.id);

    // Les critères ont changé : on réévalue les candidats (inscription automatique seulement si le projet est en mode automatique)
    const selection = rule.enabled ? await runSelection({ projectId, force: false }) : null;

    res.json({ success: true, data: { rule, selection } });
  } catch (error) {
    fail(res, error, "Erreur enregistrement critères");
  }
});

/**
 * POST /api/enrollment/rules/:projectId/lower
 * Quota non atteint alors que le seuil plancher est atteint : abaisse le seuil de 5 points (50 -> 45 …) et relance la sélection du projet.
 */
enrollmentRouter.post("/rules/:projectId/lower", VIEW, async (req: Request, res: Response) => {
  try {
    const user = getReqUser(req)!;
    const projectId = projectIdParam(req);
    const scope = await loadScope(user);

    if (!projectId) {
      res.status(400).json({ success: false, message: "Projet invalide" });
      return;
    }

    if (!canAccessProject(scope, projectId)) {
      res.status(403).json({ success: false, message: "Accès refusé : ce projet ne vous est pas affecté." });
      return;
    }

    res.json({ success: true, data: await lowerThreshold(projectId, user.id) });
  } catch (error) {
    fail(res, error, "Erreur abaissement du seuil");
  }
});

/**
 * POST /api/enrollment/select  { projectId?, dryRun? }
 * Lance la sélection (ignore l'option « automatique » : c'est une action volontaire).
 * dryRun = simulation : rien n'est enregistré.
 */
enrollmentRouter.post("/select", VIEW, async (req: Request, res: Response) => {
  try {
    const user = getReqUser(req)!;
    const scope = await loadScope(user);
    const projectId = projectIdParam(req);

    if (scope.scoped && !projectId) {
      res.status(400).json({ success: false, message: "Choisissez un projet de votre périmètre." });
      return;
    }

    if (projectId && !canAccessProject(scope, projectId)) {
      res.status(403).json({ success: false, message: "Accès refusé : ce projet ne vous est pas affecté." });
      return;
    }

    const data = await runSelection({
      projectId: projectId ?? undefined,
      dryRun: req.body?.dryRun === true,
      force: true,
      allowedProjects: scope.scoped ? scope.allowed : null,
    });

    res.json({ success: true, data });
  } catch (error) {
    fail(res, error, "Erreur sélection");
  }
});

/** POST /api/enrollment/candidates/:id/enroll  { projectId } — inscription manuelle (ADMIN / DIRECTION) */
enrollmentRouter.post("/candidates/:id/enroll", ADMIN_DIRECTION, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const projectId = projectIdParam(req);

    if (!Number.isInteger(id) || !projectId) {
      res.status(400).json({ success: false, message: "Candidat ou projet invalide" });
      return;
    }

    const beneficiaryId = await enrollManually(id, projectId, getReqUser(req)!.id);
    res.json({ success: true, data: { beneficiaryId } });
  } catch (error) {
    fail(res, error, "Erreur inscription manuelle");
  }
});

export default enrollmentRouter;
