import { NextFunction, Request, Response } from "express";
import { logger } from "../config/logger";
import { getReqUser } from "../utils/dataScope";
import { db } from "../utils/db";
import { notifyUsers } from "../utils/notify";
import { sendError } from "../middlewares/error.middleware";
import { getAnomalies } from "./insights.controller";
import { emitToAnomalyWatchers } from "../realtime/socket";
import { isAnomalyRealtimeEnabled } from "../services/anomalyRealtime.service";

/* ===================================================================
 * Alertes d'anomalies : « Analyser et notifier » + suivi des analyses
 *
 *   POST /api/ai/anomalies/notify  { minSeverity, dryRun }
 *   GET  /api/ai/anomalies/alerts  -> historique + configuration
 *
 * Ce module ne modifie pas le calcul des anomalies : il réutilise le
 * gestionnaire existant `getAnomalies` (règles + Isolation Forest).
 * =================================================================== */

type Severity = "HIGH" | "MEDIUM" | "LOW";

interface AnomalyLike {
  key?: string;
  type: string;
  severity: Severity;
  title: string;
  detail: string;
  link: string;
  source?: string;
  score?: number;
}

const RANK: Record<Severity, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
const KIND: Record<Severity, "ERROR" | "WARNING" | "INFO"> = { HIGH: "ERROR", MEDIUM: "WARNING", LOW: "INFO" };

const COOLDOWN_HOURS = Number(process.env.ANOMALY_COOLDOWN_HOURS ?? 72);
const MAX_INDIVIDUAL = Number(process.env.ANOMALY_MAX_PER_USER ?? 3);
const MONITOR_MINUTES = Number(process.env.ANOMALY_MONITOR_MINUTES ?? 0);
const DEFAULT_MIN: Severity = (["HIGH", "MEDIUM", "LOW"] as const).includes(process.env.ANOMALY_MIN_SEVERITY as Severity)
  ? (process.env.ANOMALY_MIN_SEVERITY as Severity)
  : "MEDIUM";

const STAGIAIRES = ["STAGIAIRE_L3", "STAGIAIRE_M2"];

const isSeverity = (value: unknown): value is Severity => value === "HIGH" || value === "MEDIUM" || value === "LOW";

/* ----------------------- anomalies : réutilise getAnomalies ----------------------- */

async function currentAnomalies(req?: Request): Promise<{ anomalies: AnomalyLike[]; engineUsed: boolean }> {
  type Payload = { success?: boolean; data?: unknown; engine?: { used?: boolean }; message?: string };
  const box: { value: Payload | null; status: number } = { value: null, status: 200 };

  const fake = {
    status(code: number) { box.status = code; return fake; },
    set() { return fake; },
    setHeader() { return fake; },
    json(body: unknown) { box.value = body as Payload; return fake; },
    send(body: unknown) { box.value = body as Payload; return fake; },
  };

  // Même requête que celle de l'utilisateur (identité, en-têtes), avec « fresh » pour ignorer tout cache
  const request = { ...(req ?? {}), query: { fresh: "1" }, params: {}, body: {} } as unknown as Request;

  await getAnomalies(request, fake as unknown as Response);

  const result = box.value;

  if (!result || box.status >= 400 || result.success === false || !Array.isArray(result.data)) {
    throw new Error(result?.message ?? `Impossible de calculer les anomalies (réponse ${box.status})`);
  }

  const anomalies = (result.data as AnomalyLike[]).filter((a) => isSeverity(a.severity));

  return {
    anomalies,
    engineUsed: result.engine?.used ?? anomalies.some((a) => a.source === "isolation-forest"),
  };
}

/* ------------------------------ destinataires ------------------------------ */

async function usersByRole(role: string): Promise<number[]> {
  const rows = (await db.user.findMany({ where: { role, status: "ACTIVE" }, select: { id: true } })) as Array<{ id: number }>;
  return rows.map((r) => r.id);
}

async function departmentStaff(departmentId: number | null | undefined): Promise<number[]> {
  if (!departmentId) return [];

  const rows = (await db.user.findMany({
    where: { departmentId, status: "ACTIVE", role: { notIn: STAGIAIRES } },
    select: { id: true },
    take: 50,
  })) as Array<{ id: number }>;

  return rows.map((r) => r.id);
}

async function projectAudience(projectId: number | null | undefined): Promise<number[]> {
  if (!projectId) return [];

  const project = (await db.project.findUnique({
    where: { id: projectId },
    select: { createdById: true, departmentId: true },
  })) as { createdById: number; departmentId: number | null } | null;

  if (!project) return [];

  return [project.createdById, ...(await departmentStaff(project.departmentId))];
}

