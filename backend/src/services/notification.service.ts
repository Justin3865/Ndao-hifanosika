export type NotificationType =
  | "INFO"
  | "SUCCESS"
  | "WARNING"
  | "ERROR";

export type NotificationItem = {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
};

const notifications: NotificationItem[] = [];

let nextNotificationId = 1;

export async function findNotifications(userId?: number) {
  if (userId === undefined) {
    return notifications;
  }

  return notifications.filter(
    (notification) => notification.userId === userId,
  );
}

export async function findNotificationById(id: number) {
  return (
    notifications.find(
      (notification) => notification.id === id,
    ) ?? null
  );
}

export async function createNotification(data: {
  userId: number;
  title: string;
  message: string;
  type?: NotificationType;
}) {
  const notification: NotificationItem = {
    id: nextNotificationId++,
    userId: data.userId,
    title: data.title,
    message: data.message,
    type: data.type ?? "INFO",
    read: false,
    createdAt: new Date().toISOString(),
  };

  notifications.unshift(notification);

  return notification;
}

export async function markNotificationAsRead(id: number) {
  const notification = notifications.find(
    (item) => item.id === id,
  );

  if (!notification) {
    return null;
  }

  notification.read = true;

  return notification;
}

export async function markAllNotificationsAsRead(
  userId?: number,
) {
  notifications.forEach((notification) => {
    if (
      userId === undefined ||
      notification.userId === userId
    ) {
      notification.read = true;
    }
  });

  return notifications;
}

export async function deleteNotification(id: number) {
  const index = notifications.findIndex(
    (notification) => notification.id === id,
  );

  if (index === -1) {
    return false;
  }

  notifications.splice(index, 1);

  return true;
}

export function getUnreadNotificationCount(userId: number) {
  return notifications.filter(
    (notification) =>
      notification.userId === userId &&
      !notification.read,
  ).length;
}