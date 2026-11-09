import { NextFunction, Request, Response } from "express";
import { rateLimit } from "express-rate-limit";

import { isRateLimitExempt, readRateLimitConfig } from "../utils/securityConfig";

/**
 * Limitation globale par IP (cahier §6 : protection contre l'abus). S'ajoute au limiteur de connexion
 * existant (loginRateLimit), sans le remplacer. Réglable : RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS,
 * RATE_LIMIT_DISABLED=1.
 */
const config = readRateLimitConfig(process.env);

const limiter = rateLimit({
  windowMs: config.windowMs,
  limit: config.max,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: (req) => isRateLimitExempt(req.method, req.path),
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: "Trop de requêtes. Patientez quelques instants puis réessayez.",
    });
  },
});

export function globalRateLimit(req: Request, res: Response, next: NextFunction): void {
  if (!config.enabled) {
    next();
    return;
  }
  limiter(req, res, next);
}
