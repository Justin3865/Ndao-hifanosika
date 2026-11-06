import { NextFunction, Response } from "express";

import {
  beneficiaryIdsOfProjects,
  beneficiaryProjectId,
  evaluationProjectId,
  followUpProjectId,
  loadScope,
} from "../services/projectScope.service";
import { ScopeDecision, canAccessProject, filterByProject } from "../utils/projectScopeRules";
import { AuthenticatedRequest } from "./auth.middleware";

export type ScopedRequest = AuthenticatedRequest & { projectScope?: ScopeDecision };

const deny = (res: Response, message = "Accès refusé : ce projet ne vous est pas affecté.") =>
  res.status(403).json({ success: false, message });

/**
 * Charge le périmètre du coordinateur, refuse un ?projectId= hors périmètre et
 * filtre les listes renvoyées (res.json) pour qu'elles ne contiennent que ses projets.
 * N'altère aucun contrôleur existant.
 */
export async function coordinatorScope(req: ScopedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return void res.status(401).json({ success: false, message: "Authentification requise" });
    const scope = await loadScope(req.user);
    req.projectScope = scope;
    if (!scope.scoped) return next();

    const raw = Number(req.query.projectId);
    const projectId = Number.isInteger(raw) && raw > 0 ? raw : undefined;
    if (projectId !== undefined && !canAccessProject(scope, projectId)) return void deny(res);

    // Agrégats impossibles à filtrer a posteriori : projet obligatoire.
    if (req.path.startsWith("/impact") && projectId === undefined) {
      return void res.status(400).json({ success: false, message: "projectId requis pour votre périmètre." });
    }

    const json = res.json.bind(res);
    res.json = ((body: unknown) => {
      const b = body as { data?: unknown } | null;
      if (b && Array.isArray(b.data)) {
        b.data = filterByProject(scope, b.data as Array<Record<string, any>>, (row) =>
          row.projectId ?? row.beneficiary?.projectId,
        );
      }
      return json(body);
    }) as Response["json"];
    next();
  } catch (error) {
    next(error);
  }
}

/** Garde pour les routes /:id portant sur une relance post-programme. */
export async function guardFollowUpById(req: ScopedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const scope = req.projectScope ?? (req.user ? await loadScope(req.user) : undefined);
    if (!scope || !scope.scoped) return next();
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return next();
    const projectId = await followUpProjectId(id);
    if (projectId === null) return next(); // 404 géré par le contrôleur
    return canAccessProject(scope, projectId) ? next() : void deny(res);
  } catch (error) {
    next(error);
  }
}

/** Garde pour les routes /beneficiary/:id. */
export async function guardBeneficiaryById(req: ScopedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const scope = req.projectScope ?? (req.user ? await loadScope(req.user) : undefined);
    if (!scope || !scope.scoped) return next();
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return next();
    const projectId = await beneficiaryProjectId(id);
    if (projectId === null) return next();
    return canAccessProject(scope, projectId) ? next() : void deny(res);
  } catch (error) {
    next(error);
  }
}

/** Écriture : un coordinateur ne peut pas créer/déplacer une donnée vers un projet qui ne lui est pas affecté. */
export async function guardBodyProject(req: ScopedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!["POST", "PUT", "PATCH"].includes(req.method)) return next();
    const scope = req.projectScope ?? (req.user ? await loadScope(req.user) : undefined);
    if (!scope || !scope.scoped) return next();
    const raw = req.body?.projectId;
    if (raw === undefined || raw === null || raw === "") return next();
    return canAccessProject(scope, Number(raw)) ? next() : void deny(res);
  } catch (error) {
    next(error);
  }
}

/** router.param("id", …) : applique le périmètre à TOUTES les routes /:id d'un routeur de bénéficiaires. */
export async function beneficiaryIdParam(req: ScopedRequest, res: Response, next: NextFunction): Promise<void> {
  return guardBeneficiaryById(req, res, next);
}

/** router.param("id", …) pour les évaluations. */
export async function evaluationIdParam(req: ScopedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const scope = req.projectScope ?? (req.user ? await loadScope(req.user) : undefined);
    if (!scope || !scope.scoped) return next();
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return next();
    const projectId = await evaluationProjectId(id);
    if (projectId === null) return next();
    return canAccessProject(scope, projectId) ? next() : void deny(res);
  } catch (error) {
    next(error);
  }
}

/** /api/vulnerability/households : ne garde que les ménages (bénéficiaires) des projets affectés. */
export async function scopeHouseholds(req: ScopedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const scope = req.projectScope ?? (req.user ? await loadScope(req.user) : undefined);
    if (!scope || !scope.scoped) return next();
    const allowedIds = await beneficiaryIdsOfProjects(scope.allowed);
    const json = res.json.bind(res);
    res.json = ((body: unknown) => {
      const b = body as { data?: { households?: Array<{ id: number }> } } | null;
      if (b?.data && Array.isArray(b.data.households)) {
        b.data.households = b.data.households.filter((h) => allowedIds.has(h.id));
      }
      return json(body);
    }) as Response["json"];
    next();
  } catch (error) {
    next(error);
  }
}
