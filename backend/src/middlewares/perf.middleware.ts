import { NextFunction, Request, Response } from "express";

import { logger } from "../config/logger";
import { normalizeRoute, recordSample } from "../utils/perfStats";

/** Objectif du cahier des charges : API principales < 500 ms hors traitements IA. */
const SLOW_MS = Number(process.env.PERF_SLOW_MS || 500);

/**
 * Mesure le temps de réponse de chaque requête : en-tête `X-Response-Time`,
 * avertissement si > PERF_SLOW_MS (hors /api/ai), statistiques consultables par l'administrateur.
 */
export function perfMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();
  const elapsed = () => Number(process.hrtime.bigint() - start) / 1e6;

  const writeHead = res.writeHead.bind(res) as (...args: unknown[]) => Response;
  (res as unknown as { writeHead: (...args: unknown[]) => Response }).writeHead = (...args: unknown[]) => {
    if (!res.headersSent) res.setHeader("X-Response-Time", `${elapsed().toFixed(1)}ms`);
    return writeHead(...args);
  };

  res.once("finish", () => {
    const ms = elapsed();
    const isAi = req.originalUrl.startsWith("/api/ai");
    const key = normalizeRoute(req.method, req.originalUrl);
    recordSample(key, ms, res.statusCode, SLOW_MS);
    if (!isAi && ms > SLOW_MS && req.originalUrl !== "/health") {
      logger.warn(`Requête lente (${ms.toFixed(0)} ms > ${SLOW_MS} ms) : ${key}`);
    }
  });

  next();
}
