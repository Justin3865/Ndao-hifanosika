"use client";

// Notifications système de l'appareil (barre des tâches / centre de notifications du PC,
// notifications du téléphone) :
//  - Web Push (si activé côté serveur) : reçues même application fermée ;
//  - sinon, repli local : affichées dès qu'un message arrive pendant que l'onglet est en arrière-plan.

import { useCallback, useEffect, useState } from "react";
import {
  DevicePermission,
  deviceEnabled,
  devicePermission,
  deviceRegistration,
  deviceSupported,
  disableDevicePush,
  enableDevicePush,
  subscribeDevice,
} from "@/lib/devicePush";
import { FeedItem, personName, previewText } from "@/hooks/useNotificationFeed";

export type { DevicePermission } from "@/lib/devicePush";

export function useDeviceNotifications(incoming: FeedItem | null) {
  const [permission, setPermission] = useState<DevicePermission>("default");
  const [enabled, setEnabled] = useState(false);
  const [pushActive, setPushActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // État initial + resynchronisation de l'abonnement de l'utilisateur connecté
  useEffect(() => {
    if (!deviceSupported()) {
      setPermission("unsupported");
      return;
    }

    setPermission(devicePermission());

    const on = deviceEnabled();
    setEnabled(on);

    if (!on) return;

    deviceRegistration()
      .then(subscribeDevice)
      .then(setPushActive)
      .catch(() => undefined);
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    setError("");

    try {
      const result = await enableDevicePush();

      setPermission(result.permission);
      setEnabled(result.ok);
      setPushActive(result.pushActive);

      if (!result.ok && result.message) setError(result.message);
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);

    try {
      await disableDevicePush();
      setEnabled(false);
      setPushActive(false);
    } finally {
      setBusy(false);
    }
  }, []);

  // Repli local : message reçu pendant que la fenêtre n'est pas au premier plan
  useEffect(() => {
    if (!incoming || !enabled || pushActive || permission !== "granted") return;
    if (document.visibilityState === "visible" && document.hasFocus()) return;

    deviceRegistration()
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

  return { permission, enabled, pushActive, busy, error, enable, disable };
}
