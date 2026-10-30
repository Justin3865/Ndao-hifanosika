import { Request, Response } from "express";
import { logger } from "../config/logger";
import { getReqUser } from "../utils/dataScope";
import { db } from "../utils/db";
import { sendError } from "../middlewares/error.middleware";
import { emitToAnomalyWatchers } from "../realtime/socket";

/* ===================================================================
 * Actions sur les anomalies (statut partagé par l'équipe)
 *
 *   GET    /api/ai/anomalies/actions          -> liste des actions actives
 *   PUT    /api/ai/anomalies/actions          -> { key, type, title, status, note?, snoozeDays? }
 *   DELETE /api/ai/anomalies/actions?key=...  -> rouvrir l'anomalie
 *
 * Les anomalies sont recalculées à chaque analyse : on mémorise donc
 * l'action par clé stable (ex. « OVERDUE_MILESTONE:32 »).
 * =================================================================== */

export type AnomalyActionStatus = "IN_PROGRESS" | "RESOLVED" | "IGNORED";

const STATUSES: AnomalyActionStatus[] = ["IN_PROGRESS", "RESOLVED", "IGNORED"];

export interface AnomalyActionRow {
  key: string;
  type: string;
  title: string;
  status: AnomalyActionStatus;
  note: string | null;
  snoozedUntil: string | null;
  userName: string | null;
  updatedAt: string;
}

/** Une action « ignorée jusqu'au… » expirée ne compte plus : l'anomalie redevient active. */
function isActive(row: { status: string; snoozedUntil: Date | null }): boolean {
  if (row.status === "IGNORED" && row.snoozedUntil && row.snoozedUntil.getTime() < Date.now()) return false;
  return true;
}

/** Clés des anomalies à ne PAS notifier (résolues ou ignorées). Utilisé par les alertes. */
export async function silencedKeys(): Promise<Set<string>> {
  try {
    const rows = (await db.anomalyAction.findMany({
      where: { status: { in: ["RESOLVED", "IGNORED"] } },
      select: { key: true, status: true, snoozedUntil: true },
    })) as Array<{ key: string; status: string; snoozedUntil: Date | null }>;

    return new Set(rows.filter(isActive).map((row) => row.key));
  } catch (error) {
    // Table absente (migration non appliquée) : on ne bloque jamais les alertes
    logger.warn("Actions d'anomalies indisponibles", error);
    return new Set();
  }
}

export async function listActions(_req: Request, res: Response) {
  try {
    const rows = (await db.anomalyAction.findMany({ orderBy: { updatedAt: "desc" } })) as Array<
      Omit<AnomalyActionRow, "snoozedUntil" | "updatedAt"> & { snoozedUntil: Date | null; updatedAt: Date }
    >;

    const data: AnomalyActionRow[] = rows
      .filter(isActive)
      .map((row) => ({
        ...row,
        snoozedUntil: row.snoozedUntil ? row.snoozedUntil.toISOString() : null,
        updatedAt: row.updatedAt.toISOString(),
      }));

    res.json({ success: true, data });
  } catch (error) {
    logger.error("Erreur lecture des actions d'anomalies", error);
    sendError(res, error, "Impossible de lire les actions sur les anomalies");
  }
}

export async function saveAction(req: Request, res: Response) {
  try {
    const { key, type, title, status, note, snoozeDays } = (req.body ?? {}) as {
      key?: string;
      type?: string;
      title?: string;
      status?: string;
      note?: string;
      snoozeDays?: number;
    };

    if (!key || typeof key !== "string" || key.length > 200) {
      res.status(400).json({ success: false, message: "Clé d'anomalie invalide." });
      return;
    }

    if (!status || !STATUSES.includes(status as AnomalyActionStatus)) {
      res.status(400).json({ success: false, message: "Statut invalide." });
      return;
    }

    const user = getReqUser(req) as ({ id?: number; firstName?: string; lastName?: string } | undefined);
    const userName = user ? [user.firstName, user.lastName].filter(Boolean).join(" ") || null : null;

    const days = Number(snoozeDays);
    const snoozedUntil =
      status === "IGNORED" && Number.isFinite(days) && days > 0
        ? new Date(Date.now() + Math.min(days, 365) * 24 * 3600 * 1000)
        : null;

    const data = {
      type: String(type ?? key.split(":")[0]).slice(0, 100),
      title: String(title ?? key).slice(0, 300),
      status,
      note: note ? String(note).slice(0, 1000) : null,
      snoozedUntil,
      userId: user?.id ?? null,
      userName,
    };

    const row = await db.anomalyAction.upsert({ where: { key }, create: { key, ...data }, update: data });

    emitToAnomalyWatchers("anomaly:action", { key, status });
    res.json({ success: true, data: row });
  } catch (error) {
    logger.error("Erreur enregistrement d'une action d'anomalie", error);
    sendError(res, error, "Impossible d'enregistrer l'action");
  }
}

export async function removeAction(req: Request, res: Response) {
  try {
    const key = String(req.query.key ?? "");

    if (!key) {
      res.status(400).json({ success: false, message: "Clé d'anomalie requise." });
      return;
    }

    await db.anomalyAction.deleteMany({ where: { key } });

    emitToAnomalyWatchers("anomaly:action", { key, status: null });
    res.json({ success: true });
  } catch (error) {
    logger.error("Erreur réouverture d'une anomalie", error);
    sendError(res, error, "Impossible de rouvrir l'anomalie");
  }
}
