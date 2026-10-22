"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { fmtDateTime } from "@/lib/crud";
import {
  SYSTEM_SOURCE,
  personName,
  previewText,
  useNotificationFeed,
} from "@/hooks/useNotificationFeed";

const DOT: Record<string, string> = {
  INFO: "bg-blue-500",
  SUCCESS: "bg-green-500",
  WARNING: "bg-amber-500",
  ERROR: "bg-red-500",
};

export function NotificationBell() {
  // Compteurs et liste mis à jour automatiquement (socket) : aucune action requise
  const { groups, unread, incoming, dismissIncoming } = useNotificationFeed();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Bannière d'un nouveau message : disparaît seule après 5 s
  useEffect(() => {
    if (!incoming) return;

    const timer = window.setTimeout(dismissIncoming, 5000);
    return () => window.clearTimeout(timer);
  }, [incoming, dismissIncoming]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-xl p-2.5 text-gray-600 transition hover:bg-gray-100"
        aria-label={`Notifications${unread > 0 ? ` (${unread} non lues)` : ""}`}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[22rem] max-w-[92vw] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <p className="font-semibold text-gray-900">Notifications</p>
            <span className="text-xs text-gray-500">{unread} non lue(s)</span>
          </div>

          <div className="max-h-96 divide-y divide-gray-100 overflow-y-auto">
            {groups.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-gray-500">Aucune notification</p>
            )}

            {/* Une ligne par source, avec le nombre de messages de cette source */}
            {groups.slice(0, 8).map((group) => (
              <Link
                key={group.key}
                href={`/notifications?source=${encodeURIComponent(group.key)}`}
                onClick={() => setOpen(false)}
                className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-gray-50 ${
                  group.unread > 0 ? "bg-blue-50/60" : ""
                }`}
              >
                <span
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                    group.key === SYSTEM_SOURCE ? (DOT[group.latest.type] ?? "bg-gray-400") : "bg-blue-600"
                  }`}
                >
                  {group.key === SYSTEM_SOURCE ? <Bell className="h-4 w-4" /> : group.label.charAt(0).toUpperCase()}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-gray-900">
                      {group.key === SYSTEM_SOURCE ? "Système" : personName(group.latest.sender)}
                    </span>
                    <span className="shrink-0 text-[11px] text-gray-400">{fmtDateTime(group.latest.createdAt)}</span>
                  </span>

                  <span className="block truncate text-xs font-medium text-gray-700">{group.latest.title}</span>

                  <span className="flex items-center justify-between gap-2">
                    <span className="line-clamp-1 text-xs text-gray-600">{previewText(group.latest)}</span>

                    <span className="flex shrink-0 items-center gap-1">
                      {group.unread > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                          {group.unread}
                        </span>
                      )}
                      <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600" title="Messages de cette source">
                        {group.total}
                      </span>
                    </span>
                  </span>
                </span>
              </Link>
            ))}
          </div>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-gray-100 px-4 py-3 text-center text-sm font-medium text-blue-700 hover:bg-gray-50"
          >
            Voir toutes les notifications
          </Link>
        </div>
      )}

      {incoming && (
        <Link
          href={`/notifications?source=${encodeURIComponent(incoming.senderId ? `u:${incoming.senderId}` : SYSTEM_SOURCE)}`}
          onClick={dismissIncoming}
          className="fixed right-4 top-20 z-[60] block w-80 max-w-[92vw] rounded-2xl border border-blue-200 bg-white p-4 shadow-2xl"
        >
          <p className="text-xs font-medium text-blue-700">{incoming.senderId ? personName(incoming.sender) : "Système"}</p>
          <p className="text-sm font-semibold text-gray-900">{incoming.title}</p>
          <p className="mt-1 line-clamp-2 text-xs text-gray-600">{previewText(incoming)}</p>
        </Link>
      )}
    </div>
  );
}
