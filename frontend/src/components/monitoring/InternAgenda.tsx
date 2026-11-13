"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarCheck, CheckCircle2, ChevronLeft, ChevronRight, X } from "lucide-react";

import type { InternshipMonitoring } from "@/lib/internshipMonitoring";
import { TASK_STATUS_LABEL } from "@/lib/internshipMonitoring";
import {
  KIND_LABEL,
  chipClass,
  isWeekend,
  onDay,
  openTasks,
  type AgendaItem,
} from "@/lib/internAgenda";
import { fmtDay, type InternshipJournal } from "@/lib/presence";
import { DayPresence } from "@/components/monitoring/DayPresence";

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

/** Éléments qui restent « à faire » (le reste est du réalisé / de l'information). */
const isTodo = (i: AgendaItem) =>
  i.kind === "task_due" ||
  i.kind === "task_late" ||
  i.kind === "task_blocked" ||
  i.kind === "objective" ||
  (i.kind === "activity" && i.status !== "COMPLETED" && i.status !== "CANCELLED");

interface Props {
  items: AgendaItem[];
  internship: InternshipMonitoring | null;
  journal: InternshipJournal | null;
  presentDays: Set<string>;
  today: string;
  /** Texte d'aide sous le titre (facultatif) */
  subtitle?: string;
  /** Appelé après un pointage pour recharger les données (facultatif) */
  onChanged?: () => void;
}

/**
 * Calendrier du stagiaire : chaque jour montre ses activités, tâches, objectifs et ce qu'il a déclaré.
 * Un clic sur un jour ouvre « Ce jour-là » avec ce qu'il faut faire et des liens pour agir.
 */
