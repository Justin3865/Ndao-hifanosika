// src/lib/internAgenda.ts
// Agenda du stagiaire : regroupe, jour par jour, tout ce qu'il a à faire ou a fait
// (tâches du stage, activités du projet, objectifs individuels, évaluations, pointage GPS et
// tâches déclarées à son départ). Fichier AJOUTÉ : il ne lit que des données déjà renvoyées par l'API.

import type { InternshipMonitoring } from "@/lib/internshipMonitoring";
import type { ObjectiveRow } from "@/lib/gaps";
import type { InternshipJournal } from "@/lib/presence";
import type { Item } from "@/lib/crud";

export type AgendaKind =
  | "activity"
  | "task_due"
  | "task_late"
  | "task_blocked"
  | "task_done"
  | "logged"
  | "objective"
  | "eval";

export interface AgendaItem {
  id: string;
  kind: AgendaKind;
  /** AAAA-MM-JJ (premier jour) */
  day: string;
  /** AAAA-MM-JJ : dernier jour pour une activité qui dure plusieurs jours */
  endDay?: string;
  title: string;
  /** Lignes d'explication affichées dans le détail du jour */
  lines: string[];
  /** Lien vers la page où agir (activité, présences, objectifs…) */
  href?: string;
  /** Statut brut (activités) pour la couleur */
  status?: string;
}

export const KIND_LABEL: Record<AgendaKind, string> = {
  activity: "Activité du projet",
  task_due: "Tâche à rendre",
  task_late: "Tâche en retard",
  task_blocked: "Tâche bloquée",
  task_done: "Tâche terminée",
  logged: "Déclaré à mon départ",
  objective: "Objectif individuel",
  eval: "Évaluation",
};

/** Classes Tailwind des pastilles du calendrier. */
export const KIND_CHIP: Record<AgendaKind, string> = {
  activity: "bg-blue-100 text-blue-800",
  task_due: "bg-slate-200 text-slate-800",
  task_late: "bg-red-100 text-red-700",
  task_blocked: "bg-yellow-100 text-yellow-800",
  task_done: "bg-emerald-100 text-emerald-800",
  logged: "bg-teal-100 text-teal-800",
  objective: "bg-indigo-100 text-indigo-800",
  eval: "bg-violet-100 text-violet-800",
};

const ACTIVITY_CHIP: Record<string, string> = {
  PLANNED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-green-100 text-green-800",
  COMPLETED: "bg-gray-200 text-gray-700",
  CANCELLED: "bg-red-100 text-red-700 line-through",
};

export const chipClass = (item: AgendaItem): string =>
  item.kind === "activity" ? (ACTIVITY_CHIP[item.status ?? "PLANNED"] ?? ACTIVITY_CHIP.PLANNED) : KIND_CHIP[item.kind];

const DAY = 86_400_000;
export const dayKey = (v: string | Date): string => (typeof v === "string" ? v : v.toISOString()).slice(0, 10);
export const dayMs = (k: string): number => Date.parse(`${k}T00:00:00Z`);
export const addDays = (k: string, n: number): string => new Date(dayMs(k) + n * DAY).toISOString().slice(0, 10);

