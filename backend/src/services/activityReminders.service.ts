import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { notifyUsers } from "../utils/notify";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

/**
 * Rappels automatiques (une seule fois chacun) pour les stagiaires dont la participation est acceptée :
 *   - l'activité commence dans les prochaines 24 h ;
 *   - l'activité est terminée (depuis moins de 14 jours) et le rapport n'est pas rendu.
 * Variable facultative : ACTIVITY_REMINDER_MIN (minutes entre deux vérifications, 60 par défaut, 0 = désactivé).
 */

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

export async function runActivityReminders(): Promise<{ starts: number; reports: number }> {
  const now = new Date();
  let starts = 0;
  let reports = 0;

  const rows = await db.activityParticipation.findMany({
    where: { status: "ACCEPTED", OR: [{ remindedStartAt: null }, { remindedReportAt: null }] },
    select: { id: true, userId: true, activityId: true, report: true, remindedStartAt: true, remindedReportAt: true },
  });

  if (rows.length === 0) return { starts, reports };

  const activities = await db.activity.findMany({
    where: { id: { in: Array.from(new Set<number>(rows.map((r: { activityId: number }) => r.activityId))) } },
    select: { id: true, title: true, status: true, startDate: true, endDate: true },
  });
  const byId = new Map<number, { title: string; status: string; startDate: Date | null; endDate: Date | null }>(
    activities.map((a: { id: number; title: string; status: string; startDate: Date | null; endDate: Date | null }) => [a.id, a]),
  );

  for (const row of rows as Array<{ id: number; userId: number; activityId: number; report: string | null; remindedStartAt: Date | null; remindedReportAt: Date | null }>) {
    const activity = byId.get(row.activityId);
    if (!activity || activity.status === "CANCELLED") continue;

    const start = activity.startDate ? new Date(activity.startDate).getTime() : null;
    const end = activity.endDate ? new Date(activity.endDate).setHours(23, 59, 59, 999) : null;

    if (!row.remindedStartAt && start !== null && start > now.getTime() && start - now.getTime() <= DAY) {
      await db.activityParticipation.update({ where: { id: row.id }, data: { remindedStartAt: now } });
      await notifyUsers([row.userId], {
        title: "Activité demain",
        message: `« ${activity.title} » commence dans moins de 24 h. N'oubliez pas de pointer votre présence.`,
        type: "INFO",
      });
      starts += 1;
    }

    const hasReport = Boolean(row.report && row.report.trim());

    if (!row.remindedReportAt && !hasReport && end !== null && end < now.getTime() && now.getTime() - end <= 14 * DAY) {
      await db.activityParticipation.update({ where: { id: row.id }, data: { remindedReportAt: now } });
      await notifyUsers([row.userId], {
        title: "Rapport à rendre",
        message: `« ${activity.title} » est terminée : rendez votre rapport de participation.`,
        type: "WARNING",
      });
      reports += 1;
    }
  }

  return { starts, reports };
}

export function startActivityReminders(): void {
  const minutes = Number(process.env.ACTIVITY_REMINDER_MIN ?? 60);

  if (!Number.isFinite(minutes) || minutes <= 0) {
    logger.info("Rappels d'activités désactivés (ACTIVITY_REMINDER_MIN=0).");
    return;
  }

  const tick = () => {
    runActivityReminders()
      .then((result) => {
        if (result.starts + result.reports > 0) {
          logger.info(`Rappels d'activités : ${result.starts} début(s), ${result.reports} rapport(s).`);
        }
      })
      .catch((error) => logger.warn("Rappels d'activités indisponibles (tables créées ?)", error instanceof Error ? error.message : error));
  };

  setTimeout(tick, 90_000).unref?.();
  setInterval(tick, minutes * 60_000).unref?.();
  logger.info(`Rappels d'activités : toutes les ${minutes} minute(s).`);
}
