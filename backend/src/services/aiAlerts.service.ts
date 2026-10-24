import { logger } from "../config/logger";
import { scoreHouseholds } from "../ml/vulnerability";
import { db } from "../utils/db";
import { NotificationKind, notifyUsers } from "../utils/notify";
import { ANOMALY_LABELS } from "./anomalyCatalog";
import { AnomalyRow, Data, loadData, runAnalysis } from "./insights.service";

/**
 * Alertes IA automatiques.
 *
 * À intervalle régulier (et à la demande), le moteur d'analyse (service Python, ou repli local)
 * détecte les anomalies / risques, puis NOTIFIE les bonnes personnes :
 *   - les personnes directement concernées (responsable du projet, auteur, tuteur, stagiaire…) ;
 *   - les membres (hors stagiaires) du DÉPARTEMENT auquel le projet appartient ;
 *   - à défaut, les administrateurs / la direction.
 * Chaque anomalie n'est notifiée qu'une fois (table AiAlert) : nouvelle, réapparue, aggravée,
 * ou rappel des anomalies critiques toutes les AI_ALERT_REMIND_DAYS jours.
 */

type Severity = AnomalyRow["severity"];
type Reason = "new" | "reopened" | "escalated" | "reminder";

const DAY = 24 * 3600 * 1000;
const RANK: Record<Severity, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };
const KIND: Record<Severity, NotificationKind> = { HIGH: "ERROR", MEDIUM: "WARNING", LOW: "INFO" };
const SEVERITY_LABEL: Record<Severity, string> = { HIGH: "Critique", MEDIUM: "Moyenne", LOW: "Faible" };

// Au-delà de ce nombre d'alertes pour une même personne, on envoie un seul message récapitulatif.
const MAX_INDIVIDUAL = 3;
const REMIND_MS = (Number(process.env.AI_ALERT_REMIND_DAYS) || 3) * DAY;
const VULNERABLE_THRESHOLD = 75;

interface Candidate extends AnomalyRow {
  departmentId: number | null;
  departmentName: string | null;
}

interface UserLite {
  id: number;
  role: string;
  departmentId: number | null;
}

interface Directory {
  byId: Map<number, UserLite>;
  byDepartment: Map<number, number[]>;
  admins: number[];
  hr: number[];
  managers: number[];
}

export interface AlertRunResult {
  skipped?: boolean;
  engine: "python-db" | "python" | "typescript";
  detected: number;
  created: number;
  reopened: number;
  escalated: number;
  reminders: number;
  resolved: number;
  notificationsSent: number;
  usersNotified: number;
  digestSent: boolean;
  durationMs: number;
}

let running = false;

async function loadDirectory(): Promise<Directory> {
  const users = (await db.user.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, role: true, departmentId: true },
  })) as UserLite[];

  const byDepartment = new Map<number, number[]>();

  for (const user of users) {
    // Un département = son personnel ; les stagiaires ne reçoivent que ce qui les concerne directement
    if (user.departmentId !== null && !user.role.startsWith("STAGIAIRE")) {
      byDepartment.set(user.departmentId, [...(byDepartment.get(user.departmentId) ?? []), user.id]);
    }
  }

  const ids = (roles: string[]) => users.filter((user) => roles.includes(user.role)).map((user) => user.id);

  return {
    byId: new Map(users.map((user) => [user.id, user])),
    byDepartment,
    admins: ids(["ADMIN", "DIRECTION"]),
    hr: ids(["ADMIN", "RH"]),
    managers: ids(["ADMIN", "DIRECTION", "DSI", "COORDINATOR"]),
  };
}

function recipientsFor(candidate: Candidate, directory: Directory): number[] {
  const recipients = new Set<number>();

  for (const id of candidate.ownerIds) if (directory.byId.has(id)) recipients.add(id);

  if (candidate.departmentId !== null) {
    for (const id of directory.byDepartment.get(candidate.departmentId) ?? []) recipients.add(id);
  }

  if (candidate.type === "PENDING_USER") directory.hr.forEach((id) => recipients.add(id));

  // Personne de concerné identifiable : la direction est prévenue
  if (recipients.size === 0) directory.admins.forEach((id) => recipients.add(id));

  return Array.from(recipients);
}

