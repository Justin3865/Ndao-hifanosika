// src/lib/toast.ts
// Notifications à position FIXE (haut-droite) dont la couleur dépend de l'action
// (supprimer = rouge, modifier = bleu, créer = vert…) + boîte de confirmation.
// Remplace alert/confirm. Le rendu est fait par <ToastHost /> (monté dans app/layout.tsx).

export type ToastKind =
  | "success" // opération réussie (générique)  → vert
  | "create" //  création / ajout / génération   → vert
  | "update" //  modification / enregistrement   → bleu
  | "delete" //  suppression                     → ROUGE
  | "archive" // archivage, annulation, refus…   → orange
  | "send" //    envoi, message, SMS             → violet
  | "info" //    information neutre              → ardoise
  | "warning" //  attention                       → ambre
  | "error"; //  échec                           → rouge foncé

export interface ToastOptions {
  /** Force le type (sinon déduit du message pour success). */
  kind?: ToastKind;
  /** Remplace le titre par défaut ("Supprimé", "Erreur"…). */
  title?: string;
}

export interface ToastEventDetail {
  kind: ToastKind;
  message: string;
  title?: string;
}

export interface ConfirmEventDetail {
  message: string;
  title: string;
  confirmLabel: string;
  danger: boolean;
  resolve: (value: boolean) => void;
}

declare global {
  interface Window {
    __nhHost?: boolean;
  }
}

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/**
 * Déduit l'action à partir du texte du message, pour que les ~200 appels existants
 * `toast.success("Utilisateur supprimé.")` deviennent automatiquement rouges, etc.
 * Pour forcer un type : toast.delete("…"), toast.update("…") ou { kind: "delete" }.
 */
export function inferToastKind(message: string): ToastKind {
  const m = normalize(message);

  if (/desarchiv/.test(m)) return "update";
  if (/archiv|desactiv|revoqu|annul|refus|rejet|ignor/.test(m)) return "archive";
  if (/suppress|supprim|effac/.test(m)) return "delete";
  if (/envoy|transmis/.test(m)) return "send";
  if (/modifi|enregistr|mis a jour|recalcul|abaisse|rouvert|reouvert/.test(m)) return "update";
  if (/\bcree|creat|ajoute|genere|delivre|inscrit/.test(m)) return "create";
  return "success";
}

function emit(kind: ToastKind, message: string, title?: string) {
  if (typeof window === "undefined") return;

  // Aucun ToastHost monté : on ne perd jamais un message d'erreur
  if (!window.__nhHost) {
    if (kind === "error" || kind === "warning") window.alert(message);
    return;
  }

  window.dispatchEvent(
    new CustomEvent<ToastEventDetail>("nh:toast", { detail: { kind, message, title } })
  );
}

/** Accepte aussi l'ancienne forme toast.success(message, "Titre"). */
function resolveOptions(options?: ToastOptions | string): ToastOptions {
  return typeof options === "string" ? { title: options } : options ?? {};
}

export const toast = {
  /** Réussite : la couleur est déduite du message (supprimé → rouge, modifié → bleu…). */
  success: (message: string, options?: ToastOptions | string) => {
    const o = resolveOptions(options);
    emit(o.kind ?? inferToastKind(message), message, o.title);
  },
  error: (message: string, options?: ToastOptions | string) =>
    emit("error", message, resolveOptions(options).title),
  info: (message: string, options?: ToastOptions | string) => {
    const o = resolveOptions(options);
    emit(o.kind ?? "info", message, o.title);
  },
  warning: (message: string, options?: ToastOptions | string) =>
    emit("warning", message, resolveOptions(options).title),

  // Raccourcis explicites par action
  create: (message: string, options?: ToastOptions | string) =>
    emit("create", message, resolveOptions(options).title),
  update: (message: string, options?: ToastOptions | string) =>
    emit("update", message, resolveOptions(options).title),
  delete: (message: string, options?: ToastOptions | string) =>
    emit("delete", message, resolveOptions(options).title),
  archive: (message: string, options?: ToastOptions | string) =>
    emit("archive", message, resolveOptions(options).title),
  send: (message: string, options?: ToastOptions | string) =>
    emit("send", message, resolveOptions(options).title),
};

export function confirmDialog(
  message: string,
  options: { title?: string; confirmLabel?: string; danger?: boolean } = {}
): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);

  // Sans ToastHost, la fenêtre native garantit que le bouton fonctionne quand même
  if (!window.__nhHost) return Promise.resolve(window.confirm(message));

  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent<ConfirmEventDetail>("nh:confirm", {
        detail: {
          message,
          title: options.title ?? "Confirmation",
          confirmLabel: options.confirmLabel ?? "Confirmer",
          danger: options.danger ?? true,
          resolve,
        },
      })
    );
  });
}