/** Jour local (navigateur) AAAA-MM-JJ : « aujourd'hui » du stagiaire. */
export function localToday(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const isWeekend = (k: string): boolean => {
  const wd = new Date(dayMs(k)).getUTCDay();
  return wd === 0 || wd === 6;
};

/** Un élément tombe-t-il sur ce jour ? (gère les activités sur plusieurs jours) */
export const onDay = (item: AgendaItem, day: string): boolean => {
  const end = item.endDay ?? item.day;
  return day >= item.day && day <= end;
};

interface BuildInput {
  internship: InternshipMonitoring | null;
  journal: InternshipJournal | null;
  objectives: ObjectiveRow[];
  /** Activités déjà filtrées (celles du stagiaire ou celles de la page Activités) */
  activities: Item[];
  today: string;
}

/** Construit tous les éléments datés de l'agenda. */
export function buildAgenda({ internship, journal, objectives, activities, today }: BuildInput): AgendaItem[] {
  const out: AgendaItem[] = [];

  // --- Activités du projet (même pastilles et mêmes liens que le calendrier des activités) ---
  for (const a of activities) {
    if (!a.startDate && !a.endDate) continue;
    const start = dayKey(a.startDate ?? a.endDate);
    const end = dayKey(a.endDate ?? a.startDate);
    out.push({
      id: `act-${a.id}`,
      kind: "activity",
      day: start <= end ? start : end,
      endDay: start <= end ? end : start,
      title: String(a.title ?? "Activité"),
      lines: [a.project?.name ? `Projet : ${a.project.name}` : "", a.location ? `Lieu : ${a.location}` : ""].filter(Boolean),
      href: `/activities/${a.id}`,
      status: a.status,
    });
  }

  // --- Tâches du stage ---
  for (const t of internship?.taskList ?? []) {
    const meta = [`Avancement ${t.status === "COMPLETED" ? 100 : t.progress} %`, t.hasReport ? "Rapport remis" : "Sans rapport", t.hasEvidence ? "Preuve jointe" : "Sans preuve"];

    if (t.completedAt) {
      out.push({ id: `tdone-${t.id}`, kind: "task_done", day: dayKey(t.completedAt), title: t.title, lines: meta, href: "/presences" });
      continue;
    }
    if (!t.dueDate || t.status === "CANCELLED") continue;

    const due = dayKey(t.dueDate);
    const kind: AgendaKind = due < today ? "task_late" : t.status === "BLOCKED" ? "task_blocked" : "task_due";
    const lead =
      kind === "task_late"
        ? `Échéance dépassée de ${Math.round((dayMs(today) - dayMs(due)) / DAY)} jour(s)`
        : kind === "task_blocked"
          ? "Tâche bloquée : signalez-le à votre tuteur"
          : "À rendre ce jour";
    out.push({ id: `tdue-${t.id}`, kind, day: due, title: t.title, lines: [lead, ...meta], href: "/presences" });
  }

  // --- Objectifs individuels (échéance) ---
  for (const o of objectives) {
    if (!o.dueDate || o.status === "CANCELLED") continue;
    const target = o.targetValue !== null && o.targetValue !== undefined ? ` / cible ${o.targetValue}${o.unit ? ` ${o.unit}` : ""}` : "";
    out.push({
      id: `obj-${o.id}`,
      kind: "objective",
      day: dayKey(o.dueDate),
      title: o.title,
      lines: [`Atteint : ${o.currentValue ?? 0}${target}`, o.overdue ? "En retard" : o.progress === null ? "" : `${o.progress} % de l'objectif`].filter(Boolean),
      href: "/objectifs",
    });
  }

  // --- Évaluations ---
  for (const ev of internship?.evaluationList ?? []) {
    if (!ev.evaluatedAt) continue;
    out.push({
      id: `eval-${ev.id}`,
      kind: "eval",
      day: dayKey(ev.evaluatedAt),
      title: ev.title,
      lines: [`Note globale : ${ev.overallScore === null ? "—" : `${ev.overallScore.toFixed(1)}/20`}`],
    });
  }

  // --- Ce que le stagiaire a déclaré chaque jour à son départ (pointage GPS) ---
  for (const d of journal?.days ?? []) {
    for (const t of d.tasks ?? []) {
      out.push({
        id: `log-${d.id}-${t.id}`,
        kind: "logged",
        day: d.day,
        title: t.title,
        lines: [t.progress !== null ? `Avancement en fin de journée : ${t.progress} %` : "", t.completed ? "Terminée ce jour" : "", t.note ?? ""].filter(Boolean),
      });
    }
  }

  return out.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
}

/** Tâches encore ouvertes : à poursuivre « aujourd'hui » même sans échéance précise ce jour-là. */
export function openTasks(internship: InternshipMonitoring | null) {
  return (internship?.taskList ?? []).filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED");
}

/** Jours où une arrivée GPS a été pointée → pastille « présent » dans le calendrier. */
export function presentDaySet(internship: InternshipMonitoring | null, journal: InternshipJournal | null): Set<string> {
  const set = new Set<string>(internship?.presenceDays ?? []);
  for (const d of journal?.days ?? []) set.add(d.day);
  return set;
}