/** Qui prévenir selon le type d'élément concerné (projet, jalon, activité, évaluation, stage, inscription). */
async function audienceFor(anomaly: AnomalyLike, direction: number[], rh: number[]): Promise<number[]> {
  const match = /^\/([a-z-]+)\/(\d+)/.exec(anomaly.link ?? "");
  const id = match ? Number(match[2]) : null;
  let ids: number[] = [];

  try {
    switch (match?.[1]) {
      case "projects":
        ids = await projectAudience(id);
        break;
      case "milestones": {
        const row = (await db.milestone.findUnique({ where: { id }, select: { projectId: true } })) as { projectId: number } | null;
        ids = await projectAudience(row?.projectId);
        break;
      }
      case "activities": {
        const row = (await db.activity.findUnique({ where: { id }, select: { projectId: true } })) as { projectId: number } | null;
        ids = await projectAudience(row?.projectId);
        break;
      }
      case "evaluations": {
        const row = (await db.evaluation.findUnique({ where: { id }, select: { projectId: true } })) as { projectId: number | null } | null;
        ids = await projectAudience(row?.projectId);
        break;
      }
      case "internships": {
        const row = (await db.internship.findUnique({ where: { id }, select: { supervisorId: true, projectId: true } })) as
          | { supervisorId: number | null; projectId: number | null }
          | null;
        ids = [...(row?.supervisorId ? [row.supervisorId] : []), ...rh, ...(await projectAudience(row?.projectId))];
        break;
      }
      case "users":
        ids = rh;
        break;
      default:
        ids = [];
    }
  } catch (error) {
    logger.warn(`Destinataires introuvables pour ${anomaly.link} : ${error instanceof Error ? error.message : error}`);
  }

  // La Direction est toujours prévenue des anomalies critiques (et sert de repli si personne n'est identifié)
  if (anomaly.severity === "HIGH" || ids.length === 0) ids = [...ids, ...direction];

  return Array.from(new Set(ids));
}

/* ------------------------------ lancement d'une analyse ------------------------------ */

export interface NotifyResult {
  ranAt: string;
  dryRun: boolean;
  minSeverity: Severity;
  durationMs: number;
  analyzed: number;
  eligible: number;
  notificationsSent: number;
  digestsSent: number;
  usersNotified: number;
  duplicatesSkipped: number;
  bySeverity: Record<Severity, number>;
  preview: Array<{ title: string; severity: Severity; source: string; recipients: number }>;
}

let running = false;

export async function runAnomalyAlerts(options: {
  minSeverity: Severity;
  dryRun: boolean;
  source: "manual" | "auto";
  triggeredBy?: { id: number; name: string } | null;
  req?: Request;
}): Promise<NotifyResult> {
  if (running) throw new Error("Une analyse est déjà en cours, réessayez dans un instant.");
  running = true;

  const started = Date.now();

  try {
    const { anomalies, engineUsed } = await currentAnomalies(options.req);
    const eligible = anomalies.filter((a) => RANK[a.severity] >= RANK[options.minSeverity]);

    const [direction, rh] = await Promise.all([usersByRole("DIRECTION"), usersByRole("RH")]);
    const cutoff = new Date(Date.now() - COOLDOWN_HOURS * 3600 * 1000);

    const bySeverity: Record<Severity, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    const perUser = new Map<number, AnomalyLike[]>();
    const preview: NotifyResult["preview"] = [];
    const toRemember: Array<{ key: string; anomaly: AnomalyLike; recipients: number }> = [];
    let duplicates = 0;
    let withoutRecipient = 0;

    for (const anomaly of eligible) {
      const key = anomaly.key ?? `${anomaly.type}:${anomaly.link}`;

      // Une même anomalie n'est pas renotifiée avant la fin du délai
      const already = await db.auditLog.findFirst({
        where: { action: "ANOMALY_ALERT", createdAt: { gte: cutoff }, details: { path: ["key"], equals: key } },
        select: { id: true },
      });

      if (already) {
        duplicates += 1;
        continue;
      }

      const recipients = await audienceFor(anomaly, direction, rh);

      if (recipients.length === 0) {
        withoutRecipient += 1;
        continue;
      }

      bySeverity[anomaly.severity] += 1;
      preview.push({ title: anomaly.title, severity: anomaly.severity, source: anomaly.source ?? "rules", recipients: recipients.length });

      for (const userId of recipients) perUser.set(userId, [...(perUser.get(userId) ?? []), anomaly]);

      toRemember.push({ key, anomaly, recipients: recipients.length });
    }

    // Plusieurs anomalies pour la même personne : au-delà de MAX_INDIVIDUAL, un seul message récapitulatif
    let notifications = 0;
    let digests = 0;

    for (const [userId, list] of perUser) {
      if (list.length <= MAX_INDIVIDUAL) {
        notifications += list.length;
        if (!options.dryRun) {
          for (const a of list) await notifyUsers([userId], { title: a.title, message: a.detail, type: KIND[a.severity] });
        }
      } else {
        digests += 1;
        if (!options.dryRun) {
          const top = [...list].sort((a, b) => RANK[b.severity] - RANK[a.severity]).slice(0, 5);
          const critical = list.filter((a) => a.severity === "HIGH").length;

          await notifyUsers([userId], {
            title: `${list.length} anomalies à traiter${critical ? ` dont ${critical} critique(s)` : ""}`,
            message: `${top.map((a) => `• ${a.title}`).join("\n")}${list.length > top.length ? `\n… et ${list.length - top.length} autre(s)` : ""}\n\nOuvrez « Analyses IA > Détection d'anomalies » pour le détail.`,
            type: critical ? "ERROR" : "WARNING",
          });
        }
      }
    }

    // Mémorisation (anti-doublon) seulement après l'envoi : un échec d'envoi n'empêche pas une nouvelle tentative
    if (!options.dryRun) {
      for (const item of toRemember) {
        await db.auditLog.create({
          data: {
            userId: options.triggeredBy?.id ?? null,
            action: "ANOMALY_ALERT",
            entity: "anomaly",
            details: { key: item.key, severity: item.anomaly.severity, title: item.anomaly.title, recipients: item.recipients },
          },
        });
      }
    }

    if (withoutRecipient > 0) logger.warn(`${withoutRecipient} anomalie(s) sans destinataire (aucun utilisateur DIRECTION actif ?)`);

    const result: NotifyResult = {
      ranAt: new Date().toISOString(),
      dryRun: options.dryRun,
      minSeverity: options.minSeverity,
      durationMs: Date.now() - started,
      analyzed: anomalies.length,
      eligible: eligible.length,
      notificationsSent: notifications,
      digestsSent: digests,
      usersNotified: perUser.size,
      duplicatesSkipped: duplicates,
      bySeverity,
      preview: preview.slice(0, 50),
    };

    if (!options.dryRun) {
      await db.auditLog.create({
        data: {
          userId: options.triggeredBy?.id ?? null,
          action: "ANOMALY_RUN",
          entity: "anomaly",
          details: {
            source: options.source,
            minSeverity: options.minSeverity,
            triggeredByName: options.triggeredBy?.name ?? null,
            analyzed: result.analyzed,
            eligible: result.eligible,
            notificationsSent: notifications,
            digestsSent: digests,
            usersNotified: perUser.size,
            duplicatesSkipped: duplicates,
            engineUsed,
          },
        },
      });

      logger.info(`Alertes d'anomalies (${options.source}) : ${notifications + digests} notification(s) → ${perUser.size} personne(s)`);

      // Temps réel : la page « Détection d'anomalies » se rafraîchit toute seule
      emitToAnomalyWatchers("anomaly:run", {
        at: result.ranAt,
        source: options.source,
        analyzed: result.analyzed,
        notificationsSent: notifications,
        digestsSent: digests,
        usersNotified: perUser.size,
        bySeverity,
      });
    }

    return result;
  } finally {
    running = false;
  }
}

