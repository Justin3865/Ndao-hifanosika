import { NextFunction, Request, Response } from "express";

/**
 * Confidentialité des budgets.
 *
 * Seuls ces rôles voient (et peuvent modifier) les montants financiers.
 * Pour tous les autres (stagiaires, tuteurs, DSI, RH, communication…), le serveur :
 *   - retire tout champ « budget… » des réponses JSON (liste, détail, imbriqué) ;
 *   - ignore tout champ « budget… » envoyé en création / modification.
 * Même en appelant l'API directement, un stagiaire ne reçoit donc jamais un montant.
 */
export const BUDGET_ROLES = ["ADMIN", "DIRECTION", "DAF", "COORDINATOR"];

const BUDGET_KEY = /^(budget|budgetIndicatif|budgetSpent|totalBudget|spentBudget|budgetTotal|budgetUsed)$/i;

const roleOf = (req: Request): string =>
  String((req as Request & { user?: { role?: string } }).user?.role ?? "").toUpperCase();

function stripBody(value: unknown): void {
  if (!value || typeof value !== "object") return;

  if (Array.isArray(value)) {
    value.forEach(stripBody);
    return;
  }

  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (BUDGET_KEY.test(key)) delete (value as Record<string, unknown>)[key];
    else stripBody((value as Record<string, unknown>)[key]);
  }
}

export function budgetGuard(req: Request, res: Response, next: NextFunction): void {
  // Le rôle n'est connu qu'après authenticate() : il est lu au moment de l'envoi de la réponse
  const original = res.json.bind(res);

  res.json = ((body?: unknown) => {
    const role = roleOf(req);

    // Pas d'utilisateur identifié (route publique, erreur d'auth) : rien à filtrer
    if (!role || BUDGET_ROLES.includes(role) || body === null || typeof body !== "object") {
      return original(body);
    }

    // Copie « JSON pure » (Decimal, Date…) avant de retirer les champs financiers
    const copy = JSON.parse(JSON.stringify(body));
    stripBody(copy);

    return original(copy);
  }) as Response["json"];

  next();
}

/** À placer APRÈS authenticate() dans les routes d'écriture : ignore les budgets envoyés par un rôle non autorisé. */
export function ignoreBudgetInput(req: Request, _res: Response, next: NextFunction): void {
  const role = roleOf(req);

  if (role && !BUDGET_ROLES.includes(role)) stripBody(req.body);

  next();
}
