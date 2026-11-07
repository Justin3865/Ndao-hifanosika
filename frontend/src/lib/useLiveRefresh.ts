// src/lib/useLiveRefresh.ts — recalcul automatique : rappelle `refresh` dès que de nouvelles données arrivent
"use client";

import { useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";

/**
 * Appelle `refresh` :
 *  - toutes les `intervalMs` (seulement si l'onglet est visible) ;
 *  - au retour sur l'onglet / la fenêtre ;
 *  - dès que le serveur annonce une nouvelle analyse (socket « anomaly:run », émis après chaque
 *    écriture sur une donnée surveillée : projet, stage, évaluation, enquête, avancement…).
 * Les appels rapprochés sont fusionnés (anti-rebond 1,5 s) pour ne pas multiplier les requêtes.
 */
export function useLiveRefresh(refresh: () => void, intervalMs = 15_000, enabled = true) {
  const ref = useRef(refresh);
  ref.current = refresh;

  useEffect(() => {
    if (!enabled) return;

    let timer: number | undefined;
    const trigger = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => ref.current(), 1500);
    };

    const tick = window.setInterval(() => {
      if (document.visibilityState === "visible") ref.current();
    }, intervalMs);

    const onVisible = () => {
      if (document.visibilityState === "visible") trigger();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", trigger);

    const socket = getSocket();
    socket?.on("anomaly:run", trigger);

    return () => {
      window.clearInterval(tick);
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", trigger);
      socket?.off("anomaly:run", trigger);
    };
  }, [intervalMs, enabled]);
}
