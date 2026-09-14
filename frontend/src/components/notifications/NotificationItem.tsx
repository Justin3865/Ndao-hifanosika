"use client";

import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  FileText,
  FolderKanban,
  GraduationCap,
  Heart,
  Info,
  Sparkles,
  Target,
  Trash2,
  Users,
  Archive,
} from "lucide-react";

import NotificationBadge from "./NotificationBadge";
import NotificationPriority from "./NotificationPriority";
import type { NotificationPriorityValue } from "./NotificationPriority";
import type { NotificationTypeValue } from "./NotificationType";

export type NotificationStatus =
  | "unread"
  | "read"
  | "archived";

export interface Notification {
  id: string;
  title: string;
  message: string;

  type: NotificationTypeValue;
  priority: NotificationPriorityValue;
  status: NotificationStatus;

  createdAt: string;
  readAt?: string;

  userId?: string;
  projectId?: string;
  projectName?: string;

  actionUrl?: string;
  actionLabel?: string;

  metadata?: Record<string, unknown>;
}

interface NotificationItemProps {
  notification: Notification;
  onSelect?: (notification: Notification) => void;
  onMarkAsRead?: (notification: Notification) => void;
  onArchive?: (notification: Notification) => void;
  onDelete?: (notification: Notification) => void;
}

const typeIcons = {
  system: Bell,
  project: FolderKanban,
  activity: Target,
  evaluation: CheckCircle2,
  report: FileText,
  internship: GraduationCap,
  beneficiary: Heart,
  user: Users,
  reminder: CalendarDays,
  ai: Sparkles,
};

export default function NotificationItem({
  notification,
  onSelect,
  onMarkAsRead,
  onArchive,
  onDelete,
}: NotificationItemProps) {
  const Icon = typeIcons[notification.type] ?? Info;

  const isUnread = notification.status === "unread";

  return (
    <div
      className={`group flex gap-4 p-4 transition hover:bg-gray-50 ${
        isUnread ? "bg-blue-50/40" : "bg-white"
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect?.(notification)}
        className="flex min-w-0 flex-1 gap-4 text-left"
      >
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
            isUnread ? "bg-blue-100" : "bg-gray-100"
          }`}
        >
          <Icon
            className={`h-5 w-5 ${
              isUnread ? "text-blue-600" : "text-gray-500"
            }`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={`truncate text-sm ${
                isUnread
                  ? "font-bold text-gray-900"
                  : "font-medium text-gray-800"
              }`}
            >
              {notification.title}
            </h3>

            {isUnread && <NotificationBadge label="Nouveau" />}
          </div>

          <p className="mt-1 line-clamp-2 text-sm text-gray-600">
            {notification.message}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="text-xs text-gray-400">
              {notification.createdAt}
            </span>

            {notification.projectName && (
              <span className="text-xs text-gray-500">
                Projet : {notification.projectName}
              </span>
            )}

            <NotificationPriority
              priority={notification.priority}
            />
          </div>
        </div>

        <ChevronRight className="mt-3 hidden h-5 w-5 shrink-0 text-gray-300 sm:block" />
      </button>

      <div className="flex shrink-0 items-start gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
        {isUnread && onMarkAsRead && (
          <button
            type="button"
            onClick={() => onMarkAsRead(notification)}
            title="Marquer comme lu"
            className="rounded-lg p-2 text-gray-400 hover:bg-green-50 hover:text-green-600"
          >
            <CheckCircle2 className="h-4 w-4" />
          </button>
        )}

        {onArchive && (
          <button
            type="button"
            onClick={() => onArchive(notification)}
            title="Archiver"
            className="rounded-lg p-2 text-gray-400 hover:bg-yellow-50 hover:text-yellow-600"
          >
            <Archive className="h-4 w-4" />
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(notification)}
            title="Supprimer"
            className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}