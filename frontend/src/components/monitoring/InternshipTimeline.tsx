"use client";

import { useMemo, useState } from "react";
import { CalendarCheck, CheckCircle2, Flag, Star, X } from "lucide-react";
import { fmtDate, fmtPct } from "@/lib/monitoring";
import { TASK_STATUS_LABEL, type InternshipMonitoring } from "@/lib/internshipMonitoring";

/**
 * Chronologie du stage, façon « frise de match » :
 *  - en haut à gauche : « Début de stage » + date ; en haut à droite : « Fin de stage » + date ;
 *  - une ligne horizontale remplie selon le temps écoulé (pourcentage affiché) ;
 *  - tous les événements du stage posés sur la ligne à leur date (cartons jaune / rouge,
 *    tâches terminées, échéances, évaluations). Un clic ouvre le détail.
 * Composant AJOUTÉ : il lit uniquement les données déjà renvoyées par l'API de suivi.
 */

type Kind = "task_done" | "task_due" | "task_late" | "task_blocked" | "eval" | "absence" | "absence_long";

interface TimelineEvent {
  id: string;
  kind: Kind;
  /** AAAA-MM-JJ */
  day: string;
  title: string;
  lines: string[];
}

const DAY = 86_400_000;
const dayKey = (v: string | Date) => (typeof v === "string" ? v : v.toISOString()).slice(0, 10);
const dayMs = (k: string) => Date.parse(`${k}T00:00:00Z`);

const KIND_META: Record<Kind, { label: string; rank: number }> = {
  absence_long: { label: "Carton rouge — absences prolongées", rank: 4 },
  task_late: { label: "Carton rouge — tâche en retard", rank: 4 },
  absence: { label: "Carton jaune — absence", rank: 3 },
  task_blocked: { label: "Carton jaune — tâche bloquée", rank: 3 },
  eval: { label: "Évaluation", rank: 2 },
  task_done: { label: "Tâche terminée", rank: 2 },
  task_due: { label: "Échéance à venir", rank: 1 },
};

/** Construit tous les événements datés du stage à partir des données du suivi. */
function buildEvents(data: InternshipMonitoring, todayKey: string): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const today = dayMs(todayKey);

  for (const task of data.taskList ?? []) {
    const status = TASK_STATUS_LABEL[task.status] ?? task.status;
    const base = [
      `Statut : ${status} · avancement ${task.status === "COMPLETED" ? 100 : task.progress} %`,
      task.hasReport ? "Rapport remis" : "Sans rapport",
      task.hasEvidence ? "Preuve jointe" : "Sans preuve",
    ];

    if (task.completedAt) {
      const done = dayKey(task.completedAt);
      const lines = [...base];
      if (task.dueDate) {
        const late = Math.round((dayMs(done) - dayMs(dayKey(task.dueDate))) / DAY);
        lines.unshift(`Échéance prévue le ${fmtDate(task.dueDate)}${late > 0 ? ` · terminée avec ${late} jour(s) de retard` : ""}`);
      }
      events.push({ id: `done-${task.id}`, kind: "task_done", day: done, title: task.title, lines });
      continue;
    }

    if (!task.dueDate || task.status === "CANCELLED") continue;
    const due = dayKey(task.dueDate);
    const overdue = dayMs(due) < today && task.status !== "COMPLETED";

    if (overdue) {
      const days = Math.round((today - dayMs(due)) / DAY);
      events.push({
        id: `late-${task.id}`,
        kind: "task_late",
        day: due,
        title: task.title,
        lines: [`Échéance dépassée de ${days} jour(s)`, ...base],
      });
    } else if (task.status === "BLOCKED") {
      events.push({ id: `blocked-${task.id}`, kind: "task_blocked", day: due, title: task.title, lines: ["Tâche bloquée", ...base] });
    } else {
      events.push({ id: `due-${task.id}`, kind: "task_due", day: due, title: task.title, lines: [`Échéance le ${fmtDate(task.dueDate)}`, ...base] });
    }
  }

  for (const ev of data.evaluationList ?? []) {
    if (!ev.evaluatedAt) continue;
    const parts: string[] = [];
    const add = (label: string, v: number | null) => v !== null && parts.push(`${label} ${v}/20`);
    add("Technique", ev.technicalScore);
    add("Qualité", ev.qualityScore);
    add("Autonomie", ev.autonomyScore);
    add("Communication", ev.communicationScore);
    add("Ponctualité", ev.punctualityScore);
    events.push({
      id: `eval-${ev.id}`,
      kind: "eval",
      day: dayKey(ev.evaluatedAt),
      title: ev.title,
      lines: [`Note globale : ${ev.overallScore === null ? "—" : `${ev.overallScore.toFixed(1)}/20`}`, ...(parts.length ? [parts.join(" · ")] : [])],
    });
  }

  // Absences : seulement si le stagiaire utilise le pointage GPS (sinon on ne peut rien affirmer)
  if (data.presence.gpsCheckins > 0) {
    const present = new Set(data.presenceDays ?? []);
    const first = dayMs(dayKey(data.startDate));
    const lastDay = data.endDate ? Math.min(dayMs(dayKey(data.endDate)), today - DAY) : today - DAY;
    let run: string[] = [];
    const flush = () => {
      if (!run.length) return;
      const long = run.length >= 3;
      events.push({
        id: `abs-${run[0]}`,
        kind: long ? "absence_long" : "absence",
        day: run[0],
        title: long ? `${run.length} jours ouvrés d'absence` : run.length === 1 ? "Absence" : `${run.length} jours ouvrés d'absence`,
        lines: [run.length === 1 ? `Le ${fmtDate(run[0])} : aucune mission GPS lancée` : `Du ${fmtDate(run[0])} au ${fmtDate(run[run.length - 1])} : aucune mission GPS lancée`],
      });
      run = [];
    };
    for (let t = first; t <= lastDay; t += DAY) {
      const k = new Date(t).toISOString().slice(0, 10);
      const wd = new Date(t).getUTCDay();
      if (wd === 0 || wd === 6) continue; // le week-end ne casse pas une série d'absences
      if (present.has(k)) flush();
      else run.push(k);
    }
    flush();
  }

  return events.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
}

