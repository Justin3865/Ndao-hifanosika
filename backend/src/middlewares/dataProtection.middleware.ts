// src/middlewares/dataProtection.middleware.ts
// Fiarovana angona ankizy sy vehivavy marefo : masque les données individuelles des mineurs et des femmes
// vulnérables selon le rôle (voir utils/dataProtectionRules.ts) et journalise chaque lecture en clair.
//
//  - DATA_PROTECTION_MODE=enforce (défaut) : masque + journalise
//  - DATA_PROTECTION_MODE=audit            : ne masque rien, journalise seulement (phase de test)
//  - DATA_PROTECTION_MODE=off              : désactivé
// Les réponses d'origine ne sont jamais modifiées en mémoire : le masquage travaille sur une copie.

import { NextFunction, Response } from "express";

import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { AuthenticatedRequest } from "./auth.middleware";
import { accessLevel, containsMask, isDatasetCsvPath, protectPayload, protectionMode, pseudonymiseDatasetCsv } from "../utils/dataProtectionRules";

const WRITE = new Set(["POST", "PUT", "PATCH"]);

// Anti-inondation du journal : une même lecture (utilisateur + route) n'est journalisée qu'une fois par minute.
const recent = new Map<string, number>();
const THROTTLE_MS = 60_000;

function audit(req: AuthenticatedRequest, count: number, kinds: string[], level: string, masked: number): void {
  const key = `${req.user?.id}|${req.method}|${req.originalUrl.split("?")[0]}`;
  const now = Date.now();
  if (now - (recent.get(key) ?? 0) < THROTTLE_MS) return;
  recent.set(key, now);
  if (recent.size > 5000) for (const [k, t] of recent) if (now - t > THROTTLE_MS) recent.delete(k);
  void prisma.auditLog
    .create({
      data: {
        userId: req.user?.id ?? null,
        action: `PROTECTED_DATA_READ ${req.method} ${req.originalUrl.split("?")[0]}`,
        entity: "protected-data",
        // Jamais de donnée personnelle dans le journal : seulement des comptages.
        details: { protectedPersons: count, maskedObjects: masked, kinds, accessLevel: level, mode: protectionMode() },
        ipAddress: req.ip || req.socket.remoteAddress || null,
        userAgent: req.headers["user-agent"] || null,
      },
    })
    .catch((error: unknown) => logger.warn("Journal d'accès protégé indisponible", error));
}

export function dataProtection(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const mode = protectionMode();
  if (mode === "off" || !req.user) return next();

  // Écriture : une valeur masquée (•••) renvoyée par un formulaire ne doit jamais écraser la vraie donnée.
  if (WRITE.has(req.method) && containsMask(req.body)) {
    return void res.status(422).json({
      success: false,
      code: "MASKED_VALUE_REJECTED",
      message: "Certaines valeurs sont masquées (•••) : rechargez la fiche avec un rôle autorisé avant de l'enregistrer.",
    });
  }

  const level = accessLevel(req.user.role);

  // Export CSV des jeux de données : colonne « name » en initiales hors accès complet.
  if (mode === "enforce" && level !== "FULL" && isDatasetCsvPath(req.originalUrl)) {
    const send = res.send.bind(res);
    res.send = ((body: unknown) => send(typeof body === "string" ? pseudonymiseDatasetCsv(body, level) : body)) as Response["send"];
  }

  const original = res.json.bind(res);
  res.json = ((body: unknown) => {
    try {
      const result = protectPayload(body, mode === "audit" ? "FULL" : level);
      if (result.protectedCount > 0) {
        audit(req, result.protectedCount, result.kinds, mode === "audit" ? "AUDIT-ONLY" : level, result.maskedCount);
      }
      return original(mode === "audit" ? body : result.body);
    } catch (error) {
      // Échec du masquage : on NE renvoie PAS les données en clair à un rôle non autorisé.
      logger.error("Échec de la protection des données", error);
      if (level === "FULL") return original(body);
      res.status(500);
      return original({ success: false, message: "Réponse bloquée : protection des données indisponible." });
    }
  }) as Response["json"];
  next();
}
