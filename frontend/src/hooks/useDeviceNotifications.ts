"use client";

// Notifications système de l'appareil (barre des tâches / centre de notifications du PC,
// notifications du téléphone) :
//  - Web Push (si activé côté serveur) : reçues même application fermée ;
//  - sinon, repli local : affichées dès qu'un message arrive pendant que l'onglet est en arrière-plan.

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/axios";
import { FeedItem, personName, previewText } from "@/hooks/useNotificationFeed";

export type DevicePermission = "unsupported" | "default" | "denied" | "granted";

const FLAG = "ndao_device_notifications"; // "off" = désactivé volontairement sur cet appareil

function supported(): boolean {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
}

function toKey(base64: string): Uint8Array {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

async function registration(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready;
}

async function serverKey(): Promise<string | null> {
  try {
    const res = await api.get("/notifications/push/key");
    return res.data?.data?.configured ? (res.data.data.publicKey as string) : null;
  } catch {
    return null;
  }
}

/** Abonne l'appareil au Web Push (si le serveur l'a activé) ; renvoie true si abonné. */
async function subscribe(reg: ServiceWorkerRegistration): Promise<boolean> {
  const key = await serverKey();
  if (!key) return false;

  const existing = await reg.pushManager.getSubscription();

  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: toKey(key) as unknown as BufferSource,
    }));

  await api.post("/notifications/push/subscribe", sub.toJSON());
  return true;
}

export function useDeviceNotifications(incoming: FeedItem | null) {
  const [permission, setPermission] = useState<DevicePermission>("default");
  const [enabled, setEnabled] = useState(false);
  const [pushActive, setPushActive] = useState(false);
  const [busy, setBusy] = useState(false);

  // État initial + resynchronisation de l'abonnement de l'utilisateur connecté
  useEffect(() => {
    if (!supported()) {
      setPermission("unsupported");
      return;
    }

    setPermission(Notification.permission as DevicePermission);

    const on = Notification.permission === "granted" && localStorage.getItem(FLAG) !== "off";
    setEnabled(on);

    if (!on) return;

    registration()
      .then(subscribe)
      .then(setPushActive)
      .catch(() => undefined);
  }, []);

  const enable = useCallback(async () => {
    if (!supported()) return;
    setBusy(true);

    try {
      const result = (await Notification.requestPermission()) as DevicePermission;
      setPermission(result);

      if (result === "granted") {
        localStorage.removeItem(FLAG);
        setEnabled(true);
        setPushActive(await subscribe(await registration()).catch(() => false));
      }
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);

    try {
      localStorage.setItem(FLAG, "off");
      setEnabled(false);
      setPushActive(false);

      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();

      if (sub) {
        await api.post("/notifications/push/unsubscribe", { endpoint: sub.endpoint }).catch(() => undefined);
        await sub.unsubscribe().catch(() => undefined);
      }
    } finally {
      setBusy(false);
    }
  }, []);

  // Repli local : message reçu pendant que la fenêtre n'est pas au premier plan
  useEffect(() => {
    if (!incoming || !enabled || pushActive || permission !== "granted") return;
    if (document.visibilityState === "visible" && document.hasFocus()) return;

    registration()
      .then((reg) =>
        reg.showNotification(`${personName(incoming.sender)} — ${incoming.title}`, {
          body: previewText(incoming).slice(0, 160),
          tag: `ndao-msg-${incoming.id}`,
          icon: "/apple-touch-icon.png",
          data: { url: `/notifications?source=${encodeURIComponent(incoming.senderId ? `u:${incoming.senderId}` : "system")}` },
        }),
      )
      .catch(() => undefined);
  }, [incoming, enabled, pushActive, permission]);

  return { permission, enabled, pushActive, busy, enable, disable };
}
