import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { emitToUser } from "../realtime/socket";

export type NotificationKind = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

interface Payload {
  title: string;
  message: string;
  type?: NotificationKind;
}

/** Crée une notification en base pour chaque utilisateur et la pousse en temps réel. */
export async function notifyUsers(
  userIds: Array<number | null | undefined>,
  payload: Payload,
  excludeUserId?: number,
): Promise<void> {
  const ids = Array.from(
    new Set(
      userIds.filter(
        (id): id is number => typeof id === "number" && id !== excludeUserId,
      ),
    ),
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
