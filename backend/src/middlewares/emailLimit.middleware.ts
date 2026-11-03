import { NextFunction, Request, Response } from "express";
import { emailProblem } from "../utils/fieldRules";

/**
 * Tous les champs e-mail du corps de la requête (email, holderEmail, parentEmail…) doivent être
 * des adresses valides (« rakoto@gmail.comxyz » est refusé). Sur les chemins ci-dessous, l'adresse
 * doit en plus se terminer par un domaine autorisé (PERSON_EMAIL_DOMAINS, « gmail.com » par défaut).
 * L'adresse est enregistrée en minuscules, sans espaces.
 */
const EMAIL_KEY = /email$/i;

/** Préfixes d'URL où le domaine est imposé (ajoutez-en ici si besoin) */
const RESTRICTED_PATHS = ["/api/beneficiaries"];

/** Connexion : on ne bloque jamais un compte existant */
const SKIPPED_PATHS = ["/api/auth/login", "/api/auth/forgot", "/api/auth/reset"];

function walk(node: unknown, restrictDomain: boolean, depth = 0): string | null {
  if (!node || typeof node !== "object" || depth > 5) return null;

  if (Array.isArray(node)) {
    for (const item of node) {
      const error = walk(item, restrictDomain, depth + 1);
      if (error) return error;
    }
    return null;
  }

  const record = node as Record<string, unknown>;

  for (const key of Object.keys(record)) {
    const value = record[key];

    if (EMAIL_KEY.test(key) && typeof value === "string") {
      const error = emailProblem(value, { restrictDomain });
      if (error) return error;

      if (value.trim()) record[key] = value.trim().toLowerCase();
      continue;
    }

    if (value && typeof value === "object") {
      const error = walk(value, restrictDomain, depth + 1);
      if (error) return error;
    }
  }

  return null;
}

export function emailLimit(req: Request, res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS", "DELETE"].includes(req.method)) return next();

  const path = req.originalUrl.split("?")[0];
  if (SKIPPED_PATHS.some((p) => path.startsWith(p))) return next();

  const error = walk(req.body, RESTRICTED_PATHS.some((p) => path.startsWith(p)));
  if (error) return res.status(400).json({ success: false, message: error });

  return next();
}