export function InternAgenda({ items, internship, journal, presentDays, today, subtitle, onChanged }: Props) {
  const [cursor, setCursor] = useState(() => {
    const y = Number(today.slice(0, 4));
    const m = Number(today.slice(5, 7)) - 1;
    return new Date(y, m, 1);
  });
  const [selected, setSelected] = useState<string>(today);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7; // semaine commençant le lundi
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Math.ceil((offset + days) / 7) * 7;

  const journalByDay = useMemo(() => new Map((journal?.days ?? []).map((d) => [d.day, d])), [journal]);
  const gpsActive = (internship?.presence.gpsCheckins ?? 0) > 0 || (journal?.totals.daysPresent ?? 0) > 0;
  const startKey = internship?.startDate ? internship.startDate.slice(0, 10) : null;
  const endKey = internship?.endDate ? internship.endDate.slice(0, 10) : null;

  const forDay = (key: string) => items.filter((i) => onDay(i, key));

  // ---- panneau « ce jour-là » ----
  const dayItems = forDay(selected);
  // Aujourd'hui, les tâches ne s'affichent (et ne se déclarent) qu'une fois l'arrivée pointée
  const present = presentDays.has(selected);
  const tasksLocked = selected === today && !present && !isWeekend(selected);
  const isTaskKind = (i: AgendaItem) => i.kind === "task_due" || i.kind === "task_late" || i.kind === "task_blocked";
  const hiddenTasks = tasksLocked ? dayItems.filter(isTaskKind).length : 0;
  const todo = dayItems.filter(isTodo).filter((i) => !(tasksLocked && isTaskKind(i)));
  const done = dayItems.filter((i) => !isTodo(i));
  const jDay = journalByDay.get(selected);
  const inPeriod = (!startKey || selected >= startKey) && (!endKey || selected <= endKey);
  const dueIds = new Set(dayItems.filter((i) => i.id.startsWith("tdue-")).map((i) => i.id.replace("tdue-", "")));
  const ongoing = selected === today && !tasksLocked ? openTasks(internship).filter((t) => !dueIds.has(String(t.id))) : [];
  const label = new Date(`${selected}T00:00:00Z`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  const go = (delta: number) => setCursor(new Date(year, month + delta, 1));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5" aria-label="Mon agenda de stage">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900">Mon agenda — ce que je dois faire chaque jour</h2>
          <p className="text-xs text-slate-500">{subtitle ?? "Cliquez sur un jour pour voir le détail : tâches, activités, objectifs et pointage."}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            const y = Number(today.slice(0, 4));
            const m = Number(today.slice(5, 7)) - 1;
            setCursor(new Date(y, m, 1));
            setSelected(today);
          }}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Aujourd’hui
        </button>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <button type="button" className="rounded-lg border border-slate-300 p-2 hover:bg-slate-50" onClick={() => go(-1)} aria-label="Mois précédent">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="font-semibold text-slate-900">
          {MONTHS[month]} {year}
        </p>
        <button type="button" className="rounded-lg border border-slate-300 p-2 hover:bg-slate-50" onClick={() => go(1)} aria-label="Mois suivant">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase text-slate-500">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: cells }, (_, index) => {
              const day = index - offset + 1;
              const valid = day >= 1 && day <= days;
              if (!valid) return <div key={index} className="min-h-[84px]" />;

              const key = keyOf(year, month, day);
              const list = forDay(key);
              const isToday = key === today;
              const isSel = key === selected;
              const here = presentDays.has(key);
              const outside = (startKey && key < startKey) || (endKey && key > endKey);

              return (
                <button
                  type="button"
                  key={index}
                  onClick={() => setSelected(key)}
                  aria-pressed={isSel}
                  aria-label={`${fmtDay(key)} — ${list.length} élément(s)`}
                  className={`min-h-[84px] rounded-lg border p-1 text-left text-xs transition hover:border-blue-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isSel ? "border-blue-600 bg-blue-50/50" : "border-slate-200"
                  } ${isToday ? "ring-2 ring-blue-400" : ""} ${outside ? "bg-slate-50/70" : ""}`}
                >
                  <span className="mb-1 flex items-center justify-between font-medium text-slate-500">
                    {here ? <i className="h-2 w-2 rounded-full bg-emerald-500" title="Présent (pointage GPS)" /> : <i />}
                    <span>{day}</span>
                  </span>
                  <span className="block space-y-1">
                    {list.slice(0, 3).map((item) => (
                      <span key={item.id} title={`${KIND_LABEL[item.kind]} — ${item.title}`} className={`block truncate rounded px-1.5 py-0.5 ${chipClass(item)}`}>
                        {item.title}
                      </span>
                    ))}
                    {list.length > 3 && <span className="block px-1 text-slate-500">+{list.length - 3} autre(s)</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Légende */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-emerald-500" /> Présent (GPS)</span>
        <span className="flex items-center gap-1"><i className="h-2.5 w-3 rounded bg-blue-200" /> Activité</span>
        <span className="flex items-center gap-1"><i className="h-2.5 w-3 rounded bg-slate-300" /> Tâche à rendre</span>
        <span className="flex items-center gap-1"><i className="h-2.5 w-3 rounded bg-red-200" /> En retard</span>
        <span className="flex items-center gap-1"><i className="h-2.5 w-3 rounded bg-emerald-200" /> Terminée</span>
        <span className="flex items-center gap-1"><i className="h-2.5 w-3 rounded bg-teal-200" /> Déclaré à mon départ</span>
        <span className="flex items-center gap-1"><i className="h-2.5 w-3 rounded bg-indigo-200" /> Objectif</span>
        <span className="flex items-center gap-1"><i className="h-2.5 w-3 rounded bg-violet-200" /> Évaluation</span>
      </div>

      {/* Détail du jour sélectionné */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
        <div className="mb-2 flex items-start justify-between gap-3">
          <p className="flex items-center gap-1.5 font-semibold capitalize text-slate-900">
            <CalendarCheck className="h-4 w-4 text-slate-500" />
            {label}
            {selected === today && <span className="ml-1 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold normal-case text-white">Aujourd’hui</span>}
          </p>
          {selected !== today && (
            <button type="button" onClick={() => setSelected(today)} className="shrink-0 rounded-md p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-800" aria-label="Revenir à aujourd’hui">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Présence du jour : position par rapport à l'ONG, distance, 1 présent / 0 absent */}
        <DayPresence
          day={selected}
          today={today}
          recorded={jDay}
          missed={!present && !isWeekend(selected) && selected < today && gpsActive && inPeriod}
          weekend={isWeekend(selected)}
          onChanged={onChanged}
        />

        {tasksLocked && (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
            Pointez votre arrivée (1 · Présent) pour afficher et déclarer vos tâches du jour{hiddenTasks > 0 ? ` (${hiddenTasks} tâche(s) à rendre masquée(s))` : ""}.
          </p>
        )}

        {todo.length === 0 && ongoing.length === 0 && done.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-3 text-center text-xs text-slate-500">Rien de prévu ni d’enregistré ce jour-là.</p>
        )}

        {(todo.length > 0 || ongoing.length > 0) && (
          <div className="mb-3">
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">À faire</p>
            <ul className="space-y-2">
              {todo.map((i) => (
                <Row key={i.id} item={i} />
              ))}
              {ongoing.map((t) => (
                <li key={`ongoing-${t.id}`} className="rounded-lg border border-slate-200 bg-white p-2.5">
                  <p className={`text-xs font-semibold ${t.dueDate && t.dueDate.slice(0, 10) < today ? "text-red-600" : "text-slate-500"}`}>
                    {t.dueDate && t.dueDate.slice(0, 10) < today ? "Tâche en retard — à terminer" : "Tâche à poursuivre"}
                  </p>
                  <p className="font-semibold text-slate-900">{t.title}</p>
                  <p className="text-xs text-slate-600">
                    {TASK_STATUS_LABEL[t.status]} · avancement {t.progress} %{t.dueDate ? ` · échéance ${fmtDay(t.dueDate.slice(0, 10))}` : ""}
                  </p>
                  <Link href="/presences" className="mt-1 inline-block text-xs font-semibold text-blue-700 underline">Déclarer l’avancement</Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {done.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">Réalisé / enregistré</p>
            <ul className="space-y-2">
              {done.map((i) => (
                <Row key={i.id} item={i} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function Row({ item }: { item: AgendaItem }) {
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-2.5">
      <p className="flex items-center gap-1 text-xs font-semibold text-slate-500">
        {item.kind === "task_done" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
        {KIND_LABEL[item.kind]}
        {item.endDay && item.endDay !== item.day ? ` · du ${fmtDay(item.day)} au ${fmtDay(item.endDay)}` : ""}
      </p>
      <p className="font-semibold text-slate-900">{item.title}</p>
      {item.lines.map((l, idx) => (
        <p key={idx} className="text-xs text-slate-600">{l}</p>
      ))}
      {item.href && (
        <Link href={item.href} className="mt-1 inline-block text-xs font-semibold text-blue-700 underline">
          {item.kind === "activity" ? "Ouvrir l’activité" : item.kind === "objective" ? "Voir mes objectifs" : "Déclarer / voir"}
        </Link>
      )}
    </li>
  );
}
