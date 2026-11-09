import {
  NextFunction,
  Request,
  Response,
} from "express";

import { prisma } from "../config/database";
import { AuthenticatedRequest } from "./auth.middleware";
import { buildAuditContext } from "../utils/auditRules";
import type { Prisma } from "../../generated/prisma/client";

export async function auditMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authenticatedRequest =
    req as AuthenticatedRequest;

  // Pas de journalisation des lectures (GET) ni des envois de position en continu
  if (
    req.method === "GET" ||
    req.method === "OPTIONS" ||
    req.originalUrl.startsWith("/api/public/tracking")
  ) {
    next();
    return;
  }

  const originalEnd = res.end.bind(res);

  res.end = function (
    ...args: Parameters<Response["end"]>
  ) {
    void (async () => {
      try {
        // entité, identifiant d'entité et détails (cahier §5.1 / §10) : voir utils/auditRules.ts
        const context = buildAuditContext({
          method: req.method,
          originalUrl: req.originalUrl,
          statusCode: res.statusCode,
          body: req.body,
          entity: (res.locals?.auditEntity as string | undefined) ?? (req.baseUrl || null),
          entityId: (res.locals?.auditEntityId as number | undefined) ?? null,
        });

        await prisma.auditLog.create({
          data: {
            userId:
              authenticatedRequest.user?.id ?? null,
            action: `${req.method} ${req.originalUrl}`,
            entity: context.entity,
            entityId: context.entityId,
            details: context.details as unknown as Prisma.InputJsonValue,
            ipAddress:
              req.ip ||
              req.socket.remoteAddress ||
              null,
            userAgent:
              req.headers["user-agent"] ||
              null,
          },
        });
      } catch {
      }
    })();

    return originalEnd(...args);
  } as Response["end"];

  next();
}