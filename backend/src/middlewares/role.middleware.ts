import { NextFunction, Request, Response } from "express";

import { AuthenticatedRequest } from "./auth.middleware";

export function authorizeRoles(
  ...allowedRoles: string[]
) {
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
        message: "Authentification requise",
      });
      return;
    }

    if (
      !allowedRoles.includes(
        authenticatedRequest.user.role,
      )
    ) {
      res.status(403).json({
        success: false,
        message: "Accès refusé",
      });
      return;
    }

    next();
  };
}