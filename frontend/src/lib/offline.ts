// src/lib/offline.ts
// Aides du mode hors-ligne / connectivité limitée (cahier des charges §2.7 et §6).
// Le service worker (public/sw.js) met en cache les pages et quelques listes non nominatives, en lecture seule.

export const OFFLINE_WRITE_MESSAGE =
  "Vous êtes hors ligne : cette action nécessite une connexion (les enregistrements ne sont pas gardés en attente). Réessayez une fois reconnecté.";

/** Le PWA est actif en production, ou en développement avec NEXT_PUBLIC_PWA=1 (évite de servir du code périmé en dev). */
export const PWA_ENABLED = process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_PWA === "1";

export function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/** À appeler à la déconnexion : le service worker supprime les copies d’API de l’utilisateur. */
export function clearOfflineCache(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    navigator.serviceWorker.controller?.postMessage({ type: "NH_CLEAR_CACHE" });
  } catch {
    /* sans importance : le cache est de toute façon propre à chaque utilisateur et expire en 24 h */
  }
}

/** Erreur « façon axios » : errorMessage() et handleApiError() affichent directement le message. */
export function offlineWriteError(): Error {
  return Object.assign(new Error(OFFLINE_WRITE_MESSAGE), {
    response: { status: 0, data: { success: false, message: OFFLINE_WRITE_MESSAGE } },
  });
}
