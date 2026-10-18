import {
  NextFunction,
  Request,
  Response,
} from "express";

import { logger } from "../config/logger";

interface MappedError {
  status: number;
  message: string;
  errors?: string[];
}

/** Traduit les erreurs connues (Prisma, Zod, body-parser) en réponses HTTP claires. */
export function mapKnownError(error: any): MappedError | null {
  // ----- Zod : données invalides -----
  if (error?.name === "ZodError" && Array.isArray(error.issues)) {
    const errors = error.issues.map((issue: { path?: Array<string | number>; message: string }) =>
      issue.path?.length ? `${issue.path.join(".")} : ${issue.message}` : issue.message,
    );

    return { status: 400, message: errors[0] ?? "Données invalides.", errors };
  }

  // ----- Prisma : erreurs connues -----
  if (typeof error?.code === "string" && /^P\d{4}$/.test(error.code)) {
    switch (error.code) {
      case "P2002": {
        const fields = Array.isArray(error.meta?.target) ? error.meta.target.join(", ") : null;

        return {
          status: 409,
          message: fields
            ? `Cette valeur existe déjà (${fields}).`
            : "Cette valeur existe déjà.",
        };
      }

      case "P2003":
        return {
          status: 409,
          message:
            "Opération impossible : cet élément est lié à d'autres données (ou référence un élément inexistant).",
        };

      case "P2025":
        return { status: 404, message: "Élément introuvable." };

      case "P2000":
        return { status: 400, message: "Une valeur dépasse la longueur autorisée." };

      case "P2006":
      case "P2007":
      case "P2009":
      case "P2011":
      case "P2012":
      case "P2013":
        return { status: 400, message: "Données invalides ou incomplètes." };

      case "P2021":
      case "P2022":
        return {
          status: 500,
          message:
            "Base de données non à jour : exécutez « npx prisma migrate deploy ».",
        };

      default:
        return null;
    }
  }

  if (error?.name === "PrismaClientValidationError") {
    return { status: 400, message: "Données invalides." };
  }

  // ----- body-parser : JSON mal formé / trop volumineux -----
  if (error?.type === "entity.parse.failed") {
    return { status: 400, message: "Corps de requête JSON invalide." };
  }

  if (error?.type === "entity.too.large") {
    return { status: 413, message: "Corps de requête trop volumineux." };
  }

  return null;
}

export function errorMiddleware(
  error: any,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  logger.error(
    error instanceof Error
      ? error.message
      : String(error),
  );

  if (res.headersSent) {
    next(error);
    return;
  }

  const mapped = mapKnownError(error);

  const status =
    mapped?.status ??
    (typeof error?.statusCode === "number"
      ? error.statusCode
      : typeof error?.status === "number" && error.status >= 400 && error.status < 600
        ? error.status
        : 500);

  const isDev = process.env.NODE_ENV === "development";

  // En production, on ne divulgue pas le détail d'une erreur serveur inattendue.
  const message =
    mapped?.message ??
    (status >= 500 && !isDev
      ? "Une erreur interne est survenue."
      : error instanceof Error
        ? error.message
        : "Une erreur interne est survenue.");

  res.status(status).json({
    success: false,
    message,
    ...(mapped?.errors ? { errors: mapped.errors } : {}),
    ...(isDev && status >= 500
      ? { error: error instanceof Error ? error.stack : error }
      : {}),
  });
}


/**
 * Réponse d'erreur homogène pour les blocs catch des contrôleurs :
 * erreurs connues (doublon, référence, introuvable, données invalides) → 4xx clair ;
 * sinon → 500 avec le message de repli fourni.
 */
export function sendError(res: Response, error: unknown, fallbackMessage: string): Response {
  const mapped = mapKnownError(error);

  if (mapped) {
    return res.status(mapped.status).json({
      success: false,
      message: mapped.message,
      ...(mapped.errors ? { errors: mapped.errors } : {}),
    });
  }

  return res.status(500).json({ success: false, message: fallbackMessage });
}