/** Ménages que le modèle de vulnérabilité note très haut sans qu'ils soient classés vulnérables. */
async function householdCandidates(data: Data): Promise<AnomalyRow[] | null> {
  try {
    const households = await scoreHouseholds();
    const creator = new Map<number, number>(
      data.projects.map((project): [number, number] => [project.id, project.createdById]),
    );

    return households
      .filter((household) => !household.vulnerable && household.score >= VULNERABLE_THRESHOLD)
      .map((household) => ({
        key: `HOUSEHOLD_VULNERABLE:${household.id}`,
        type: "HOUSEHOLD_VULNERABLE",
        severity: "HIGH" as const,
        title: `Ménage vulnérable : ${household.name}`,
        detail: `${household.projectName}${household.locality ? ` — ${household.locality}` : ""} — score de vulnérabilité ${household.score}/100 alors que le ménage n'est pas classé vulnérable.`,
        link: "/ai/vulnerability",
        entityKind: "beneficiary",
        entityId: household.id,
        projectId: household.projectId,
        ownerIds: [creator.get(household.projectId)].filter((id): id is number => typeof id === "number"),
      }));
  } catch (error) {
    logger.warn("Alertes IA : scoring de vulnérabilité indisponible", error instanceof Error ? error.message : error);
    return null;
  }
}

function buildMessage(candidate: Candidate, reason: Reason): string {
  const suffix = reason === "reminder" ? " (rappel)" : reason === "escalated" ? " (aggravation)" : "";
  const department = candidate.departmentName ? ` Département : ${candidate.departmentName}.` : "";

  return `${candidate.detail}${department}${suffix}`;
}

async function sendNotifications(
  pending: Map<number, Array<{ candidate: Candidate; reason: Reason }>>,
): Promise<number> {
  let sent = 0;

  for (const [userId, items] of pending) {
    items.sort((a, b) => RANK[b.candidate.severity] - RANK[a.candidate.severity]);
    const top = items[0].candidate.severity;

    if (items.length <= MAX_INDIVIDUAL) {
      for (const { candidate, reason } of items) {
        await notifyUsers([userId], {
          title: `[${SEVERITY_LABEL[candidate.severity]}] ${candidate.title}`,
          message: buildMessage(candidate, reason),
          type: KIND[candidate.severity],
          // E-mail / SMS seulement pour le critique ; le reste reste dans l'application
          channels: candidate.severity === "HIGH" ? "all" : "app",
        });
        sent += 1;
      }
      continue;
    }

    const lines = items.slice(0, 5).map(({ candidate }) => `• ${candidate.title}`);
    const more = items.length > 5 ? `\n…et ${items.length - 5} autre(s).` : "";

    await notifyUsers([userId], {
      title: `${items.length} alertes IA vous concernent`,
      message: `${lines.join("\n")}${more}\nConsultez Analyses IA › Détection d'anomalies.`,
      type: KIND[top],
      channels: top === "HIGH" ? "all" : "app",
    });
    sent += 1;
  }

  return sent;
}

/** Synthèse quotidienne pour la direction (une seule fois par jour). */
async function sendDailyDigest(
  summary: { headline: string; recommendations: string[]; counters: { criticalAnomalies: number } },
  directory: Directory,
): Promise<boolean> {
  if (process.env.AI_DAILY_DIGEST === "off") return false;

  const key = `DIGEST:${new Date().toISOString().slice(0, 10)}`;
  if (await db.aiAlert.findUnique({ where: { key } })) return false;

  const now = new Date();

  await db.aiAlert.create({
    data: {
      key,
      type: "DIGEST",
      severity: "LOW",
      title: "Synthèse IA du jour",
      recipientCount: directory.managers.length,
      lastNotifiedAt: now,
      notifyCount: 1,
      resolvedAt: now,
    },
  });

  await notifyUsers(directory.managers, {
    title: "Synthèse IA du jour",
    message: `${summary.headline}\n${summary.recommendations.slice(0, 3).map((line) => `• ${line}`).join("\n")}`,
    type: summary.counters.criticalAnomalies > 0 ? "WARNING" : "INFO",
    channels: "app",
  });

  return true;
}

