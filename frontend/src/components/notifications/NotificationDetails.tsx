"use client";

import {
  Archive,
  Bell,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Trash2,
  X,
} from "lucide-react";

import type { Notification } from "./NotificationItem";
import NotificationPriority from "./NotificationPriority";
import NotificationType from "./NotificationType";
import NotificationStatus from "./NotificationStatus";

interface NotificationDetailsProps {
  notification: Notification;
  onClose?: () => void;
  onMarkAsRead?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onAction?: () => void;
}

export default function NotificationDetails({
  notification,
  onClose,
  onMarkAsRead,
  onArchive,
  onDelete,
  onAction,
}: NotificationDetailsProps) {
  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-50 p-2">
            <Bell className="h-5 w-5 text-blue-600" />
          </div>

          <h2 className="font-semibold">
            Détails de la notification
          </h2>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="space-y-6 p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <NotificationType type={notification.type} />
            <NotificationPriority
              priority={notification.priority}
            />
            <NotificationStatus
              status={notification.status}
            />
          </div>

          <h1 className="mt-4 text-xl font-bold text-gray-900">
            {notification.title}
          </h1>

          <p className="mt-3 whitespace-pre-line leading-7 text-gray-600">
            {notification.message}
          </p>
        </div>

        <div className="grid gap-4 rounded-lg bg-gray-50 p-4 md:grid-cols-2">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-gray-400" />

            <div>
              <p className="text-xs text-gray-500">
                Date de création
              </p>

              <p className="text-sm font-medium">
                {notification.createdAt}
              </p>
            </div>
          </div>

          {notification.readAt && (
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />

              <div>
                <p className="text-xs text-gray-500">
                  Date de lecture
                </p>

                <p className="text-sm font-medium">
                  {notification.readAt}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t pt-5">
          {notification.status === "unread" && onMarkAsRead && (
            <button
              type="button"
              onClick={onMarkAsRead}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm text-white hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              Marquer comme lu
            </button>
          )}

          {notification.actionUrl && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm text-white hover:bg-blue-700"
            >
              <ExternalLink className="h-4 w-4" />
              {notification.actionLabel ?? "Ouvrir"}
            </button>
          )}

          {onArchive && (
            <button
              type="button"
              onClick={onArchive}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm hover:bg-gray-50"
            >
              <Archive className="h-4 w-4" />
              Archiver
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Supprimer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}