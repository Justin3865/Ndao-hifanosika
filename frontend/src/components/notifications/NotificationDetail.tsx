"use client";

import { useEffect } from "react";
import { CornerUpLeft, X } from "lucide-react";
import { MessageAttachments } from "@/components/notifications/MessageAttachments";
import { RegistrationRequestActions } from "@/components/notifications/RegistrationRequestActions";
import { fmtDateTime } from "@/lib/crud";
import { roleLabel } from "@/lib/roles";
import type { FeedItem } from "@/hooks/useNotificationFeed";

const TYPE_COLORS: Record<string, string> = {
  INFO: "bg-blue-100 text-blue-700",
  SUCCESS: "bg-green-100 text-green-700",
  WARNING: "bg-yellow-100 text-yellow-700",
  ERROR: "bg-red-100 text-red-700",
};

const senderName = (item: FeedItem): string =>
  item.sender ? `${item.sender.firstName ?? ""} ${item.sender.lastName ?? ""}`.trim() || "Utilisateur" : "Système";

/**
 * Fenêtre de détail d'une notification : tout le texte (rien n'est tronqué), l'expéditeur,
 * les dates d'envoi et de réception, les pièces jointes, la position et, pour une demande
 * d'inscription, les boutons Accepter / Refuser.
 */
export function NotificationDetail({ item, onClose }: { item: FeedItem; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Les dates « Envoyé » / « Reçu » existent selon la version du flux de notifications
  const loose = item as unknown as { sentAt?: string; receivedAt?: string | null };
  const sent = loose.sentAt ?? item.createdAt;
  const received = loose.receivedAt ?? null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLORS[item.type] ?? "bg-gray-100 text-gray-700"}`}>{item.type}</span>
            <h2 className="text-lg font-semibold text-gray-900">{item.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <dl className="mt-4 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">De</dt>
            <dd className="font-medium text-gray-900">
              {senderName(item)}
              {item.sender && "role" in item.sender && item.sender.role ? <span className="ml-2 text-xs font-normal text-gray-500">({roleLabel(String(item.sender.role))})</span> : null}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Envoyé</dt>
            <dd className="font-medium text-gray-900">{fmtDateTime(sent)}</dd>
          </div>
          {received && (
            <div>
              <dt className="text-gray-500">Reçu</dt>
              <dd className="font-medium text-gray-900">{fmtDateTime(received)}</dd>
            </div>
          )}
        </dl>

        {item.replyTo && (
          <div className="mt-4 rounded-lg border-l-4 border-blue-300 bg-gray-50 px-3 py-2 text-sm text-gray-600">
            <p className="flex items-center gap-1 font-medium text-gray-700">
              <CornerUpLeft className="h-3.5 w-3.5" /> En réponse à « {item.replyTo.title} »
            </p>
            <p className="whitespace-pre-wrap break-words">{item.replyTo.message}</p>
          </div>
        )}

        {item.message && <p className="mt-4 whitespace-pre-wrap break-words rounded-xl bg-gray-50 p-4 text-sm leading-relaxed text-gray-800">{item.message}</p>}

        <MessageAttachments attachments={item.attachments} latitude={item.latitude} longitude={item.longitude} accuracy={item.accuracy} />

        <RegistrationRequestActions item={item} detailed />

        <div className="mt-5 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
