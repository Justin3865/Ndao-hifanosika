"use client";

import type { Notification } from "./NotificationItem";
import NotificationItem from "./NotificationItem";
import NotificationEmpty from "./NotificationEmpty";

interface NotificationListProps {
  notifications: Notification[];
  loading?: boolean;
  onSelect?: (notification: Notification) => void;
  onMarkAsRead?: (notification: Notification) => void;
  onArchive?: (notification: Notification) => void;
  onDelete?: (notification: Notification) => void;
}

export default function NotificationList({
  notifications,
  loading = false,
  onSelect,
  onMarkAsRead,
  onArchive,
  onDelete,
}: NotificationListProps) {
  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-10 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

        <p className="mt-3 text-sm text-gray-500">
          Chargement des notifications...
        </p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return <NotificationEmpty />;
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <div className="divide-y">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onSelect={onSelect}
            onMarkAsRead={onMarkAsRead}
            onArchive={onArchive}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}