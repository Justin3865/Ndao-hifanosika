import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { emitToUser } from "../realtime/socket";
import { db } from "./db";
import { isEmailConfigured, sendEmail } from "./mailer";
import { isSmsConfigured, sendSms } from "./sms";
import { pushToUser } from "./webpush";

export type NotificationKind = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

/** Famille de rappel : l'utilisateur peut la désactiver dans Paramètres > Notifications. */
export type ReminderKind = "evaluations" | "projects" | "reports";

interface Payload {
  title: string;
  message: string;
  type?: NotificationKind;
  /** "app" = notification dans l'application + système seulement (pas d'e-mail / SMS). */
  channels?: "all" | "app";
  /** Rappel automatique : ignoré pour les personnes qui ont désactivé ce type de rappel. */
  reminder?: ReminderKind;
}

const REMINDER_FIELD: Record<ReminderKind, string> = {
  evaluations: "evaluationReminders",
  projects: "projectReminders",
  reports: "reportReminders",
};

/** Retire les destinataires qui ont désactivé ce type de rappel. */
async function withoutOptedOut(ids: number[], reminder?: ReminderKind): Promise<number[]> {
  if (!reminder || ids.length === 0) return ids;

  try {
    const off = (await db.userPreference.findMany({
      where: { userId: { in: ids }, [REMINDER_FIELD[reminder]]: false },
      select: { userId: true },
    })) as Array<{ userId: number }>;

    const blocked = new Set(off.map((row) => row.userId));
    return ids.filter((id) => !blocked.has(id));
  } catch (error) {
    logger.warn("Préférences de rappel illisibles : rappel envoyé par défaut", error instanceof Error ? error.message : error);
    return ids;
  }
}

// SMS : par défaut seulement les messages importants (coût). SMS_NOTIFY_LEVEL=all pour tout envoyer.
const SMS_ALL = process.env.SMS_NOTIFY_LEVEL === "all";

/** E-mail et/ou SMS selon les préférences du destinataire. */
async function deliverExternal(userId: number, payload: Payload): Promise<void> {
  if (!isEmailConfigured() && !isSmsConfigured()) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, phone: true, notifyEmail: true, notifySms: true, firstName: true },
  });

  if (!user) return;

  const type = payload.type ?? "INFO";

  if (user.notifyEmail && user.email) {
    await sendEmail(
      user.email,
      `${payload.title} — Ndao Hifanosika`,
      `Bonjour ${user.firstName},\n\n${payload.message}\n\nConnectez-vous à la plateforme pour plus de détails.\n— Ndao Hifanosika`,
    );
  }

  const important = type !== "INFO";

  if (user.notifySms && user.phone && (SMS_ALL || important)) {
    await sendSms(user.phone, `Ndao Hifanosika : ${payload.title}. ${payload.message}`);
  }
}

/** Crée la notification en base, la pousse en temps réel puis l'envoie par e-mail/SMS. */
export async function notifyUsers(
  userIds: Array<number | null | undefined>,
  payload: Payload,
  excludeUserId?: number,
): Promise<void> {
  const ids = await withoutOptedOut(
    Array.from(
      new Set(
        userIds.filter(
          (id): id is number => typeof id === "number" && id !== excludeUserId,
        ),
      ),
    ),
    payload.reminder,
  );

  for (const userId of ids) {
    try {
      const row = await prisma.notification.create({
        data: {
          userId,
          title: payload.title,
          message: payload.message,
          type: (payload.type ?? "INFO") as never,
        },
      });

      emitToUser(userId, "notification:new", row);

      // Notification système (PC / téléphone), sans bloquer la requête
      void pushToUser(userId, {
        title: payload.title,
        body: payload.message,
        url: "/notifications?source=system",
        tag: `ndao-msg-${row.id}`,
      });

      // L'envoi externe ne bloque jamais la requête
      if (payload.channels !== "app") {
        deliverExternal(userId, payload).catch((error) =>
          logger.error("Erreur envoi externe notification", error),
        );
      }
    } catch (error) {
      logger.error("Erreur création notification", error);
    }
  }
}

/** Notifie tous les comptes ACTIFS ayant l'un de ces rôles. */
export async function notifyRoles(
  roles: string[],
  payload: Payload,
  excludeUserId?: number,
): Promise<void> {
  const users = await prisma.user.findMany({
    where: { role: { in: roles }, status: "ACTIVE" } as never,
    select: { id: true },
  });

  await notifyUsers(
    users.map((user) => user.id),
    payload,
    excludeUserId,
  );
}
