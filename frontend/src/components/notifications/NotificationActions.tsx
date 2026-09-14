"use client";

import {
  Archive,
  CheckCheck,
  Trash2,
} from "lucide-react";

interface NotificationActionsProps {
  unreadCount?: number;
  onMarkAllAsRead?: () => void;
  onArchiveAll?: () => void;
  onDeleteAll?: () => void;
}

export default function NotificationActions({
  unreadCount = 0,
  onMarkAllAsRead,
  onArchiveAll,
  onDeleteAll,
}: NotificationActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {onMarkAllAsRead && unreadCount > 0 && (
        <button
          type="button"
          onClick={onMarkAllAsRead}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
        >
          <CheckCheck className="h-4 w-4" />
          Tout marquer comme lu
        </button>
      )}

      {onArchiveAll && (
        <button
          type="button"
          onClick={onArchiveAll}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
        >
          <Archive className="h-4 w-4" />
          Archiver
        </button>
      )}

      {onDeleteAll && (
        <button
          type="button"
          onClick={onDeleteAll}
          className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
          Supprimer
        </button>
      )}
    </div>
  );
}