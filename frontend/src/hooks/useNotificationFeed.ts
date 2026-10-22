"use client";

// Flux de notifications / messages en temps réel.
// Une seule source de vérité (le serveur) : chaque changement est poussé par
// socket (new / update / delete / read-all), donc la cloche, la page et les
// autres onglets restent synchronisés et les compteurs se mettent à jour seuls.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "@/lib/axios";
import { errorMessage } from "@/lib/crud";
import { getSocket } from "@/lib/socket";

export type AttachmentKind = "IMAGE" | "VIDEO" | "AUDIO" | "ARCHIVE" | "FILE";

export interface PersonRef {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
}

export interface AttachmentMeta {
  id: number;
  name: string;
  mime: string;
  kind: AttachmentKind;
  size: number;
}

export interface ReplyPreview {
  id: number;
  title: string;
  message: string;
  sender: PersonRef | null;
  hasAttachments: boolean;
  hasLocation: boolean;
}

export interface FeedItem {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  archived: boolean;
  createdAt: string;
  senderId: number | null;
  sender: PersonRef | null;
  attachments: AttachmentMeta[];
  replyTo: ReplyPreview | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
}

export interface SourceGroup {
  key: string;
  label: string;
  role: string | null;
  senderId: number | null;
  total: number;
  unread: number;
  latest: FeedItem;
}

export const SYSTEM_SOURCE = "system";

export const sourceKey = (item: Pick<FeedItem, "senderId">): string =>
  item.senderId ? `u:${item.senderId}` : SYSTEM_SOURCE;

export const personName = (person: PersonRef | null | undefined): string =>
  person ? `${person.firstName} ${person.lastName}`.trim() : "Système";

/** Les évènements serveur « automatiques » n'ont ni expéditeur ni pièces jointes. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeItem(row: any): FeedItem {
  return {
    id: Number(row.id),
    title: String(row.title ?? ""),
    message: String(row.message ?? ""),
    type: String(row.type ?? "INFO"),
    read: Boolean(row.read),
    archived: Boolean(row.archived),
    createdAt: String(row.createdAt ?? new Date().toISOString()),
    senderId: row.senderId ?? row.sender?.id ?? null,
    sender: row.sender ?? null,
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    replyTo: row.replyTo ?? null,
    latitude: typeof row.latitude === "number" ? row.latitude : null,
    longitude: typeof row.longitude === "number" ? row.longitude : null,
    accuracy: typeof row.accuracy === "number" ? row.accuracy : null,
  };
}

/** Texte d'aperçu : message, sinon type de contenu joint. */
export function previewText(item: FeedItem): string {
  if (item.message.trim()) return item.message.trim();
  if (item.attachments.length > 0) {
    const first = item.attachments[0];
    const label =
      first.kind === "IMAGE" ? "Photo" : first.kind === "VIDEO" ? "Vidéo" : first.kind === "AUDIO" ? "Audio" : first.name;
    return `📎 ${label}${item.attachments.length > 1 ? ` (+${item.attachments.length - 1})` : ""}`;
  }
  if (item.latitude !== null) return "📍 Position partagée";
  return item.title;
}

/** Regroupe par source (expéditeur) : total, non lus, dernier message. `list` trié du plus récent au plus ancien. */
export function buildGroups(list: FeedItem[]): SourceGroup[] {
  const map = new Map<string, SourceGroup>();

  for (const item of list) {
    const key = sourceKey(item);
    const current = map.get(key);

    if (!current) {
      map.set(key, {
        key,
        label: personName(item.sender),
        role: item.sender?.role ?? null,
        senderId: item.senderId,
        total: 1,
        unread: item.read ? 0 : 1,
        latest: item,
      });
    } else {
      current.total += 1;
      if (!item.read) current.unread += 1;
    }
  }

  return Array.from(map.values());
}

const byDateDesc = (a: FeedItem, b: FeedItem) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

