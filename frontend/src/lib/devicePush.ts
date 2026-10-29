"use client";

// Notifications système de l'appareil (barre des tâches du PC, notifications du téléphone).
// Partagé par la cloche (useDeviceNotifications) et par Paramètres > Notifications push.

import api from "@/lib/axios";

export const DEVICE_FLAG = "ndao_device_notifications"; // "off" = désactivé volontairement sur cet appareil

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
            : "Autorisation non accordée.",
      };
    }

    localStorage.removeItem(DEVICE_FLAG);

    const pushActive = await subscribeDevice(await deviceRegistration()).catch(() => false);
    return { ok: true, permission, pushActive };
  } catch (error) {
    return {
      ok: false,
      permission: devicePermission(),
      pushActive: false,
      message: error instanceof Error && /404|ServiceWorker/i.test(error.message)
        ? "Fichier public/sw.js introuvable : placez-le dans le dossier public du frontend, puis redémarrez."
        : "Impossible d'activer les notifications sur cet appareil.",
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
