import { NextFunction, Request, Response } from "express";

/**
 * Limiteurs de débit en mémoire (sans dépendance externe).
 *
 *  - loginRateLimit : POST /api/auth/login
 *      Compte uniquement les tentatives ÉCHOUÉES (réponse >= 400, hors étape 2FA 200),
 *      par IP + e-mail. Une connexion réussie remet le compteur à zéro.
 *  - resetRateLimit : register / forgot-password / verify-reset-code / reset-password
 *      Compte toutes les requêtes, par IP + chemin.
 *
 * Note : l'état est perdu au redémarrage et n'est pas partagé entre plusieurs instances.
 * Pour du multi-instance, passez à Redis (ex. rate-limit-redis).
 */

type Bucket = { count: number; resetAt: number };

function createLimiter(options: {
  windowMs: number;
  max: number;
  message: string;
  keyOf: (req: Request) => string;
  countOnlyFailures?: boolean;
}) {
  const { windowMs, max, message, keyOf, countOnlyFailures = false } = options;
  const buckets = new Map<string, Bucket>();

  // Nettoyage périodique pour éviter une fuite mémoire
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, 60_000);
  timer.unref();

  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === "OPTIONS") return next();

    const key = keyOf(req);
    const now = Date.now();

    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    if (bucket.count >= max) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({ success: false, message });
    }

    if (!countOnlyFailures) {
      bucket.count += 1;
      return next();
    }

    res.on("finish", () => {
      const current = buckets.get(key);
      if (!current) return;

      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Succès (ou étape 2FA demandée) : on ne pénalise pas
        if (res.statusCode === 200 && (res.locals?.loginSucceeded ?? true)) {
          buckets.delete(key);
        }
      } else if (res.statusCode >= 400) {
        current.count += 1;
      }
    });

    return next();
  };
}

const clientIp = (req: Request) => req.ip || req.socket?.remoteAddress || "unknown";

/** 10 échecs / 15 min par IP + e-mail */
export const loginRateLimit = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Trop de tentatives de connexion. Réessayez dans quelques minutes.",
  countOnlyFailures: true,
  keyOf: (req) =>
    `login:${clientIp(req)}:${String(req.body?.email ?? "").trim().toLowerCase()}`,
});

/** 20 requêtes / heure par IP + chemin */
export const resetRateLimit = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: "Trop de demandes. Réessayez dans une heure.",
  keyOf: (req) => `reset:${clientIp(req)}:${req.originalUrl.split("?")[0]}`,
});
