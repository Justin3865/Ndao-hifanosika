"use client";

// Notifications système de l'appareil (barre des tâches / centre de notifications du PC,
// notifications du téléphone) :
//  - Web Push (si activé côté serveur) : reçues même application fermée ;
//  - sinon, repli local : affichées dès qu'un message arrive pendant que l'onglet est en arrière-plan.

import { useCallback, useEffect, useState } from "react";
import {
  DEVICE_FLAG,
  DevicePermission,
  deviceEnabled,
  devicePermission,
  deviceRegistration,
  showSystemNotification,
  deviceSupported,
  disableDevicePush,
  enableDevicePush,
  subscribeDevice,
  testDeviceNotification,
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

  // Toutes les rôles : la permission du navigateur est demandée automatiquement au premier clic / touche
  // (le navigateur exige un geste de l'utilisateur). Si l'utilisateur l'a désactivé volontairement, on ne redemande pas.
  useEffect(() => {
    if (!deviceSupported() || devicePermission() !== "default") return;
    if (localStorage.getItem(DEVICE_FLAG) === "off") return;

    const ask = () => {
      window.removeEventListener("pointerdown", ask);
      window.removeEventListener("keydown", ask);

      void enableDevicePush().then((result) => {
        setPermission(result.permission);
        setEnabled(result.ok);
        setPushActive(result.pushActive);
      });
    };

    window.addEventListener("pointerdown", ask, { once: true });
    window.addEventListener("keydown", ask, { once: true });

    return () => {
      window.removeEventListener("pointerdown", ask);
      window.removeEventListener("keydown", ask);
    };
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

  // Affichage de la notification système (toast en bas à droite de Windows) dès qu'un message arrive,
  // que la fenêtre soit au premier plan ou non. L'état réel (autorisation + choix de l'utilisateur) est lu
  // au moment de l'arrivée, pas depuis un état React périmé.
  useEffect(() => {
    if (!incoming) return;

    if (!deviceEnabled()) {
      console.info(
        "[notifications système] ignorée — autorisation :",
        devicePermission(),
        "| désactivée volontairement :",
        localStorage.getItem(DEVICE_FLAG) === "off",
      );
      return;
    }

    setPermission("granted");
    setEnabled(true);

    void showSystemNotification(
      incoming.senderId ? `${personName(incoming.sender)} — ${incoming.title}` : incoming.title,
      {
        body: previewText(incoming).slice(0, 160),
        tag: `ndao-msg-${incoming.id}`,
        url: `/notifications?source=${encodeURIComponent(incoming.senderId ? `u:${incoming.senderId}` : "system")}`,
      },
    ).then((problem) => {
      if (problem) console.warn("[notifications système] échec :", problem);
    });
  }, [incoming]);

  const test = useCallback(async () => {
    setError((await testDeviceNotification()) ?? "");
  }, []);

  return { permission, enabled, pushActive, busy, error, enable, disable, test };
}
