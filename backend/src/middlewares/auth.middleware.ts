import {
  NextFunction,
  Request,
  Response,
} from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env";
import { prisma } from "../config/database";

export interface AuthenticatedRequest
  extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
    status: string;
  };
}

interface JwtPayload {
  userId: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authorization =
      req.headers.authorization;

    if (!authorization) {
      res.status(401).json({
        success: false,
        message:
          "Token d'authentification requis",
      });
      return;
    }

    const [type, token] =
      authorization.trim().split(/\s+/);

    if (
      type !== "Bearer" ||
      !token
    ) {
      res.status(401).json({
        success: false,
        message:
          "Format du token invalide",
      });
      return;
    }

    const decoded = jwt.verify(
      token,
      env.JWT_SECRET,
    ) as JwtPayload;

    if (
      !decoded.userId ||
      !decoded.email ||
      !decoded.role
    ) {
      res.status(401).json({
        success: false,
        message:
          "Payload du token invalide",
      });
      return;
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: Number(decoded.userId),
        },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
        },
      });

    if (!user) {
      res.status(401).json({
        success: false,
        message:
          "Utilisateur introuvable",
      });
      return;
    }

    /*
     * Le rôle et le statut sont relus depuis
     * PostgreSQL et non pas uniquement depuis
     * le JWT.
     *
     * Ainsi, si un administrateur modifie le rôle
     * ou désactive le compte, la modification est
     * immédiatement prise en compte.
     */

    if (user.status !== "ACTIVE") {
      res.status(403).json({
        success: false,
        message:
          "Compte utilisateur inactif",
      });
      return;
    }

    req.user = user;

    next();
  } catch (error) {
    if (
      error instanceof jwt.TokenExpiredError
    ) {
      res.status(401).json({
        success: false,
        message: "Token expiré",
      });
      return;
    }

    if (
      error instanceof jwt.JsonWebTokenError
    ) {
      res.status(401).json({
        success: false,
        message: "Token invalide",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message:
        "Erreur d'authentification",
    });
  }
}