import {
  NextFunction,
  Request,
  Response,
} from "express";

import { prisma } from "../config/database";
import { AuthenticatedRequest } from "./auth.middleware";

export async function auditMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authenticatedRequest =
    req as AuthenticatedRequest;

  const originalEnd = res.end.bind(res);

  res.end = function (
    ...args: Parameters<Response["end"]>
  ) {
    void (async () => {
      try {
        await prisma.auditLog.create({
          data: {
            userId:
              authenticatedRequest.user?.id ?? null,
            action: `${req.method} ${req.originalUrl}`,
            entity: req.baseUrl || null,
            details: {
              statusCode: res.statusCode,
              method: req.method,
              path: req.originalUrl,
            },
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