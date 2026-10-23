"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CalendarClock, Paperclip, Trash2, Users } from "lucide-react";
import api from "@/lib/axios";
import { getSocket } from "@/lib/socket";
import { errorMessage, fmtDateTime } from "@/lib/crud";
import { confirmDialog, toast } from "@/lib/toast";

interface ScheduledItem {
  id: number;
  title: string;
  message: string;
  scheduledAt: string;
  status: "PENDING" | "SENDING" | "FAILED";
  error: string | null;
  recipientCount: number | null;
  attachments: number;
  hasLocation: boolean;
}

/** Messages programmés de l'expéditeur : en attente d'envoi, avec possibilité d'annuler. */
export function ScheduledList({ refreshKey = 0 }: { refreshKey?: number }) {
  const [items, setItems] = useState<ScheduledItem[]>([]);

  const load = useCallback(() => {
    api
      .get("/notifications/scheduled")
      .then((res) => setItems(res.data?.data ?? []))
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  // Mise à jour automatique quand le serveur envoie (ou échoue à envoyer) un message programmé
  useEffect(() => {
    const socket = getSocket();
    socket?.on("scheduled:update", load);

    const timer = window.setInterval(load, 60_000);

    return () => {
      socket?.off("scheduled:update", load);
      window.clearInterval(timer);
    };
  }, [load]);

  const cancel = async (item: ScheduledItem) => {
    if (!(await confirmDialog("Annuler cet envoi programmé ?", { title: "Annuler l'envoi", confirmLabel: "Annuler l'envoi" }))) return;

    try {
      await api.delete(`/notifications/scheduled/${item.id}`);
      toast.success("Envoi programmé annulé.");
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Annulation impossible."));
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-900">
        <CalendarClock className="h-4 w-4" /> Messages programmés ({items.length})
      </p>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-start gap-3 rounded-xl border bg-white p-3 text-sm ${item.status === "FAILED" ? "border-red-200" : "border-indigo-100"}`}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-gray-900">{item.title}</p>
              {item.message && <p className="line-clamp-2 text-xs text-gray-600">{item.message}</p>}

              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" /> {fmtDateTime(item.scheduledAt)}</span>
                {item.recipientCount !== null && (
                  <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {item.recipientCount}</span>
                )}
                {item.attachments > 0 && (
                  <span className="inline-flex items-center gap-1"><Paperclip className="h-3 w-3" /> {item.attachments}</span>
                )}
                {item.status === "SENDING" && <span className="font-medium text-indigo-700">Envoi en cours…</span>}
              </p>

              {item.status === "FAILED" && (
                <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                  <AlertTriangle className="h-3 w-3" /> Échec : {item.error ?? "erreur inconnue"}
                </p>
              )}
            </div>

            {item.status !== "SENDING" && (
              <button
                type="button"
                onClick={() => void cancel(item)}
                className="shrink-0 rounded-lg p-2 text-red-600 hover:bg-red-50"
                title={item.status === "FAILED" ? "Retirer de la liste" : "Annuler l'envoi"}
                aria-label="Annuler l'envoi"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
