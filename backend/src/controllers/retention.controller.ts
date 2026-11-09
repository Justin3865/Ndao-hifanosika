import { Response } from "express";
import { z } from "zod";

import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { sendError } from "../middlewares/error.middleware";
import { db } from "../utils/db";
import { retentionCutoffs, retentionPolicy } from "../utils/gapRules";

/**
 * Politique de conservation/purge (cahier §10). Ne touche JAMAIS aux données métier
 * (bénéficiaires, projets, évaluations, stages) : uniquement des journaux techniques
 * dont la conservation illimitée n'a pas de justification.
 */
export function targets() {
  const policy = retentionPolicy();
  const c = retentionCutoffs(policy);
  return {
    policy,
    items: [
      {
        key: "auditLogs",
        label: `Journal d'audit de plus de ${policy.auditMonths} mois`,
        model: db.auditLog,
        where: { createdAt: { lt: c.audit } },
      },
      {
        key: "notifications",
        label: `Notifications lues ou archivées de plus de ${policy.notificationMonths} mois`,
        model: db.notification,
        where: { createdAt: { lt: c.notification }, OR: [{ read: true }, { archived: true }] },
      },
      {
        key: "reminderLogs",
        label: `Journal de rappels de plus de ${policy.reminderLogMonths} mois`,
        model: db.reminderLog,
        where: { sentAt: { lt: c.reminderLog } },
      },
      {
        key: "revokedRefreshTokens",
        label: "Jetons de rafraîchissement révoqués et expirés",
        model: db.revokedRefreshToken,
        where: { expiresAt: { lt: c.tokens } },
      },
      {
        key: "passwordResetTokens",
        label: "Jetons de réinitialisation de mot de passe expirés ou utilisés",
        model: db.passwordResetToken,
        where: { OR: [{ expiresAt: { lt: c.tokens } }, { usedAt: { lt: c.tokens } }] },
      },
    ],
  };
}

/** GET /api/admin/retention — simulation : combien de lignes seraient supprimées (rien n'est supprimé) */
export async function previewRetention(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { policy, items } = targets();
    const rows = await Promise.all(
      items.map(async (i) => ({ key: i.key, label: i.label, count: Number(await i.model.count({ where: i.where })) })),
    );
    res.json({ success: true, data: { policy, rows, total: rows.reduce((s, r) => s + r.count, 0) } });
  } catch (error) {
    sendError(res, error, "Erreur lors de la simulation de la purge");
  }
}

const runSchema = z.object({ confirm: z.literal(true) });

/** POST /api/admin/retention — exécute la purge (confirmation explicite exigée, action journalisée) */
export async function runRetention(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    runSchema.parse(req.body);
    const { policy, items } = targets();
    const deleted: Record<string, number> = {};
    for (const i of items) {
      const r = await i.model.deleteMany({ where: i.where });
      deleted[i.key] = Number(r.count);
    }
    await db.auditLog.create({
      data: { userId: req.user!.id, action: "RETENTION_PURGE", entity: "retention", details: { policy, deleted } },
    });
    res.json({ success: true, message: "Purge effectuée.", data: { policy, deleted } });
  } catch (error) {
    sendError(res, error, "Erreur lors de la purge");
  }
}