/* ----------------------------------- routes ----------------------------------- */

export async function postNotify(req: Request, res: Response): Promise<void> {
  try {
    const user = getReqUser(req);
    if (!user) {
      res.status(401).json({ success: false, message: "Authentification requise" });
      return;
    }

    const minSeverity = isSeverity(req.body?.minSeverity) ? req.body.minSeverity : DEFAULT_MIN;
    const me = (await db.user.findUnique({ where: { id: user.id }, select: { firstName: true, lastName: true } })) as
      | { firstName: string; lastName: string }
      | null;

    const data = await runAnomalyAlerts({
      minSeverity,
      dryRun: req.body?.dryRun === true,
      source: "manual",
      req,
      triggeredBy: { id: user.id, name: me ? `${me.firstName} ${me.lastName}`.trim() : "Administrateur" },
    });

    res.json({ success: true, data });
  } catch (error) {
    logger.error("Erreur alertes d'anomalies", error);

    res.status(500).json({
      success: false,
      message: error instanceof Error && error.message ? error.message : "Analyse impossible pour le moment.",
    });
  }
}

export async function getAlerts(_req: Request, res: Response): Promise<void> {
  try {
    const rows = (await db.auditLog.findMany({
      where: { action: "ANOMALY_RUN" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, createdAt: true, details: true },
    })) as Array<{ id: number; createdAt: Date; details: Record<string, unknown> | null }>;

    res.json({
      success: true,
      data: rows.map((row) => ({ id: row.id, at: row.createdAt, ...(row.details ?? {}) })),
      config: {
        auto: MONITOR_MINUTES > 0,
        realtime: isAnomalyRealtimeEnabled(),
        everyMinutes: MONITOR_MINUTES,
        minSeverity: DEFAULT_MIN,
        cooldownHours: COOLDOWN_HOURS,
        maxPerUser: MAX_INDIVIDUAL,
      },
    });
  } catch (error) {
    logger.error("Erreur historique des alertes", error);
    sendError(res, error, "Suivi indisponible pour le moment.");
  }
}

/** Analyse automatique périodique (ANOMALY_MONITOR_MINUTES=360 → toutes les 6 h). */
export function startAnomalyMonitor(): void {
  if (!(MONITOR_MINUTES > 0)) return;

  const run = () =>
    void runAnomalyAlerts({ minSeverity: DEFAULT_MIN, dryRun: false, source: "auto" }).catch((error) =>
      logger.error("Analyse automatique des anomalies en échec", error),
    );

  setInterval(run, MONITOR_MINUTES * 60_000).unref();
  setTimeout(run, 60_000).unref();

  logger.success(`Analyse automatique des anomalies : toutes les ${MONITOR_MINUTES} min`);
}
