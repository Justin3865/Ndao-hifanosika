import { NextFunction, Request, Response } from "express";

/** Nombre de chiffres d'un numéro de téléphone (ex. 034 00 000 00 -> 0340000000). */
export const PHONE_DIGITS = 10;

/** Noms de champs considérés comme téléphone : phone, parentPhone, studentPhone, holderPhone, telephone… */
const PHONE_KEY = /(phone|telephone)$/i;

/**
 * Parcourt le corps de la requête et impose, pour chaque champ téléphone renseigné,
 * exactement 10 chiffres (au maximum 10, jamais plus). Les espaces / points / tirets
 * sont retirés : le numéro est enregistré en chiffres seulement (ex. 0340000000).
 * Champ vide : inchangé (le caractère obligatoire est géré par chaque route).
 */
function walk(node: unknown, depth = 0): string | null {
  if (!node || typeof node !== "object" || depth > 5) return null;

  if (Array.isArray(node)) {
    for (const item of node) {
      const error = walk(item, depth + 1);
      if (error) return error;
    }
    return null;
  }

  const record = node as Record<string, unknown>;

  for (const key of Object.keys(record)) {
    const value = record[key];

    if (PHONE_KEY.test(key) && typeof value === "string") {
      const raw = value.trim();
      if (!raw) continue;

      const digits = raw.replace(/\D/g, "");
      if (!digits || digits.length !== PHONE_DIGITS || /[^\d\s.\-()+]/.test(raw)) {
        return `Le numéro de téléphone doit contenir exactement ${PHONE_DIGITS} chiffres (ex. 034 00 000 00).`;
      }
      if (raw.startsWith("+") || raw.startsWith("00")) {
        return `Le numéro de téléphone doit contenir exactement ${PHONE_DIGITS} chiffres (ex. 034 00 000 00).`;
      }

      record[key] = digits;
      continue;
    }

    if (value && typeof value === "object") {
      const error = walk(value, depth + 1);
      if (error) return error;
    }
  }

  return null;
}

export function phoneLimit(req: Request, res: Response, next: NextFunction) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS" || req.method === "DELETE") {
    return next();
  }

  const error = walk(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error });
  }

  return next();
}