export function useNotificationFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [incoming, setIncoming] = useState<FeedItem | null>(null);
  const alive = useRef(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/notifications");
      if (!alive.current) return;
      const rows: unknown[] = res.data?.data ?? [];
      setItems(rows.map(normalizeItem).sort(byDateDesc));
      setError("");
    } catch (err) {
      if (alive.current) setError(errorMessage(err, "Impossible de charger les notifications."));
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    void load();

    const socket = getSocket();

    const onNew = (row: unknown) => {
      const item = normalizeItem(row);
      setItems((cur) => [item, ...cur.filter((n) => n.id !== item.id)].sort(byDateDesc));
      setIncoming(item);
    };

    const onUpdate = (row: unknown) => {
      const item = normalizeItem(row);
      setItems((cur) => cur.map((n) => (n.id === item.id ? item : n)));
    };

    const onDelete = (payload: { id: number }) =>
      setItems((cur) => cur.filter((n) => n.id !== Number(payload?.id)));

    const onReadAll = () => setItems((cur) => cur.map((n) => ({ ...n, read: true })));

    // Resynchronisation : retour d'une coupure réseau ou de l'onglet en arrière-plan
    const onReconnect = () => void load();
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };

    socket?.on("notification:new", onNew);
    socket?.on("notification:update", onUpdate);
    socket?.on("notification:delete", onDelete);
    socket?.on("notification:read-all", onReadAll);
    socket?.io.on("reconnect", onReconnect);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      alive.current = false;
      socket?.off("notification:new", onNew);
      socket?.off("notification:update", onUpdate);
      socket?.off("notification:delete", onDelete);
      socket?.off("notification:read-all", onReadAll);
      socket?.io.off("reconnect", onReconnect);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  /* ----- compteurs (recalculés automatiquement à chaque changement) ----- */

  const unread = useMemo(() => items.filter((n) => !n.read && !n.archived).length, [items]);

  // Les compteurs ne tiennent compte que des messages non archivés
  const active = useMemo(() => items.filter((n) => !n.archived), [items]);
  const groups = useMemo(() => buildGroups(active), [active]);

  /* ----- actions (optimistes ; le serveur confirme par socket) ----- */

  const patchLocal = (id: number, read: boolean) =>
    setItems((cur) => cur.map((n) => (n.id === id ? { ...n, read } : n)));

  const setRead = useCallback(
    async (id: number, read: boolean): Promise<boolean> => {
      patchLocal(id, read);

      try {
        await api.patch(`/notifications/${id}/${read ? "read" : "unread"}`);
        return true;
      } catch (err) {
        patchLocal(id, !read);
        setError(errorMessage(err, "Action impossible."));
        return false;
      }
    },
    [],
  );

  const setArchived = useCallback(async (id: number, archived: boolean): Promise<boolean> => {
    const patch = (value: boolean) =>
      setItems((cur) => cur.map((n) => (n.id === id ? { ...n, archived: value } : n)));

    patch(archived);

    try {
      await api.patch(`/notifications/${id}/${archived ? "archive" : "unarchive"}`);
      return true;
    } catch (err) {
      patch(!archived);
      setError(errorMessage(err, "Action impossible."));
      return false;
    }
  }, []);

  const markAllRead = useCallback(async (): Promise<boolean> => {
    try {
      await api.patch("/notifications/read-all");
      setItems((cur) => cur.map((n) => ({ ...n, read: true })));
      return true;
    } catch (err) {
      setError(errorMessage(err, "Action impossible."));
      return false;
    }
  }, []);

  const remove = useCallback(async (id: number): Promise<boolean> => {
    try {
      await api.delete(`/notifications/${id}`);
      setItems((cur) => cur.filter((n) => n.id !== id));
      return true;
    } catch (err) {
      setError(errorMessage(err, "Suppression impossible."));
      return false;
    }
  }, []);

  const dismissIncoming = useCallback(() => setIncoming(null), []);

  return {
    items,
    groups,
    unread,
    loading,
    error,
    setError,
    incoming,
    dismissIncoming,
    reload: load,
    setRead,
    setArchived,
    markAllRead,
    remove,
  };
}
