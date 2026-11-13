"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarClock, ClipboardList, Paperclip } from "lucide-react";

import api from "@/lib/axios";
import { fmtDate, fmtPct } from "@/lib/monitoring";
import { fullName, INTERNSHIP_STATUS_LABEL, TASK_STATUS_LABEL, type InternshipTaskItem } from "@/lib/internshipMonitoring";
import { OBJECTIVE_LABEL, type ObjectiveRow } from "@/lib/gaps";
import { buildAgenda, localToday, presentDaySet } from "@/lib/internAgenda";
import { useMyInternship } from "@/hooks/useMyInternship";
import { Spinner } from "@/components/ui/Spinner";
import { InternshipTimeline } from "@/components/monitoring/InternshipTimeline";
import { InternAgenda } from "@/components/monitoring/InternAgenda";
import { EmptyState, Pill, Section, SeProgress, trendTone } from "@/components/monitoring/parts";

const taskTone: Record<InternshipTaskItem["status"], string> = {
  TODO: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  BLOCKED: "bg-red-100 text-red-700",
  CANCELLED: "bg-slate-200 text-slate-500",
};

/** Mes objectifs individuels : même API que la page Objectifs (le stagiaire ne met à jour que SA valeur atteinte). */
function MyObjectives({ rows, onSaved }: { rows: ObjectiveRow[]; onSaved: () => void }) {
  const [values, setValues] = useState<Record<number, string>>(() => Object.fromEntries(rows.map((o) => [o.id, o.currentValue === null ? "" : String(o.currentValue)])));
  const [busy, setBusy] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async (o: ObjectiveRow) => {
    const value = Number(values[o.id]);
    if (values[o.id] === "" || !Number.isFinite(value)) {
      setMsg({ ok: false, text: "Saisissez une valeur numérique." });
      return;
    }
    setBusy(o.id);
    setMsg(null);
    try {
      await api.patch(`/objectives/${o.id}/progress`, { currentValue: value });
      setMsg({ ok: true, text: "Progression enregistrée." });
      onSaved();
    } catch (e: any) {
      setMsg({ ok: false, text: e?.response?.data?.message ?? "Enregistrement impossible." });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Section id="mon-objectifs" title="Mes objectifs individuels" subtitle="Indicateur, cible et échéance fixés pour vous">
      {msg && <p className={`mb-3 rounded-lg px-3 py-2 text-xs ${msg.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
      {rows.length === 0 ? (
        <EmptyState>Aucun objectif individuel ne vous a encore été attribué.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {rows.map((o) => (
            <li key={o.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{o.title}</p>
                  <p className="text-xs text-slate-500">
                    {o.kpi ? `${o.kpi} · ` : ""}
                    {OBJECTIVE_LABEL[o.status]}
                    {o.dueDate ? ` · échéance ${fmtDate(o.dueDate)}` : ""}
                  </p>
                  {o.description && <p className="mt-1 text-sm text-slate-600">{o.description}</p>}
                </div>
                {o.overdue && <Pill className="bg-red-100 text-red-700">En retard</Pill>}
              </div>

              <div className="mt-2">
                <SeProgress
                  value={o.progress}
                  size="sm"
                  label={
                    o.targetValue !== null && o.targetValue !== undefined
                      ? `Cible : ${o.targetValue}${o.unit ? ` ${o.unit}` : ""}`
                      : "Pas de cible chiffrée"
                  }
                />
              </div>

              {o.status !== "CANCELLED" && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <input
                    type="number"
                    step="any"
                    value={values[o.id] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [o.id]: e.target.value }))}
                    placeholder="Valeur atteinte"
                    className="w-40 rounded-lg border border-slate-300 px-3 py-1.5"
                  />
                  <button
                    type="button"
                    disabled={busy === o.id}
                    onClick={() => save(o)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Mettre à jour
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-right text-xs">
        <Link href="/objectifs" className="font-semibold text-blue-700 underline">Ouvrir la page Objectifs</Link>
      </p>
    </Section>
  );
}

/**
 * « Mon avancement » : tout ce que le stagiaire voit sur SON stage —
 * frise de progression, agenda jour par jour (relié au calendrier des activités), tâches et objectifs individuels.
 * Lecture + actions déjà autorisées aux stagiaires ; aucune fonctionnalité existante n'est modifiée.
 */
export function MyInternshipSpace() {
  const { stages, stageId, setStageId, internship, journal, objectives, activities, loading, error, reload } = useMyInternship({ loadActivities: true });
  const today = useMemo(() => localToday(), []);

  const items = useMemo(
    () => buildAgenda({ internship, journal, objectives, activities, today }),
    [internship, journal, objectives, activities, today],
  );
  const present = useMemo(() => presentDaySet(internship, journal), [internship, journal]);

  if (loading && !internship)
    return <div className="flex items-center gap-2 text-slate-500"><Spinner /> Chargement de votre avancement…</div>;

  if (error && !internship)
    return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;

  if (!internship)
    return <EmptyState>Aucun stage n’est rattaché à votre compte pour le moment.</EmptyState>;

  const data = internship;
  const t = data.tasks;

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500">
              {data.project ? `${data.project.code} · ${data.project.name}` : "Sans projet"}
              {data.institution ? ` · ${data.institution}` : ""}
            </p>
            <h1 className="text-2xl font-bold text-slate-900">Mon avancement de stage</h1>
            <p className="text-sm text-slate-600">{data.title}</p>
            {data.theme && <p className="mt-1 text-sm font-semibold text-blue-800">Thème : « {data.theme} »</p>}
            <p className="mt-1 text-xs text-slate-500">Tuteur : {fullName(data.supervisor)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill className="bg-slate-100 text-slate-700">{INTERNSHIP_STATUS_LABEL[data.status]}</Pill>
            {stages.length > 1 && (
              <select
                value={stageId ?? ""}
                onChange={(e) => setStageId(Number(e.target.value))}
                aria-label="Choisir le stage"
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="mt-5">
          <SeProgress value={data.actualProgress} planned={data.plannedProgress} label="Avancement du stage" size="lg" tone={trendTone[data.trend].bar} />
          <div className="mt-3 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Prévu</p><p className="text-lg font-bold">{fmtPct(data.plannedProgress)}</p></div>
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Réel</p><p className="text-lg font-bold">{fmtPct(data.actualProgress)}</p></div>
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Tâches terminées</p><p className="text-lg font-bold">{t.completed}/{t.total}</p></div>
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Jours restants</p><p className="text-lg font-bold">{data.time.remainingDays ?? "—"}</p></div>
          </div>
          <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
            <CalendarClock className="h-3.5 w-3.5" /> {fmtDate(data.startDate)} → {fmtDate(data.endDate)}
          </p>
        </div>
      </header>

      <InternshipTimeline data={data} />

      <InternAgenda items={items} internship={data} journal={journal} presentDays={present} today={today} onChanged={reload} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Section id="mes-taches" title="Mes tâches" subtitle="Échéance, rapport et preuve">
          {!data.taskList?.length ? (
            <EmptyState>Aucune tâche assignée pour le moment.</EmptyState>
          ) : (
            <ul className="space-y-2">
              {data.taskList.map((task) => {
                const late = task.status !== "COMPLETED" && task.status !== "CANCELLED" && task.dueDate && task.dueDate.slice(0, 10) < today;
                return (
                  <li key={task.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">{task.title}</p>
                      <div className="flex items-center gap-1.5">
                        {late && <Pill className="bg-red-100 text-red-700">En retard</Pill>}
                        <Pill className={taskTone[task.status]}>{TASK_STATUS_LABEL[task.status]}</Pill>
                      </div>
                    </div>
                    <SeProgress value={task.status === "COMPLETED" ? 100 : task.progress} size="sm" />
                    <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>Échéance {fmtDate(task.dueDate)}</span>
                      {task.completedAt && <span>Terminée le {fmtDate(task.completedAt)}</span>}
                      <span className={`flex items-center gap-1 ${task.hasReport ? "text-emerald-600" : ""}`}><ClipboardList className="h-3 w-3" /> {task.hasReport ? "Rapport ✓" : "Sans rapport"}</span>
                      <span className={`flex items-center gap-1 ${task.hasEvidence ? "text-emerald-600" : ""}`}><Paperclip className="h-3 w-3" /> {task.hasEvidence ? "Preuve ✓" : "Sans preuve"}</span>
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-right text-xs">
            <Link href="/presences" className="font-semibold text-blue-700 underline">Déclarer mes tâches du jour (Présences)</Link>
          </p>
        </Section>

        {/* key : le formulaire se réinitialise quand les objectifs sont rechargés */}
        <MyObjectives key={objectives.map((o) => `${o.id}:${o.currentValue}`).join("|")} rows={objectives} onSaved={reload} />
      </div>
    </div>
  );
}
