"use client";

import { ReactNode, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  Bell,
  CheckCheck,
  Copy,
  CornerUpLeft,
  Mail,
    MapPin,
  MoreHorizontal,
  Plus,
  Reply,
  Search,
  Trash2,
  X,
} from "lucide-react";
import api from "@/lib/axios";
import { AppLayout } from "@/components/layout";
import { MessageAttachments } from "@/components/notifications/MessageAttachments";
import { ComposerPayload, MessageComposer } from "@/components/notifications/MessageComposer";
import { getStoredRole } from "@/lib/access";
import { LookupItem, errorMessage, fetchLookup, fmtDateTime } from "@/lib/crud";
import { confirmDialog, toast } from "@/lib/toast";
import { LONG_PRESS_MS, useLongPress } from "@/hooks/useLongPress";
import {
  FeedItem,
  SYSTEM_SOURCE,
  buildGroups,
  personName,
  sourceKey,
  useNotificationFeed,
} from "@/hooks/useNotificationFeed";

const TYPE_COLORS: Record<string, string> = {
  INFO: "bg-blue-100 text-blue-700",
  SUCCESS: "bg-green-100 text-green-700",
  WARNING: "bg-yellow-100 text-yellow-700",
  ERROR: "bg-red-100 text-red-700",
};

const SENDERS = ["ADMIN", "DIRECTION", "DSI", "RH"];

