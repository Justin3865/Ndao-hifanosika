"use client";

import { Archive, CheckCheck, Mail, Trash2, X } from "lucide-react";

interface Props {
  count: number;
  total: number;
  busy?: boolean;
  onSelectAll: () => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

const BTN =
  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";

/** Barre d'actions flottante, affichée seulement pendant la sélection multiple. */
export function SelectionBar({
  count,
  total,
  busy = false,
  onSelectAll,
  onMarkRead,
  onMarkUnread,
  onArchive,
  onDelete,
  onCancel,
}: Props) {
  return (
    <div
      role="toolbar"
      aria-label="Actions sur la sélection"
      className="fixed bottom-4 left-1/2 z-50 flex max-w-[96vw] -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-2xl border border-white/10 bg-slate-900/95 px-2 py-2 text-white shadow-2xl backdrop-blur"
    >
      <button type="button" onClick={onCancel} className={`${BTN} hover:bg-white/10`} aria-label="Annuler la sélection">
        <X className="h-4 w-4" />
      </button>

      <span className="px-2 text-sm font-semibold">
        {count} sélectionné{count > 1 ? "s" : ""}
      </span>

      <button
        type="button"
        onClick={onSelectAll}
        disabled={busy || count >= total}
        className={`${BTN} hover:bg-white/10`}
      >
        Tout sélectionner
      </button>

      <span className="mx-1 hidden h-6 w-px bg-white/15 sm:block" />

      <button type="button" onClick={onMarkRead} disabled={busy} className={`${BTN} hover:bg-white/10`}>
        <CheckCheck className="h-4 w-4" /> Lu
      </button>

      <button type="button" onClick={onMarkUnread} disabled={busy} className={`${BTN} hover:bg-white/10`}>
        <Mail className="h-4 w-4" /> Non lu
      </button>

      <button type="button" onClick={onArchive} disabled={busy} className={`${BTN} hover:bg-white/10`}>
        <Archive className="h-4 w-4" /> Archiver
      </button>

      <button type="button" onClick={onDelete} disabled={busy} className={`${BTN} bg-red-600 hover:bg-red-700`}>
        <Trash2 className="h-4 w-4" /> Supprimer
      </button>
    </div>
  );
}
