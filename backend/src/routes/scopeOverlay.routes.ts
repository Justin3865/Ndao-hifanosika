// src/routes/scopeOverlay.routes.ts
// Routeur « recouvrement » monté UNE fois sur /api, AVANT les routeurs existants (voir appliquer-protection-perimetre.py).
// Il ajoute, sans toucher à un seul contrôleur :
//   1. le périmètre des coordinateurs sur les vues agrégées (zones, tableaux de bord, rapports, IA/ML) ;
//   2. la protection des données des mineurs et des femmes vulnérables (masquage selon le rôle + journal d'accès).
// Puis il passe la main (next) aux routeurs d'origine, qui répondent comme avant.

import { NextFunction, Request, Response, Router } from "express";

import { aggregateScope, decorateGlobalZones } from "../middlewares/aggregateScope.middleware";
import { authenticate } from "../middlewares/auth.middleware";
import { dataProtection } from "../middlewares/dataProtection.middleware";

export const PROTECTED_PREFIXES = [
  "/vulnerability",
  "/reports",
  "/ai",
  "/monitoring",
  "/integration",
  "/beneficiaries",
  "/journey",
  "/follow-ups",
  "/tracking",
  "/certificates",
  "/evaluations",
];

/** Identifie l'appelant si un jeton est présent ; sans jeton, les routeurs d'origine répondent eux-mêmes 401. */
function softAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.headers.authorization) return next();
  void authenticate(req as never, res, next);
}

export const scopeOverlayRouter = Router();

scopeOverlayRouter.use(PROTECTED_PREFIXES, softAuth, aggregateScope as never, decorateGlobalZones as never, dataProtection as never);

export default scopeOverlayRouter;