interface Marker {
  day: string;
  pos: number; // 0..100
  lane: 0 | 1 | 2;
  kind: Kind;
  events: TimelineEvent[];
  clamped: boolean;
}

function EventShape({ kind, count }: { kind: Kind; count: number }) {
  const badge =
    count > 1 ? (
      <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-800 px-1 text-[9px] font-bold text-white">
        {count}
      </span>
    ) : null;

  if (kind === "absence" || kind === "task_blocked")
    return (
      <span className="relative block h-6 w-4 -rotate-6 rounded-[3px] bg-yellow-400 shadow ring-1 ring-yellow-600/40">
        {badge}
      </span>
    );
  if (kind === "absence_long" || kind === "task_late")
    return (
      <span className="relative block h-6 w-4 rotate-6 rounded-[3px] bg-red-600 shadow ring-1 ring-red-800/40">
        {badge}
      </span>
    );
  const Icon = kind === "eval" ? Star : kind === "task_done" ? CheckCircle2 : Flag;
  const tone = kind === "eval" ? "bg-violet-600" : kind === "task_done" ? "bg-emerald-600" : "bg-slate-400";
  return (
    <span className={`relative flex h-6 w-6 items-center justify-center rounded-full text-white shadow ring-2 ring-white ${tone}`}>
      <Icon className="h-3.5 w-3.5" />
      {badge}
    </span>
  );
}

