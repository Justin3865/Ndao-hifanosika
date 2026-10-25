"use client";

import { ReactNode, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  Bell,
  CalendarClock,
  CheckCheck,
  ChevronDown,
  Copy,
  CornerUpLeft,
  Loader2,
  Mail,
  MapPin,
  MoreHorizontal,
  Plus,
  Reply,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import api from "@/lib/axios";
import { AppLayout } from "@/components/layout";
import { MessageAttachments } from "@/components/notifications/MessageAttachments";
import {
  AudiencePicker,
  AudienceValue,
  EMPTY_AUDIENCE,
  audienceIsEmpty,
  audienceToPayload,
} from "@/components/notifications/AudiencePicker";
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

/* ------------------------------------------------------------------ */
/* Messages programmés (en attente d'envoi) : on peut les annuler        */
/* ------------------------------------------------------------------ */

interface ScheduledItem {
  id: number;
  title: string;
  message: string;
  type: string;
  sendAt: string;
  status: "PENDING" | "SENDING" | "FAILED";
  error: string | null;
  recipientsCount: number | null;
  attachments: number;
  hasLocation: boolean;
}

function ScheduledMessages({ refreshKey }: { refreshKey: number }) {
  const [scheduled, setScheduled] = useState<ScheduledItem[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = () =>
    api
      .get("/notifications/scheduled")
      .then((res) => setScheduled(res.data?.data ?? []))
      .catch(() => setScheduled([]));

  // Rechargé après chaque programmation, puis toutes les minutes (un message envoyé disparaît de la liste)
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  useEffect(() => {
    const timer = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancelScheduled = async (entry: ScheduledItem) => {
    const ok = await confirmDialog(`Annuler l'envoi programmé de « ${entry.title} » ?`, {
      title: "Annuler l'envoi programmé",
      confirmLabel: "Annuler l'envoi",
      danger: true,
    });

    if (!ok) return;

    setBusyId(entry.id);

    try {
      await api.delete(`/notifications/scheduled/${entry.id}`);
      toast.success("Envoi programmé annulé.");
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Annulation impossible."));
    } finally {
      setBusyId(null);
    }
  };

  if (scheduled.length === 0) return null;

  return (
    <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
        <CalendarClock className="h-4 w-4" /> Messages programmés ({scheduled.length})
      </p>

      <ul className="space-y-2">
        {scheduled.map((entry) => (
          <li key={entry.id} className="flex items-start gap-3 rounded-xl border border-amber-100 bg-white p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900">{entry.title}</p>

              {entry.message && <p className="truncate text-xs text-gray-500">{entry.message}</p>}

              <p className="mt-1 text-xs text-gray-600">
                {entry.status === "FAILED" ? (
                  <span className="font-medium text-red-600">Échec : {entry.error ?? "envoi impossible"}</span>
                ) : entry.status === "SENDING" ? (
                  <span className="font-medium text-blue-700">Envoi en cours…</span>
                ) : (
                  <>
                    Envoi le <b>{fmtDateTime(entry.sendAt)}</b>
                  </>
                )}
                {entry.recipientsCount !== null && ` · ${entry.recipientsCount} destinataire${entry.recipientsCount > 1 ? "s" : ""}`}
                {entry.attachments > 0 && ` · ${entry.attachments} pièce(s) jointe(s)`}
                {entry.hasLocation && " · position"}
              </p>
            </div>

            {entry.status !== "SENDING" && (
              <button
                type="button"
                onClick={() => void cancelScheduled(entry)}
                disabled={busyId === entry.id}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                {busyId === entry.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                {entry.status === "FAILED" ? "Retirer" : "Annuler"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface CardProps {
  item: FeedItem;
  sameSourceCount: number;
  /** Tous les messages du même expéditeur (affichés quand on touche « N messages ») */
  sameSourceItems: FeedItem[];
  onRead: (item: FeedItem) => void;
  onMenu: (item: FeedItem) => void;
  children?: ReactNode;
}

/** Résumé d'une ligne pour la liste des messages d'un expéditeur */
function snippetOf(item: FeedItem): string {
  if (item.message) return item.message;

  const voice = item.attachments.find((file) => file.kind === "AUDIO" && file.name.toLowerCase().startsWith("vocal-"));

  if (voice) return "🎤 Message vocal";
  if (item.attachments.length > 0) return `📎 ${item.attachments.length} pièce${item.attachments.length > 1 ? "s" : ""} jointe${item.attachments.length > 1 ? "s" : ""}`;
  if (item.latitude !== null && item.latitude !== undefined) return "📍 Position partagée";

  return "";
}

/** Défile jusqu'au message et le met brièvement en évidence */
function jumpToMessage(id: number) {
  const element = document.getElementById(`msg-${id}`);
  if (!element) return;

  element.scrollIntoView({ block: "center", behavior: "smooth" });
  element.classList.add("ring-2", "ring-blue-400");
  window.setTimeout(() => element.classList.remove("ring-2", "ring-blue-400"), 1800);
}

function MessageCard({ item, sameSourceCount, sameSourceItems, onRead, onMenu, children }: CardProps) {
  const [showThread, setShowThread] = useState(false);

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
            <button
              type="button"
              onClick={() => setShowThread((current) => !current)}
              aria-expanded={showThread}
              title="Voir tous les messages de cet expéditeur"
              className="ml-2 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600 hover:bg-gray-200"
            >
              {sameSourceCount} message{sameSourceCount > 1 ? "s" : ""}
              <ChevronDown className={`h-3 w-3 transition ${showThread ? "rotate-180" : ""}`} />
            </button>
            {item.batchId && (
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                <Users className="h-3 w-3" /> Groupe{item.groupSize ? ` · ${item.groupSize}` : ""}
              </span>
            )}
          </p>

          {showThread && (
            <div className="space-y-1.5 rounded-xl border border-gray-200 bg-white/70 p-2" data-no-press>
              <p className="px-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                Messages de {personName(item.sender)} ({sameSourceItems.length})
              </p>

              {sameSourceItems.map((other) => (
                <button
                  key={other.id}
                  type="button"
                  onClick={() => jumpToMessage(other.id)}
                  className={`block w-full rounded-lg border px-3 py-2 text-left transition ${
                    other.id === item.id ? "border-blue-300 bg-blue-50" : "border-gray-100 bg-white hover:bg-gray-50"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      {!other.read && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
                      <span className="truncate text-xs font-semibold text-gray-900">{other.title}</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-gray-400">{fmtDateTime(other.createdAt)}</span>
                  </span>

                  {snippetOf(other) && <span className="mt-0.5 block line-clamp-2 text-xs text-gray-600">{snippetOf(other)}</span>}
                  {other.id === item.id && <span className="text-[10px] font-medium text-blue-600">Ce message</span>}
                </button>
              ))}
            </div>
          )}

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

          <p className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-400">
            <span>Envoyé : {fmtDateTime(item.createdAt)}</span>
            <span>Reçu : {item.receivedAt ? fmtDateTime(item.receivedAt) : "…"}</span>
          </p>
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
  onReplyGroup: () => void;
  onMarkUnread: () => void;
  onArchive: () => void;
  onCopy: () => void;
  onOpenMap: () => void;
  onDelete: () => void;
}

function ActionSheet({ item, onClose, onReply, onReplyGroup, onMarkUnread, onArchive, onCopy, onOpenMap, onDelete }: SheetProps) {
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
            <Reply className="h-4 w-4 text-blue-600" /> {item.batchId ? "Répondre à l'expéditeur" : "Répondre"}
          </button>
        )}

        {item.senderId && item.batchId && (
          <button type="button" className={row} onClick={onReplyGroup}>
            <Users className="h-4 w-4 text-indigo-600" /> Répondre au groupe
            {item.groupSize ? ` (${item.groupSize - 1} personnes)` : ""}
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
  const [departments, setDepartments] = useState<LookupItem[]>([]);
  const [audience, setAudience] = useState<AudienceValue>(EMPTY_AUDIENCE);
  const [form, setForm] = useState({ title: "", type: "INFO" });
  const [menuId, setMenuId] = useState<number | null>(null);
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [replyScope, setReplyScope] = useState<"sender" | "group">("sender");
  const [view, setView] = useState<"inbox" | "archived">("inbox");
  const [query, setQuery] = useState("");

  // Brouillon : l'utilisateur (null = pas encore lu) et le compteur qui recharge les messages programmés
  const [draftUid, setDraftUid] = useState<string | null>(null);
  const [scheduledTick, setScheduledTick] = useState(0);

  const metaKey = draftUid ? `ndao.draft.notif.${draftUid}` : null;

  const clearMeta = () => {
    if (!metaKey) return;

    try {
      window.localStorage.removeItem(metaKey);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const current = getStoredRole();
    setRole(current);

    if (SENDERS.includes(current)) {
      fetchLookup("users").then(setUsers).catch(() => setUsers([]));
      fetchLookup("departments").then(setDepartments).catch(() => setDepartments([]));
    }
  }, []);

  // Brouillon : on retrouve le formulaire tel qu'on l'a quitté (destinataires, titre, message, pièces jointes)
  useEffect(() => {
    let id = "anon";

    try {
      const stored = JSON.parse(window.localStorage.getItem("user") ?? "null");
      if (stored?.id) id = String(stored.id);
    } catch {
      /* ignore */
    }

    setDraftUid(id);

    if (!SENDERS.includes(getStoredRole())) return;

    try {
      let reopen = Boolean(window.localStorage.getItem(`ndao.draft.msg.notif-compose.${id}`));
      const raw = window.localStorage.getItem(`ndao.draft.notif.${id}`);
      const draft = raw ? JSON.parse(raw) : null;

      if (draft && Date.now() - (draft.savedAt ?? 0) < 7 * 24 * 3600 * 1000) {
        if (draft.audience) setAudience(draft.audience);
        if (draft.form) setForm(draft.form);
        reopen = reopen || Boolean(draft.showForm);
      }

      if (reopen) setShowForm(true);
    } catch {
      /* brouillon illisible : on l'ignore */
    }
  }, []);

  useEffect(() => {
    if (!metaKey || !showForm) return;

    try {
      if (!audienceIsEmpty(audience) || form.title.trim()) {
        window.localStorage.setItem(metaKey, JSON.stringify({ audience, form, showForm: true, savedAt: Date.now() }));
      } else {
        window.localStorage.removeItem(metaKey);
      }
    } catch {
      /* ignore */
    }
  }, [metaKey, showForm, audience, form]);

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
  const itemsBySource = new Map<string, FeedItem[]>();

  for (const entry of pool) {
    const key = sourceKey(entry);
    const list = itemsBySource.get(key);

    if (list) list.push(entry);
    else itemsBySource.set(key, [entry]);
  }
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
    if (audienceIsEmpty(audience)) {
      throw new Error("Choisissez au moins un destinataire.");
    }

    if (!form.title.trim()) {
      throw new Error("Le titre est obligatoire.");
    }

    let feedback = "Notification envoyée.";

    try {
      const res = await api.post("/notifications", {
        audience: audienceToPayload(audience),
        title: form.title.trim(),
        type: form.type,
        ...payload,
      });

      if (res.data?.scheduled || (res.data?.count ?? 1) > 1) feedback = res.data.message;
    } catch (err) {
      throw new Error(errorMessage(err, "Envoi impossible."));
    }

    clearMeta();
    setForm({ title: "", type: "INFO" });
    setAudience(EMPTY_AUDIENCE);
    setShowForm(false);
    setScheduledTick((n) => n + 1);
    toast.success(feedback);
  };

  const sendReply = async (item: FeedItem, payload: ComposerPayload) => {
    try {
      await api.post(`/notifications/${item.id}/reply`, { ...payload, scope: replyScope });
    } catch (err) {
      throw new Error(errorMessage(err, "Envoi de la réponse impossible."));
    }

    setReplyingId(null);
    toast.success(replyScope === "group" ? "Réponse envoyée au groupe." : "Réponse envoyée.");
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

      {SENDERS.includes(role) && <ScheduledMessages refreshKey={scheduledTick} />}

      {showForm && draftUid !== null && (
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <AudiencePicker value={audience} onChange={setAudience} users={users} departments={departments} />

          <select className={inputClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {["INFO", "SUCCESS", "WARNING", "ERROR"].map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <input className={inputClass} placeholder="Titre" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />

          <MessageComposer
            onSubmit={sendNew}
            submitLabel="Envoyer la notification"
            placeholder="Message (emoji, photo, vidéo, audio, message vocal, fichier, ZIP ou position)"
            allowLocation={SENDERS.includes(role)}
            allowVoice
            allowSchedule
            draftKey={`notif-compose.${draftUid}`}
            onDiscardDraft={() => {
              setAudience(EMPTY_AUDIENCE);
              setForm({ title: "", type: "INFO" });
              clearMeta();
            }}
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
            sameSourceItems={itemsBySource.get(sourceKey(item)) ?? [item]}
            onRead={markRead}
            onMenu={(target) => setMenuId(target.id)}
          >
            {replyingId === item.id && (
              <div className="mt-3 border-t border-gray-200 pt-3" data-no-press>
                <p className="mb-2 text-xs font-medium text-gray-600">
                  {replyScope === "group"
                    ? `Répondre au groupe (${item.groupSize ? item.groupSize - 1 : "tous"} personnes)`
                    : `Répondre à ${personName(item.sender)}`}
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
            setReplyScope("sender");
            setReplyingId(menuItem.id);
            setMenuId(null);
          }}
          onReplyGroup={() => {
            setReplyScope("group");
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
