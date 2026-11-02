// Dernière activité créée / modifiée : sert à la présélectionner dans « Ajouter avancement projet ».

const KEY = "ndao-last-activity";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface LastActivity {
  projectId: number;
  activityId: number;
  at: number;
}

export function setLastActivity(projectId: number, activityId: number): void {
  try {
    if (typeof window === "undefined" || !projectId || !activityId) return;
    window.localStorage.setItem(KEY, JSON.stringify({ projectId, activityId, at: Date.now() } satisfies LastActivity));
  } catch {
    /* stockage indisponible : la présélection est simplement ignorée */
  }
}

export function getLastActivity(): LastActivity | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<LastActivity>;
    if (!v.projectId || !v.activityId || !v.at || Date.now() - v.at > MAX_AGE_MS) return null;
    return v as LastActivity;
  } catch {
    return null;
  }
}