export async function runAiAlerts(): Promise<AlertRunResult> {
  const started = Date.now();

  if (running) {
    return {
      skipped: true, engine: "typescript", detected: 0, created: 0, reopened: 0, escalated: 0,
      reminders: 0, resolved: 0, notificationsSent: 0, usersNotified: 0, digestSent: false, durationMs: 0,
    };
  }

  running = true;

  try {
    const data = await loadData();
    const analysis = await runAnalysis(data);
    const households = await householdCandidates(data);
    const directory = await loadDirectory();

    const departmentOf = new Map<number, number | null>(
      data.projects.map((project): [number, number | null] => [project.id, project.departmentId ?? null]),
    );
    const departmentName = new Map<number, string>(
      data.departments.map((department): [number, string] => [department.id, department.name]),
    );

    const seen = new Set<string>();
    const candidates: Candidate[] = [];

    for (const row of [...analysis.anomalies, ...(households ?? [])]) {
      if (seen.has(row.key)) continue;
      seen.add(row.key);

      const departmentId = row.projectId !== null ? (departmentOf.get(row.projectId) ?? null) : null;

      candidates.push({
        ...row,
        departmentId,
        departmentName: departmentId !== null ? (departmentName.get(departmentId) ?? null) : null,
      });
    }

    const existingRows = (await db.aiAlert.findMany({ where: { type: { not: "DIGEST" } } })) as Array<{
      id: number; key: string; type: string; severity: Severity; resolvedAt: Date | null; lastNotifiedAt: Date | null;
    }>;
    const existing = new Map(existingRows.map((row) => [row.key, row]));

    const now = new Date();
    const pending = new Map<number, Array<{ candidate: Candidate; reason: Reason }>>();
    const counters = { created: 0, reopened: 0, escalated: 0, reminders: 0 };

    for (const candidate of candidates) {
      const previous = existing.get(candidate.key);
      let reason: Reason | null = null;

      if (!previous) reason = "new";
      else if (previous.resolvedAt) reason = "reopened";
      else if (RANK[candidate.severity] > RANK[previous.severity]) reason = "escalated";
      else if (
        candidate.severity === "HIGH" &&
        (!previous.lastNotifiedAt || now.getTime() - previous.lastNotifiedAt.getTime() > REMIND_MS)
      ) {
        reason = "reminder";
      }

      const recipients = reason ? recipientsFor(candidate, directory) : [];

      if (reason) {
        if (reason === "new") counters.created += 1;
        else if (reason === "reopened") counters.reopened += 1;
        else if (reason === "escalated") counters.escalated += 1;
        else counters.reminders += 1;

        for (const userId of recipients) {
          pending.set(userId, [...(pending.get(userId) ?? []), { candidate, reason }]);
        }
      }

      const base = {
        severity: candidate.severity,
        title: candidate.title.slice(0, 250),
        projectId: candidate.projectId,
        departmentId: candidate.departmentId,
        lastSeenAt: now,
        resolvedAt: null,
      };

      // Enregistré AVANT l'envoi : en cas de panne, on préfère rater un message que le répéter
      await db.aiAlert.upsert({
        where: { key: candidate.key },
        create: {
          ...base,
          key: candidate.key,
          type: candidate.type,
          entityKind: candidate.entityKind,
          entityId: typeof candidate.entityId === "number" ? candidate.entityId : null,
          recipientCount: recipients.length,
          lastNotifiedAt: reason ? now : null,
          notifyCount: reason ? 1 : 0,
        },
        update: {
          ...base,
          ...(reason ? { recipientCount: recipients.length, lastNotifiedAt: now, notifyCount: { increment: 1 } } : {}),
        },
      });
    }

    // Anomalies disparues = résolues (seulement si le moteur qui les a produites a bien répondu)
    const reliable = analysis.engine !== "typescript" || !process.env.AI_SERVICE_URL?.trim();
    const stale = existingRows.filter(
      (row) =>
        !row.resolvedAt &&
        !seen.has(row.key) &&
        reliable &&
        (row.type !== "HOUSEHOLD_VULNERABLE" || households !== null),
    );

    if (stale.length > 0) {
      await db.aiAlert.updateMany({ where: { id: { in: stale.map((row) => row.id) } }, data: { resolvedAt: now } });
    }

    await db.aiAlert.deleteMany({ where: { resolvedAt: { lt: new Date(now.getTime() - 90 * DAY) } } });

    const notificationsSent = await sendNotifications(pending);
    const digestSent = await sendDailyDigest(analysis.summary, directory);

    return {
      engine: analysis.engine,
      detected: candidates.length,
      ...counters,
      resolved: stale.length,
      notificationsSent,
      usersNotified: pending.size,
      digestSent,
      durationMs: Date.now() - started,
    };
  } finally {
    running = false;
  }
}

/** Lance l'analyse automatique toutes les AI_ALERTS_INTERVAL_MIN minutes (60 par défaut, 0 = désactivé). */
export function startAiAlertScheduler(): void {
  const minutes = Number(process.env.AI_ALERTS_INTERVAL_MIN ?? 60);

  if (!Number.isFinite(minutes) || minutes <= 0) {
    logger.info("Alertes IA automatiques désactivées (AI_ALERTS_INTERVAL_MIN=0).");
    return;
  }

  const tick = () => {
    runAiAlerts()
      .then((result) => {
        if (!result.skipped) {
          logger.info(
            `Alertes IA (${result.engine}) : ${result.detected} détectée(s), ${result.created} nouvelle(s), ` +
              `${result.escalated} aggravée(s), ${result.resolved} résolue(s), ${result.notificationsSent} notification(s).`,
          );
        }
      })
      .catch((error) => logger.error("Erreur alertes IA automatiques", error));
  };

  // Premier passage 1 minute après le démarrage, puis à intervalle régulier
  setTimeout(tick, 60_000).unref?.();
  setInterval(tick, minutes * 60_000).unref?.();

  logger.info(`Alertes IA automatiques : toutes les ${minutes} minute(s).`);
}

export { ANOMALY_LABELS };
