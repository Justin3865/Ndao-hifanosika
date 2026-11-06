"use client";

// Notifications système de l'appareil (barre des tâches du PC, notifications du téléphone).
// Partagé par la cloche (useDeviceNotifications) et par Paramètres > Notifications push.

import api from "@/lib/axios";

export const DEVICE_FLAG = "ndao_device_notifications"; // "off" = désactivé volontairement sur cet appareil

/** Logo officiel Ndao Hifanosika (public/logos/ndao-hifanosika.png) : seule icône utilisée par les notifications. */
export const NOTIF_ICON = "/logos/ndao-hifanosika.png";

export type DevicePermission = "unsupported" | "default" | "denied" | "granted";

export const deviceSupported = (): boolean =>
  typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;

export const devicePermission = (): DevicePermission =>
  deviceSupported() ? (Notification.permission as DevicePermission) : "unsupported";

export const deviceEnabled = (): boolean =>
  devicePermission() === "granted" && localStorage.getItem(DEVICE_FLAG) !== "off";

function toKey(base64: string): Uint8Array {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export async function deviceRegistration(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register("/sw.js");

  // `ready` ne se résout jamais si le service worker n'a pas pu s'activer : on limite l'attente à 10 s
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error("ServiceWorker : délai dépassé")), 10_000)),
  ]);
}

/** Notification système de test. */
export async function testDeviceNotification(): Promise<string | null> {
  return showSystemNotification("Ndao Hifanosika", {
    body: "Test : les notifications système fonctionnent sur cet appareil.",
    tag: "ndao-test",
    url: "/notifications",
  });
}

/**
 * Affiche une notification système (toast Windows en bas à droite).
 * 1) API Notification directe (aucun service worker requis) ; 2) repli : service worker (mobile).
 */
export async function showSystemNotification(
  title: string,
  options: { body?: string; tag?: string; url?: string } = {},
): Promise<string | null> {
  if (!deviceSupported()) return "Notifications système non prises en charge par ce navigateur.";
  if (Notification.permission !== "granted") return "Autorisation du navigateur non accordée.";

  const url = options.url || "/notifications";

  try {
    const n = new Notification(title, {
      body: options.body,
      tag: options.tag,
      icon: NOTIF_ICON,
    });

    n.onclick = () => {
      window.focus();
      n.close();
      if (window.location.pathname + window.location.search !== url) window.location.href = url;
    };

    return null;
  } catch {
    /* Android / certains navigateurs exigent le service worker */
  }

  try {
    const reg = await deviceRegistration();

    // `badge` n'est pas présent dans toutes les versions des types DOM : on l'ajoute via un type étendu
    const swOptions: NotificationOptions & { badge?: string } = {
      body: options.body,
      tag: options.tag,
      icon: NOTIF_ICON,
      badge: NOTIF_ICON,
      data: { url },
    };

    await reg.showNotification(title, swOptions);

    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Impossible d'afficher la notification.";
  }
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
export async function subscribeDevice(reg: ServiceWorkerRegistration): Promise<boolean> {
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

export interface EnableResult {
  ok: boolean;
  permission: DevicePermission;
  pushActive: boolean;
  message?: string;
}

/** Demande l'autorisation du navigateur puis active les notifications de cet appareil. */
export async function enableDevicePush(): Promise<EnableResult> {
  if (!deviceSupported()) {
    return { ok: false, permission: "unsupported", pushActive: false, message: "Ce navigateur ne prend pas en charge les notifications système." };
  }

  try {
    const permission = (await Notification.requestPermission()) as DevicePermission;

    if (permission !== "granted") {
      return {
        ok: false,
        permission,
        pushActive: false,
        message:
          permission === "denied"
            ? "Notifications bloquées par le navigateur : autorisez-les dans les réglages du site, puis réessayez."
            : "Fenêtre d'autorisation fermée sans réponse : cliquez sur l'icône à gauche de l'adresse > Notifications > Autoriser.",
      };
    }

    localStorage.removeItem(DEVICE_FLAG);

    // Web Push (application fermée) : facultatif, son échec ne bloque pas les notifications locales
    const pushActive = await subscribeDevice(await deviceRegistration()).catch(() => false);
    return { ok: true, permission, pushActive };
  } catch (error) {
    return {
      ok: false,
      permission: devicePermission(),
      pushActive: false,
      message: `Impossible d'activer les notifications sur cet appareil${error instanceof Error ? ` : ${error.message}` : "."}`,
    };
  }
}

/** Désactive les notifications de cet appareil (et se désabonne du Web Push). */
export async function disableDevicePush(): Promise<void> {
  if (typeof window === "undefined") return;

  localStorage.setItem(DEVICE_FLAG, "off");

  if (!deviceSupported()) return;

  try {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();

    if (sub) {
      await api.post("/notifications/push/unsubscribe", { endpoint: sub.endpoint }).catch(() => undefined);
      await sub.unsubscribe().catch(() => undefined);
    }
  } catch {
    /* le drapeau local suffit : plus aucune notification locale ne sera affichée */
  }
}