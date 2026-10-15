import {
  NextFunction,
  Request,
  Response,
} from "express";

import { AuthenticatedRequest } from "./auth.middleware";

export function authorizeRoles(
  ...allowedRoles: string[]
) {
  const normalizedRoles =
    allowedRoles.map((role) =>
      role.trim().toUpperCase(),
    );

  return (
    req: Request,
    res: Response,
    next: NextFunction,
  ): void => {
    const authenticatedRequest =
      req as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      res.status(401).json({
        success: false,
        message:
          "Authentification requise",
      });
      return;
    }

    const userRole =
      authenticatedRequest.user.role
        .trim()
        .toUpperCase();

    if (
      !normalizedRoles.includes(userRole)
    ) {
      res.status(403).json({
        success: false,
        message:
          "Accès refusé : rôle insuffisant.",
      });
      return;
    }

    next();
  };
}