export function InternshipTimeline({ data }: { data: InternshipMonitoring }) {
  const [selected, setSelected] = useState<string | null>(null);

  const model = useMemo(() => {
    if (!data.startDate) return null;
    const startKey = dayKey(data.startDate);
    const todayKey = new Date().toISOString().slice(0, 10);
    const events = buildEvents(data, todayKey);

    const startMs = dayMs(startKey);
    let endMs = data.endDate ? dayMs(dayKey(data.endDate)) + DAY : null;
    if (endMs === null || endMs <= startMs) {
      // fin de stage non définie : la frise s'étend jusqu'au dernier événement / aujourd'hui
      const latest = Math.max(dayMs(todayKey), ...events.map((e) => dayMs(e.day)));
      endMs = latest + 7 * DAY;
    }
    const span = endMs - startMs;
    const posOf = (key: string) => Math.min(100, Math.max(0, ((dayMs(key) + DAY / 2 - startMs) / span) * 100));

    const rawElapsed = data.time.elapsedPct ?? ((Date.now() - startMs) / span) * 100;
    const elapsed = data.status === "COMPLETED" ? 100 : Math.min(100, Math.max(0, rawElapsed));

    // un marqueur par jour (les événements du même jour sont regroupés)
    const byDay = new Map<string, TimelineEvent[]>();
    events.forEach((e) => byDay.set(e.day, [...(byDay.get(e.day) ?? []), e]));

    const markers: Marker[] = [];
    const laneLast: number[] = [-100, -100, -100];
    [...byDay.entries()]
      .map(([day, list]) => ({ day, list, pos: posOf(day), outside: dayMs(day) < startMs || dayMs(day) >= endMs! }))
      .sort((a, b) => a.pos - b.pos)
      .forEach(({ day, list, pos, outside }) => {
        // voie 0 = sur la ligne, 1 = au-dessus, 2 = en dessous (évite que les marqueurs proches se chevauchent)
        let lane = laneLast.findIndex((last) => pos - last >= 4);
        if (lane === -1) lane = laneLast.indexOf(Math.min(...laneLast));
        laneLast[lane] = pos;
        const top = [...list].sort((a, b) => KIND_META[b.kind].rank - KIND_META[a.kind].rank)[0];
        markers.push({ day, pos, lane: lane as 0 | 1 | 2, kind: top.kind, events: list, clamped: outside });
      });

    return { startKey, endKey: data.endDate ? dayKey(data.endDate) : null, elapsed, markers, events, todayKey };
  }, [data]);

  if (!model) return null;

  const { markers, elapsed, events } = model;
  const picked = markers.find((m) => m.day === selected) ?? null;
  const yellow = events.filter((e) => e.kind === "absence" || e.kind === "task_blocked").length;
  const red = events.filter((e) => e.kind === "absence_long" || e.kind === "task_late").length;

  const fillTone =
    data.status === "CANCELLED" ? "bg-slate-400" : data.trend === "CRITICAL" ? "bg-red-500" : data.trend === "LATE" ? "bg-amber-500" : "bg-emerald-500";
  const LANE_Y = { 0: 0, 1: -34, 2: 34 } as const;
  const todayAlign = elapsed < 10 ? "translate-x-0" : elapsed > 90 ? "-translate-x-full" : "-translate-x-1/2";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5" aria-label="Chronologie du stage">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900">Chronologie du stage</h2>
          <p className="text-xs text-slate-500">Cliquez sur un événement de la ligne pour voir le détail</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">Avancement réel : {fmtPct(data.actualProgress)}</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">Temps écoulé : {fmtPct(elapsed)}</span>
          <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-yellow-800">🟨 {yellow}</span>
          <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-700">🟥 {red}</span>
        </div>
      </div>

      {/* Extrémités : début (gauche) / fin (droite), date en dessous */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Début de stage</p>
          <p className="text-sm font-semibold text-slate-900">{fmtDate(data.startDate)}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Fin de stage</p>
          <p className="text-sm font-semibold text-slate-900">{model.endKey ? fmtDate(data.endDate) : "Non définie"}</p>
        </div>
      </div>

      {/* Ligne horizontale */}
      <div className="px-3">
        <div className="relative h-32 select-none">
          {/* repère « aujourd'hui » / pourcentage */}
          <div className="absolute top-0 z-10" style={{ left: `${elapsed}%` }}>
            <span className={`block ${todayAlign} whitespace-nowrap rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white`}>
              {data.status === "COMPLETED" ? "Terminé" : "Aujourd’hui"} · {fmtPct(elapsed)}
            </span>
          </div>
          <div className="absolute bottom-0 top-5 w-px bg-slate-900/30" style={{ left: `${elapsed}%` }} aria-hidden />

          <div className="absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2 overflow-hidden rounded-full bg-slate-200">
            <div className={`h-full rounded-full ${fillTone} transition-all`} style={{ width: `${elapsed}%` }} />
          </div>

          {markers.map((m) => {
            const isOn = selected === m.day;
            const y = LANE_Y[m.lane];
            return (
              <div key={m.day} className="absolute top-1/2 z-20" style={{ left: `${m.pos}%` }}>
                {m.lane !== 0 && (
                  <span
                    aria-hidden
                    className="absolute left-0 w-px -translate-x-1/2 bg-slate-300"
                    style={{ top: y < 0 ? y + 14 : 0, height: 20 }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setSelected((cur) => (cur === m.day ? null : m.day))}
                  aria-pressed={isOn}
                  aria-label={`${fmtDate(m.day)} — ${m.events.map((e) => e.title).join(", ")}`}
                  title={`${fmtDate(m.day)} — ${m.events.map((e) => e.title).join(" · ")}`}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-md p-0.5 transition hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isOn ? "scale-125 ring-2 ring-blue-600" : ""
                  }`}
                  style={{ top: y }}
                >
                  <EventShape kind={m.kind} count={m.events.length} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Détail de l'événement sélectionné */}
      {picked && (
        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <div className="mb-2 flex items-start justify-between gap-3">
            <p className="flex items-center gap-1.5 font-semibold text-slate-900">
              <CalendarCheck className="h-4 w-4 text-slate-500" />
              {new Date(`${picked.day}T00:00:00Z`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
            </p>
            <button type="button" onClick={() => setSelected(null)} className="shrink-0 rounded-md p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-800" aria-label="Fermer le détail">
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="space-y-2">
            {picked.events.map((e) => (
              <li key={e.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                <p className="text-xs font-semibold text-slate-500">{KIND_META[e.kind].label}</p>
                <p className="font-semibold text-slate-900">{e.title}</p>
                {e.lines.map((l, i) => (
                  <p key={i} className="text-xs text-slate-600">{l}</p>
                ))}
              </li>
            ))}
          </ul>
          {picked.clamped && <p className="mt-2 text-[11px] text-slate-500">Cet événement est en dehors de la période prévue du stage.</p>}
        </div>
      )}

      {markers.length === 0 && <p className="mt-1 text-center text-xs text-slate-500">Aucun événement enregistré pour le moment.</p>}

      {/* Légende */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span className="flex items-center gap-1"><i className="h-3 w-2 rounded-[2px] bg-yellow-400" /> Absence / tâche bloquée</span>
        <span className="flex items-center gap-1"><i className="h-3 w-2 rounded-[2px] bg-red-600" /> 3 jours d’absence ou + / tâche en retard</span>
        <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> Tâche terminée</span>
        <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-violet-600" /> Évaluation</span>
        <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Échéance à venir</span>
      </div>
    </section>
  );
}
