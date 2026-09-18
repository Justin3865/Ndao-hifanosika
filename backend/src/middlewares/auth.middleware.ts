import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env";
import { prisma } from "../config/database";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
    status: string;
  };
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      res.status(401).json({
        success: false,
        message: "Token d'authentification requis",
      });
      return;
    }

    const [type, token] = authorization.split(" ");

    if (type !== "Bearer" || !token) {
      res.status(401).json({
        success: false,
        message: "Format du token invalide",
      });
      return;
    }

    const decoded = jwt.verify(
      token,
      env.JWT_SECRET,
    ) as {
      id: number;
      email: string;
      role: string;
    };

    const user = await prisma.user.findUnique({
      where: {
        id: Number(decoded.id),
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
        message: "Utilisateur introuvable",
      });
      return;
    }

    if (user.status !== "ACTIVE") {
      res.status(403).json({
        success: false,
        message: "Compte utilisateur inactif",
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
      message: "Erreur d'authentification",
    });
  }
}