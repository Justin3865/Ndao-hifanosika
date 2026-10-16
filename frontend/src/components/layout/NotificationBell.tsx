"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import api from "@/lib/axios";
import { fmtDateTime } from "@/lib/crud";
import { getSocket } from "@/lib/socket";

interface NotificationRow {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

const DOT: Record<string, string> = {
  INFO: "bg-blue-500",
  SUCCESS: "bg-green-500",
  WARNING: "bg-amber-500",
  ERROR: "bg-red-500",
};

export function NotificationBell() {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<NotificationRow | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get("/notifications")
      .then((res) => setItems(res.data?.data ?? []))
      .catch(() => setItems([]));

    // Temps réel : une nouvelle notification apparaît immédiatement
    const socket = getSocket();

    const onNew = (row: NotificationRow) => {
      setItems((cur) => [row, ...cur]);
      setToast(row);
      window.setTimeout(() => setToast(null), 5000);
    };

    socket?.on("notification:new", onNew);

    return () => {
      socket?.off("notification:new", onNew);
    };
  }, []);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const unread = items.filter((item) => !item.read).length;

  const markRead = async (item: NotificationRow) => {
    if (item.read) return;

    try {
      await api.patch(`/notifications/${item.id}/read`);
      setItems((cur) => cur.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
    } catch {
      /* silencieux */
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-xl p-2.5 text-gray-600 transition hover:bg-gray-100"
        aria-label="Notifications"
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
            {items.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-gray-500">Aucune notification</p>
            )}

            {items.slice(0, 8).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => markRead(item)}
                className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-gray-50 ${
                  item.read ? "" : "bg-blue-50/60"
                }`}
              >
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${DOT[item.type] ?? "bg-gray-400"}`} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-gray-900">{item.title}</span>
                  <span className="line-clamp-2 text-xs text-gray-600">{item.message}</span>
                  <span className="mt-1 block text-[11px] text-gray-400">{fmtDateTime(item.createdAt)}</span>
                </span>
              </button>
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

      {toast && (
        <div className="fixed right-4 top-20 z-[60] w-80 max-w-[92vw] rounded-2xl border border-blue-200 bg-white p-4 shadow-2xl">
          <p className="text-sm font-semibold text-gray-900">{toast.title}</p>
          <p className="mt-1 text-xs text-gray-600">{toast.message}</p>
        </div>
      )}
    </div>
  );
}
