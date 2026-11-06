// src/middlewares/aggregateScope.middleware.ts
// Applique le périmètre « coordinateur → ses projets » aux vues AGRÉGÉES (voir utils/aggregateScopeRules.ts).
// Monté UNE fois, en amont des routeurs existants, par routes/scopeOverlay.routes.ts : aucun contrôleur n'est modifié.

import { NextFunction, Response } from "express";

import { beneficiaryIdsOfProjects, loadScope } from "../services/projectScope.service";
import {
  DENY_MESSAGE,
  allowedBy,
  classifyAggregate,
  filterRows,
  projectIdOf,
  recomputeInBody,
} from "../utils/aggregateScopeRules";
import { canAccessProject } from "../utils/projectScopeRules";
import { coordinatorsOfProjects, dashboardForProjects, decorateZones, demographicsByZone, zoneStatsForProjects } from "../services/scopedAggregates.service";
import { ScopedRequest } from "./coordinatorScope.middleware";

const legacyAggregates = () => (process.env.COORDINATOR_AGGREGATES ?? "").trim().toLowerCase() === "allow";

const deny = (res: Response, message = DENY_MESSAGE) =>
  res.status(403).json({ success: false, code: "SCOPE_AGGREGATE_DENIED", message });

/** Remplace res.json : la fonction reçoit le corps et renvoie le corps à envoyer. */
function rewriteJson(res: Response, fn: (body: unknown) => unknown): void {
  const original = res.json.bind(res);
  res.json = ((body: unknown) => original(fn(body))) as Response["json"];
}

export async function aggregateScope(req: ScopedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(); // les routeurs en aval répondent 401
    const scope = req.projectScope ?? (await loadScope(req.user));
    req.projectScope = scope;
    if (!scope.scoped || legacyAggregates()) return next();

    const action = classifyAggregate(req.method, req.originalUrl);

    switch (action.kind) {
      case "allow":
        return next();

      case "deny":
        return void deny(res);

      case "guard":
        return canAccessProject(scope, action.projectId)
          ? next()
          : void res.status(403).json({ success: false, message: "Accès refusé : ce projet ne vous est pas affecté." });

      case "recompute": {
        if (action.what === "zones") {
          const [zones, demo] = await Promise.all([zoneStatsForProjects(scope.allowed), demographicsByZone(scope.allowed)]);
          return void res.json({ success: true, data: decorateZones(zones, demo), mlAvailable: false, mlSource: null, scoped: true });
        }
        if (action.what === "dashboard") {
          const team = await coordinatorsOfProjects(scope.allowed);
          return void res.json({ success: true, data: await dashboardForProjects(scope.allowed, team), scoped: true });
        }
        return next();
      }

      case "filter": {
        if (action.by === "projectId") {
          const ok = allowedBy(scope);
          rewriteJson(res, (body) => {
            const filtered = filterRows(body, projectIdOf, ok);
            return action.recompute ? recomputeInBody(filtered, action.recompute) : filtered;
          });
        } else {
          const ids = await beneficiaryIdsOfProjects(scope.allowed);
          rewriteJson(res, (body) =>
            filterRows(body, (row) => (typeof row.beneficiaryId === "number" ? row.beneficiaryId : undefined), (id) => typeof id === "number" && ids.has(id)),
          );
        }
        return next();
      }
    }
  } catch (error) {
    next(error);
  }
}

/** Pour les roles NON restreints : ajoute seulement minors / vulnerableWomen / lowCount à /vulnerability/zones. */
export async function decorateGlobalZones(req: ScopedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.method !== "GET" || req.originalUrl.split("?")[0]!.replace(/\/+$/, "") !== "/api/vulnerability/zones") return next();
    const scope = req.projectScope;
    if (scope?.scoped && !legacyAggregates()) return next(); // déjà traité par aggregateScope
    const demo = await demographicsByZone();
    const original = res.json.bind(res);
    res.json = ((body: unknown) => {
      const b = body as { data?: Array<{ id: number; total: number }> } | null;
      if (b && Array.isArray(b.data)) return original({ ...b, data: decorateZones(b.data, demo) });
      return original(body);
    }) as Response["json"];
    next();
  } catch (error) {
    next(error);
  }
}