/** Recherche insensible à la casse et aux accents. */
const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function matches(item: FeedItem, query: string): boolean {
  const haystack = normalize(
    [
      item.title,
      item.message,
      personName(item.sender),
      item.replyTo?.title ?? "",
      ...item.attachments.map((file) => file.name),
    ].join(" "),
  );

  return query
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

/* ------------------------------------------------------------------ */
/* Carte d'un message (appui long → actions)                            */
/* ------------------------------------------------------------------ */

interface CardProps {
  item: FeedItem;
  sameSourceCount: number;
  onRead: (item: FeedItem) => void;
  onMenu: (item: FeedItem) => void;
  children?: ReactNode;
}

function MessageCard({ item, sameSourceCount, onRead, onMenu, children }: CardProps) {
  const { pressing, handlers } = useLongPress({
    onLongPress: () => onMenu(item),
    onClick: () => onRead(item),
  });

  return (
    <div
      id={`msg-${item.id}`}
      {...handlers}
      style={{ WebkitTouchCallout: "none" }}
      className={`relative cursor-pointer overflow-hidden rounded-2xl border p-4 shadow-sm transition [@media(pointer:coarse)]:select-none ${
        item.read ? "border-gray-200 bg-white" : "border-blue-200 bg-blue-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLORS[item.type] ?? "bg-gray-100 text-gray-700"}`}>
              {item.type}
            </span>
            <h2 className="font-semibold text-gray-900">{item.title}</h2>
            {!item.read && <span className="h-2 w-2 rounded-full bg-blue-600" />}
          </div>

          <p className="text-xs text-gray-500" title={item.sender?.role}>
            De : <span className="font-medium text-gray-700">{personName(item.sender)}</span>
            <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
              {sameSourceCount} message{sameSourceCount > 1 ? "s" : ""}
            </span>
          </p>

          {item.replyTo && (
            <div className="rounded-lg border-l-4 border-blue-300 bg-white/70 px-3 py-1.5 text-xs text-gray-600">
              <p className="flex items-center gap-1 font-medium text-gray-700">
                <CornerUpLeft className="h-3 w-3" /> En réponse à « {item.replyTo.title} »
              </p>
              <p className="line-clamp-2">
                {item.replyTo.message || (item.replyTo.hasAttachments ? "📎 Pièce jointe" : item.replyTo.hasLocation ? "📍 Position" : "")}
              </p>
            </div>
          )}

          {item.message && <p className="whitespace-pre-wrap break-words text-sm text-gray-700">{item.message}</p>}

          <MessageAttachments
            attachments={item.attachments}
            latitude={item.latitude}
            longitude={item.longitude}
            accuracy={item.accuracy}
          />

          <p className="text-xs text-gray-400">{fmtDateTime(item.createdAt)}</p>
        </div>

        <button
          type="button"
          onClick={() => onMenu(item)}
          className="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-black/5"
          title="Actions"
          aria-label="Actions"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {children}

      {/* Progression de l'appui long */}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1">
        <span
          className="block h-full bg-blue-500/70 ease-linear"
          style={{
            width: pressing ? "100%" : "0%",
            transition: pressing ? `width ${LONG_PRESS_MS}ms linear` : "none",
          }}
        />
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Feuille d'actions                                                    */
/* ------------------------------------------------------------------ */

interface SheetProps {
  item: FeedItem;
  onClose: () => void;
  onReply: () => void;
  onMarkUnread: () => void;
  onArchive: () => void;
  onCopy: () => void;
  onOpenMap: () => void;
  onDelete: () => void;
}

function ActionSheet({ item, onClose, onReply, onMarkUnread, onArchive, onCopy, onOpenMap, onDelete }: SheetProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const row = "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-gray-800 hover:bg-gray-100";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-t-2xl bg-white p-2 shadow-2xl sm:rounded-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 px-4 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">{item.title}</p>
            <p className="truncate text-xs text-gray-500">{personName(item.sender)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {item.senderId && (
          <button type="button" className={row} onClick={onReply}>
            <Reply className="h-4 w-4 text-blue-600" /> Répondre
          </button>
        )}

        {/* « Lu » se fait en touchant le message ; on ne propose ici que de le remettre en non lu */}
        {item.read && !item.archived && (
          <button type="button" className={row} onClick={onMarkUnread}>
            <Mail className="h-4 w-4 text-gray-500" /> Marquer comme non lu
          </button>
        )}

        <button type="button" className={row} onClick={onArchive}>
          {item.archived ? <ArchiveRestore className="h-4 w-4 text-gray-500" /> : <Archive className="h-4 w-4 text-gray-500" />}
          {item.archived ? "Désarchiver" : "Archiver"}
        </button>

        <button type="button" className={row} onClick={onCopy}>
          <Copy className="h-4 w-4 text-gray-500" /> Copier le texte
        </button>

        {item.latitude !== null && item.longitude !== null && (
          <button type="button" className={row} onClick={onOpenMap}>
            <MapPin className="h-4 w-4 text-emerald-600" /> Ouvrir la position
          </button>
        )}

        <button type="button" className={`${row} text-red-600`} onClick={onDelete}>
          <Trash2 className="h-4 w-4" /> Supprimer
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

function NotificationsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const source = params.get("source") ?? "";

  const { items, unread, loading, error, setError, setRead, setArchived, markAllRead, remove } = useNotificationFeed();

  const [role, setRole] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [users, setUsers] = useState<LookupItem[]>([]);
  const [form, setForm] = useState({ userId: "", title: "", type: "INFO" });
  const [menuId, setMenuId] = useState<number | null>(null);
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [view, setView] = useState<"inbox" | "archived">("inbox");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const current = getStoredRole();
    setRole(current);

    if (SENDERS.includes(current)) {
      fetchLookup("users").then(setUsers).catch(() => setUsers([]));
    }
  }, []);

  useEffect(() => {
    if (replyingId !== null) {
      document.getElementById(`msg-${replyingId}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [replyingId]);

  // Version à jour du message dont le menu est ouvert (lu / supprimé par socket entre-temps)
  const menuItem = menuId === null ? null : items.find((item) => item.id === menuId) ?? null;

  const archivedCount = items.filter((item) => item.archived).length;
  const pool = items.filter((item) => item.archived === (view === "archived"));
  const groups = buildGroups(pool);
  const countBySource = new Map(groups.map((group) => [group.key, group.total]));
  const search = normalize(query.trim());
  const visible = pool
    .filter((item) => !source || sourceKey(item) === source)
    .filter((item) => !search || matches(item, search));

  const pickSource = (key: string) =>
    router.replace(key ? `/notifications?source=${encodeURIComponent(key)}` : "/notifications", { scroll: false });

  const markRead = (item: FeedItem) => {
    if (!item.read) void setRead(item.id, true);
  };

  const sendNew = async (payload: ComposerPayload) => {
    if (!form.userId || !form.title.trim()) {
      throw new Error("Destinataire et titre sont obligatoires.");
    }

    try {
      await api.post("/notifications", {
        userId: Number(form.userId),
        title: form.title.trim(),
        type: form.type,
        ...payload,
      });
    } catch (err) {
      throw new Error(errorMessage(err, "Envoi impossible."));
    }

    setForm({ userId: "", title: "", type: "INFO" });
    setShowForm(false);
    toast.success("Notification envoyée.");
  };

  const sendReply = async (item: FeedItem, payload: ComposerPayload) => {
    try {
      await api.post(`/notifications/${item.id}/reply`, payload);
    } catch (err) {
      throw new Error(errorMessage(err, "Envoi de la réponse impossible."));
    }

    setReplyingId(null);
    toast.success("Réponse envoyée.");
  };

  const copyText = async (item: FeedItem) => {
    try {
      await navigator.clipboard.writeText(item.message.trim() || item.title);
      toast.success("Texte copié.");
    } catch {
      toast.error("Copie impossible sur ce navigateur.");
    }
  };

  const archiveItem = async (item: FeedItem) => {
    if (await setArchived(item.id, !item.archived)) {
      toast.success(item.archived ? "Notification désarchivée." : "Notification archivée.");
    }
  };

  const removeItem = async (item: FeedItem) => {
    if (!(await confirmDialog("Supprimer cette notification ?", { title: "Supprimer", confirmLabel: "Supprimer" }))) return;

    if (await remove(item.id)) toast.success("Notification supprimée.");
  };

  const inputClass = "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500">{unread} non lue(s)</p>
        </div>

        <div className="flex gap-2">
          {unread > 0 && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <CheckCheck className="h-4 w-4" /> Tout marquer comme lu
            </button>
          )}

          {SENDERS.includes(role) && (
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Envoyer
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <select className={inputClass} value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
              <option value="">Destinataire</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.label}</option>
              ))}
            </select>

            <select className={inputClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {["INFO", "SUCCESS", "WARNING", "ERROR"].map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <input className={inputClass} placeholder="Titre" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />

          <MessageComposer
            onSubmit={sendNew}
            submitLabel="Envoyer la notification"
            placeholder="Message (emoji, photo, vidéo, audio, fichier, ZIP ou position)"
            allowLocation={SENDERS.includes(role)}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl border border-gray-300 bg-white p-1 text-sm font-medium">
          {(["inbox", "archived"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setView(tab);
                setReplyingId(null);
                if (source) pickSource("");
              }}
              className={`rounded-lg px-3 py-1.5 ${view === tab ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {tab === "inbox" ? "Réception" : `Archivés (${archivedCount})`}
            </button>
          ))}
        </div>

        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher (titre, message, expéditeur, fichier)…"
            className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-9 text-sm outline-none focus:border-blue-500"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100"
              aria-label="Effacer la recherche"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {groups.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => pickSource("")}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium ${
              !source ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Tous ({pool.length})
          </button>

          {groups.map((group) => (
            <button
              key={group.key}
              type="button"
              onClick={() => pickSource(group.key)}
              title={group.role ?? undefined}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium ${
                source === group.key ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {group.key === SYSTEM_SOURCE ? "Système" : group.label} ({group.total})
              {group.unread > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                  {group.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {loading && <p className="text-gray-500">Chargement...</p>}
      {error && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {!loading && visible.length === 0 && !error && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
          <Bell className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          {search
            ? "Aucun résultat pour cette recherche."
            : view === "archived"
              ? "Aucun message archivé."
              : "Aucune notification."}
        </div>
      )}

      <div className="space-y-3">
        {visible.map((item) => (
          <MessageCard
            key={item.id}
            item={item}
            sameSourceCount={countBySource.get(sourceKey(item)) ?? 1}
            onRead={markRead}
            onMenu={(target) => setMenuId(target.id)}
          >
            {replyingId === item.id && (
              <div className="mt-3 border-t border-gray-200 pt-3" data-no-press>
                <p className="mb-2 text-xs font-medium text-gray-600">
                  Répondre à {personName(item.sender)}
                </p>
                <MessageComposer
                  autoFocus
                  rows={2}
                  submitLabel="Envoyer la réponse"
                  placeholder="Votre réponse…"
                  onSubmit={(payload) => sendReply(item, payload)}
                  onCancel={() => setReplyingId(null)}
                />
              </div>
            )}
          </MessageCard>
        ))}
      </div>

      {menuItem && (
        <ActionSheet
          item={menuItem}
          onClose={() => setMenuId(null)}
          onReply={() => {
            setReplyingId(menuItem.id);
            setMenuId(null);
          }}
          onMarkUnread={() => {
            void setRead(menuItem.id, false);
            setMenuId(null);
          }}
          onArchive={() => {
            const target = menuItem;
            setMenuId(null);
            void archiveItem(target);
          }}
          onCopy={() => {
            void copyText(menuItem);
            setMenuId(null);
          }}
          onOpenMap={() => {
            window.open(
              `https://www.google.com/maps?q=${menuItem.latitude},${menuItem.longitude}`,
              "_blank",
              "noopener,noreferrer",
            );
            setMenuId(null);
          }}
          onDelete={() => {
            const target = menuItem;
            setMenuId(null);
            void removeItem(target);
          }}
        />
      )}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <AppLayout>
      <Suspense fallback={<p className="text-gray-500">Chargement...</p>}>
        <NotificationsContent />
      </Suspense>
    </AppLayout>
  );
}
