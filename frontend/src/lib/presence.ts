// Présence journalière avec preuve GPS (miroir de /api/presence)

export type PresenceMode = "SIEGE" | "TERRAIN";

export interface PresenceTaskLog {
  id: number;
  internshipTaskId: number | null;
  activityId?: number | null;
  activityTitle?: string | null;
  title: string;
  note: string | null;
  progress: number | null;
  completed: boolean;
}

export interface PresenceDay {
  id: number;
  userId: number;
  day: string;
  mode: PresenceMode;
  internshipId: number | null;
  projectId: number | null;
  projectName?: string | null;
  checkInAt: string;
  checkIn: { latitude: number; longitude: number; altitude: number | null; accuracy: number | null; distanceM: number | null; expectedAltitude: number | null };
  checkOutAt: string | null;
  checkOut: { latitude: number | null; longitude: number | null; altitude: number | null; accuracy: number | null; distanceM: number | null } | null;
  status: "OK" | "SUSPECT";
  flags: string[];
  tasksDone: number;
  summary: string | null;
  tasks: PresenceTaskLog[];
}

export interface PresenceState {
  clock: { today: string; workingDay: boolean; open: boolean; closed: boolean; openHour: number; closeHour: number };
  rules: { siteRadiusM: number; maxAccuracyM: number; altitudeToleranceM: number; openHour: number; closeHour: number };
  isStagiaire: boolean;
  hq: { id: number; name: string; latitude: number; longitude: number } | null;
  internship: { id: number; title: string; projectId: number | null; tasks: Array<{ id: number; title: string; status: string; progress: number }> } | null;
  /** Activités du projet choisi à l'arrivée (membre non stagiaire) : l'avancement du projet en dépend */
  activities: Array<{ id: number; title: string; progress: number; status: string }>;
  today: PresenceDay | null;
  canCheckIn: boolean;
  blockedReason: string | null;
}

export interface TeamPresenceRow extends PresenceDay {
  userName: string;
  role: string | null;
  projectName: string | null;
  internshipTitle: string | null;
}

export interface TeamPresence {
  day: string;
  totals: { present: number; checkedOut: number; suspect: number; tasks: number; missing: number };
  rows: TeamPresenceRow[];
  missing: Array<{ userId: number; name: string; internshipId: number; title: string }>;
}

export interface InternshipJournal {
  internship?: { id: number; title: string; studentName: string };
  user?: { id: number; name: string; role: string };
  totals: { daysPresent: number; daysCheckedOut: number; daysSuspect: number; tasksLogged: number; lastDay: string | null };
  alerts: Array<{ level: "warning" | "info"; message: string }>;
  days: PresenceDay[];
}

const FLAG_LABEL: Record<string, string> = {
  LOW_ACCURACY: "Précision GPS faible",
  NO_ACCURACY: "Précision GPS non fournie",
  NO_ALTITUDE: "Altitude non fournie par l'appareil",
  NO_REFERENCE: "Aucun siège / zone de référence enregistré",
  OUT_OF_ZONE: "Hors de la zone attendue",
  ALTITUDE_MISMATCH: "Altitude incohérente avec le terrain",
  LEFT_SITE: "Position de départ éloignée de l'arrivée",
  VERY_SHORT_PRESENCE: "Présence très courte (moins de 30 min)",
};

export function flagLabel(flag: string): string {
  if (flag.endsWith("_AT_EXIT")) return `Au départ : ${(FLAG_LABEL[flag.replace("_AT_EXIT", "")] ?? flag).toLowerCase()}`;
  return FLAG_LABEL[flag] ?? flag;
}

export const fmtTime = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—";

export const fmtDay = (day: string): string => `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}`;
