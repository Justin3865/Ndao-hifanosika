/**
 * Brouillons conservés dans le navigateur (localStorage) : si l'utilisateur quitte la page ou
 * revient en arrière, ce qu'il avait déjà écrit est retrouvé tel quel.
 */
const PREFIX = "nh:draft:";
const MAX_AGE_MS = 14 * 24 * 3600 * 1000;

function scope(): string {
  if (typeof window === "undefined") return "";

  try {
    const raw = localStorage.getItem("user");
    const id = raw ? (JSON.parse(raw) as { id?: number | string }).id : null;
    return id ? `u${id}:` : "";
  } catch {
    return "";
  }
}

const full = (key: string) => `${PREFIX}${scope()}${key}`;

export function loadDraft<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(full(key));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { at: number; value: T };

    if (!parsed || Date.now() - parsed.at > MAX_AGE_MS) {
      localStorage.removeItem(full(key));
      return null;
    }

    return parsed.value;
  } catch {
    return null;
  }
}

export function saveDraft<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(full(key), JSON.stringify({ at: Date.now(), value }));
  } catch {
    /* stockage plein ou désactivé : le brouillon est simplement ignoré */
  }
}

export function clearDraft(key: string): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(full(key));
  } catch {
    /* ignoré */
  }
}
