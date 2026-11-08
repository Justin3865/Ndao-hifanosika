"use client";

import { useEffect, useState } from "react";
import { PWA_ENABLED } from "@/lib/offline";

/**
 * Monté une fois dans app/layout.tsx :
 *  - enregistre le service worker (pages et lectures en cache, voir public/sw.js) ;
 *  - affiche un bandeau quand la connexion est absente ou que des données viennent du cache.
 */
export function OfflineSupport() {
  const [offline, setOffline] = useState(false);
  const [cachedAt, setCachedAt] = useState<number | null>(null);

  useEffect(() => {
    setOffline(typeof navigator !== "undefined" && navigator.onLine === false);

    const goOffline = () => setOffline(true);
    const goOnline = () => {
      setOffline(false);
      setCachedAt(null);
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    let onMessage: ((e: MessageEvent) => void) | null = null;
    if ("serviceWorker" in navigator && PWA_ENABLED) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
      onMessage = (e: MessageEvent) => {
        if (e.data?.type === "NH_FROM_CACHE" && typeof e.data.cachedAt === "number") {
          setCachedAt((prev) => (prev === null ? e.data.cachedAt : Math.min(prev, e.data.cachedAt)));
        }
      };
      navigator.serviceWorker.addEventListener("message", onMessage);
    }

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      if (onMessage) navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, []);

  if (!offline && cachedAt === null) return null;

  const when = cachedAt ? new Date(cachedAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[70] border-t border-amber-300 bg-amber-100 px-4 py-2 text-center text-sm text-amber-900 shadow-lg"
    >
      {offline
        ? `Hors ligne — lecture seule${when ? ` · données enregistrées le ${when}` : ""}. Les modifications sont désactivées jusqu’au retour de la connexion.`
        : `Connexion lente ou instable — certaines données proviennent de la copie du ${when}.`}
    </div>
  );
}
