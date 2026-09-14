"use client";

import {
  Bell,
  CheckCheck,
} from "lucide-react";

import NotificationActions from "./NotificationActions";

interface NotificationHeaderProps {
  unreadCount: number;
  onMarkAllAsRead?: () => void;
  onArchiveAll?: () => void;
  onDeleteAll?: () => void;
}

export default function NotificationHeader({
  unreadCount,
  onMarkAllAsRead,
  onArchiveAll,
  onDeleteAll,
}: NotificationHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-blue-100 p-3">
          <Bell className="h-6 w-6 text-blue-600" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Notifications
          </h1>

          <p className="text-sm text-gray-500">
            Gérez les notifications et rappels de la plateforme.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {unreadCount > 0 && (
          <div className="hidden items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700 sm:flex">
            <CheckCheck className="h-4 w-4" />
            {unreadCount} non lue
            {unreadCount > 1 ? "s" : ""}
          </div>
        )}

        <NotificationActions
          unreadCount={unreadCount}
          onMarkAllAsRead={onMarkAllAsRead}
          onArchiveAll={onArchiveAll}
          onDeleteAll={onDeleteAll}
        />
      </div>
    </div>
  );
}