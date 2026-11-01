"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import api from "@/lib/axios";
import { errorMessage, fmtDate, fmtDateTime, fmtMoney } from "@/lib/crud";
import { FeedbackForm } from "@/components/final-evaluation/FeedbackForm";
import { FeedbackKind, ProjectEvaluationDetail, fetchProjectEvaluation } from "@/lib/finalEvaluation";

export interface ProgressTarget {
  id: number;
  label: string;
}

interface Props {
  mode: "project" | "internship";
  options: ProgressTarget[];
  initialId?: number | null;
  onClose: () => void;
  /** Appelé après chaque enregistrement : la page recalcule les notes. */
  onSaved: () => void;
}

interface ActivityRow {
  id: number;
  title: string;
  progress: number;
  status: string;
  updatedAt?: string | null;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  budget?: number | string | null;
}

const EMPTY_ACTIVITY = { title: "", progress: "0", location: "", startDate: "", endDate: "", budget: "", description: "" };
interface TaskRow { id: number; title: string; status: string; progress: number; updatedAt?: string | null }
interface EvalRow { id: number; title: string; overallScore: number | null }

const input =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600";
const label = "mb-1 block text-xs font-semibold text-gray-600";
const btn =
  "inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50";
const box = "rounded-xl border border-gray-200 p-4";

const TASK_STATUS: Record<string, string> = {
  TODO: "À faire",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  BLOCKED: "Bloquée",
  CANCELLED: "Annulée",
};

export function ProgressModal({ mode, options, initialId, onClose, onSaved }: Props) {
  const [id, setId] = useState<number | "">(initialId ?? options[0]?.id ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [detail, setDetail] = useState<ProjectEvaluationDetail | null>(null);
  const [adding, setAdding] = useState<FeedbackKind | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [act, setAct] = useState(EMPTY_ACTIVITY);

  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [taskDrafts, setTaskDrafts] = useState<Record<number, { progress: string; status: string }>>({});
  const [evals, setEvals] = useState<EvalRow[]>([]);
  const [presenceDays, setPresenceDays] = useState<string[]>([]);
  const [pres, setPres] = useState({ from: "", to: "" });
  // durée prévue : "2" (L3), "6" (M2) ou "other" (saisie libre en mois)
  const [durKind, setDurKind] = useState<"2" | "6" | "other">("2");
  const [durOther, setDurOther] = useState("1");
  const [task, setTask] = useState({ title: "", status: "IN_PROGRESS", progress: "0", dueDate: "", report: "" });
  const [ev, setEv] = useState({
    title: "Évaluation finale",
    technicalScore: "",
    qualityScore: "",
    autonomyScore: "",
    punctualityScore: "",
    communicationScore: "",
  });

  const load = useCallback(async () => {
    if (id === "") return;
    try {
      if (mode === "project") {
        const res = await api.get(`/manual-progress/projects/${id}/activities`);
        const rows: ActivityRow[] = res.data?.activities ?? [];
        setActivities(rows);
        setDrafts(Object.fromEntries(rows.map((r) => [r.id, String(r.progress)])));
        // satisfaction (partenaires / bénéficiaires) : ne bloque pas le reste si indisponible
        try {
          setDetail(await fetchProjectEvaluation(id));
        } catch {
          setDetail(null);
        }
      } else {
        const res = await api.get(`/manual-progress/internships/${id}`);
        const rows: TaskRow[] = res.data?.tasks ?? [];
        setTasks(rows);
        setTaskDrafts(Object.fromEntries(rows.map((r) => [r.id, { progress: String(r.progress), status: r.status }])));
        setEvals(res.data?.evaluations ?? []);
        setPresenceDays(res.data?.presenceDays ?? []);
        const months: number = res.data?.durationMonths ?? res.data?.defaultMonths ?? 2;
        if (months === 2) setDurKind("2");
        else if (months === 6) setDurKind("6");
        else {
          setDurKind("other");
          setDurOther(String(months));
        }
      }
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e, "Chargement impossible.") });
    }
  }, [id, mode]);

  useEffect(() => {
    setMsg(null);
    setAdding(null);
    load();
  }, [load]);

  async function run(fn: () => Promise<{ data?: { message?: string } }>, after?: () => void) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fn();
      setMsg({ ok: true, text: res.data?.message ?? "Enregistré." });
      after?.();
      await load();
      onSaved();
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e, "Enregistrement impossible.") });
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "project" ? "Ajouter avancement projet" : "Ajouter avancement stage";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="my-8 w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-lg p-1 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className={label}>{mode === "project" ? "Projet" : "Stage"}</label>
        <select className={`${input} mb-4`} value={id} onChange={(e) => setId(Number(e.target.value))}>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>

        {msg && (
          <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${msg.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500" : "border-red-300 bg-red-50 text-red-700"}`}>
            {msg.text}
          </div>
        )}

        {/* ------------------------- PROJET ------------------------- */}
        {mode === "project" && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              La « Réalisation » de la note finale est calculée à partir de l&apos;avancement des activités du projet.
            </p>

            <div className={box}>
              <p className="mb-2 text-sm font-semibold text-gray-900">Activités existantes</p>
              {activities.length === 0 && <p className="text-sm text-gray-500">Aucune activité pour ce projet.</p>}
              {activities.map((a) => (
                <div key={a.id} className="mb-2">
                  <div className="flex items-center gap-2">
                  <span className="flex-1 truncate text-sm text-gray-800">{a.title}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className={`${input} !w-24`}
                    value={drafts[a.id] ?? ""}
                    onChange={(e) => setDrafts({ ...drafts, [a.id]: e.target.value })}
                  />
                  <span className="text-xs text-gray-500">%</span>
                  <button
                    type="button"
                    disabled={busy}
                    className={btn}
                    onClick={() => run(() => api.patch(`/monitoring/activities/${a.id}/progress`, { progress: Number(drafts[a.id]) }))}
                  >
                    OK
                  </button>
                  </div>
                  {(a.location || a.startDate || a.endDate || a.budget) && (
                    <p className="mt-0.5 text-[11px] text-gray-500">
                      {a.location ? `Lieu : ${a.location} · ` : ""}
                      {a.startDate || a.endDate ? `Période : ${fmtDate(a.startDate)} → ${fmtDate(a.endDate)} · ` : ""}
                      {a.budget ? `Budget : ${fmtMoney(a.budget)}` : ""}
                    </p>
                  )}
                  {a.updatedAt && <p className="mt-0.5 text-[11px] text-gray-500">Mis à jour le {fmtDateTime(a.updatedAt)}</p>}
                </div>
              ))}
            </div>

            <div className={box}>
              <p className="mb-2 text-sm font-semibold text-gray-900">Nouvelle activité</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className={label}>Titre *</label>
                  <input className={input} value={act.title} onChange={(e) => setAct({ ...act, title: e.target.value })} placeholder="Distribution de kits" />
                </div>
                <div>
                  <label className={label}>Avancement (%)</label>
                  <input type="number" min={0} max={100} className={input} value={act.progress} onChange={(e) => setAct({ ...act, progress: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className={label}>Lieu</label>
                  <input className={input} value={act.location} onChange={(e) => setAct({ ...act, location: e.target.value })} placeholder="Fianarantsoa" />
                </div>
                <div>
                  <label className={label}>Budget (Ar)</label>
                  <input type="number" min={0} className={input} value={act.budget} onChange={(e) => setAct({ ...act, budget: e.target.value })} />
                </div>
                <div>
                  <label className={label}>Date de début</label>
                  <input type="date" className={input} value={act.startDate} onChange={(e) => setAct({ ...act, startDate: e.target.value })} />
                </div>
                <div>
                  <label className={label}>Date de fin</label>
                  <input type="date" className={input} min={act.startDate || undefined} value={act.endDate} onChange={(e) => setAct({ ...act, endDate: e.target.value })} />
                </div>
                <div className="sm:col-span-3">
                  <label className={label}>Description</label>
                  <input className={input} value={act.description} onChange={(e) => setAct({ ...act, description: e.target.value })} placeholder="Objectif ou détails de l'activité" />
                </div>
              </div>
              <button
                type="button"
                disabled={busy || id === ""}
                className={`${btn} mt-3`}
                onClick={() =>
                  run(
                    () =>
                      api.post(`/manual-progress/projects/${id}/activities`, {
                        title: act.title,
                        progress: Number(act.progress),
                        location: act.location,
                        startDate: act.startDate || undefined,
                        endDate: act.endDate || undefined,
                        budget: act.budget === "" ? undefined : Number(act.budget),
                        description: act.description,
                      }),
                    () => setAct(EMPTY_ACTIVITY),
                  )
                }
              >
                <Plus className="h-4 w-4" /> Ajouter l&apos;activité
              </button>
            </div>
            <div className={box}>
              <p className="mb-2 text-sm font-semibold text-gray-900">Satisfaction (partenaires et bénéficiaires)</p>
              {detail ? (
                <>
                  <p className="mb-3 text-xs text-gray-500">
                    Partenaires : {detail.satisfaction.partners.count > 0 ? `${detail.satisfaction.partners.average}/5 (${detail.satisfaction.partners.count} avis)` : "aucun avis"} ·
                    Bénéficiaires :{" "}
                    {detail.satisfaction.beneficiaries.count > 0 ? `${detail.satisfaction.beneficiaries.average}/5 (${detail.satisfaction.beneficiaries.count} avis)` : "aucun avis"}
                  </p>

                  {adding ? (
                    <FeedbackForm
                      projectId={detail.projectId}
                      kind={adding}
                      criteria={detail.criteria[adding]}
                      partners={detail.partners}
                      beneficiaries={detail.beneficiaries}
                      onCancel={() => setAdding(null)}
                      onSaved={() => {
                        setAdding(null);
                        setMsg({ ok: true, text: "Avis enregistré : la note du projet est recalculée." });
                        void load();
                        onSaved();
                      }}
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={btn} onClick={() => setAdding("PARTNER")} disabled={detail.partners.length === 0}>
                        <Plus className="h-4 w-4" /> Avis d&apos;un partenaire
                      </button>
                      <button type="button" className={btn} onClick={() => setAdding("BENEFICIARY")}>
                        <Plus className="h-4 w-4" /> Avis d&apos;un bénéficiaire
                      </button>
                    </div>
                  )}
                  {detail.partners.length === 0 && !adding && (
                    <p className="mt-2 text-xs text-amber-600">Aucun partenaire rattaché à ce projet : ajoutez-en depuis la fiche du projet pour recueillir leur avis.</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">Satisfaction indisponible pour ce projet.</p>
              )}
            </div>
          </div>
        )}

        {/* ------------------------- STAGE ------------------------- */}
        {mode === "internship" && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              Les tâches alimentent l&apos;avancement et l&apos;achèvement ; les évaluations du tuteur alimentent la note.
            </p>

            <div className={box}>
              <p className="mb-2 text-sm font-semibold text-gray-900">
                Tâches existantes ({tasks.length})
              </p>
              {tasks.length === 0 && <p className="text-sm text-gray-500">Aucune tâche pour ce stage.</p>}
              {tasks.map((t) => {
                const d = taskDrafts[t.id] ?? { progress: String(t.progress), status: t.status };
                return (
                  <div key={t.id} className="mb-2">
                    <div className="flex items-center gap-2">
                    <span className="flex-1 truncate text-sm text-gray-800">{t.title}</span>
                    <select
                      className={`${input} !w-32`}
                      value={d.status}
                      onChange={(e) => setTaskDrafts({ ...taskDrafts, [t.id]: { ...d, status: e.target.value } })}
                    >
                      {Object.entries(TASK_STATUS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className={`${input} !w-24`}
                      value={d.progress}
                      onChange={(e) => setTaskDrafts({ ...taskDrafts, [t.id]: { ...d, progress: e.target.value } })}
                    />
                    <span className="text-xs text-gray-500">%</span>
                    <button
                      type="button"
                      disabled={busy}
                      className={btn}
                      onClick={() =>
                        run(() =>
                          api.patch(`/manual-progress/internships/${id}/tasks/${t.id}`, {
                            status: d.status,
                            progress: Number(d.progress),
                          }),
                        )
                      }
                    >
                      OK
                    </button>
                    </div>
                    {t.updatedAt && <p className="mt-0.5 text-[11px] text-gray-500">Mis à jour le {fmtDateTime(t.updatedAt)}</p>}
                  </div>
                );
              })}
              <p className="mb-2 mt-4 text-sm font-semibold text-gray-900">Nouvelle tâche</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-3">
                  <label className={label}>Titre de la tâche *</label>
                  <input className={input} value={task.title} onChange={(e) => setTask({ ...task, title: e.target.value })} placeholder="Rapport mensuel d'activités" />
                </div>
                <div>
                  <label className={label}>Statut</label>
                  <select className={input} value={task.status} onChange={(e) => setTask({ ...task, status: e.target.value })}>
                    {Object.entries(TASK_STATUS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={label}>Avancement (%)</label>
                  <input type="number" min={0} max={100} className={input} value={task.progress} onChange={(e) => setTask({ ...task, progress: e.target.value })} />
                </div>
                <div>
                  <label className={label}>Échéance</label>
                  <input type="date" className={input} value={task.dueDate} onChange={(e) => setTask({ ...task, dueDate: e.target.value })} />
                </div>
                <div className="sm:col-span-3">
                  <label className={label}>Rapport (texte)</label>
                  <input className={input} value={task.report} onChange={(e) => setTask({ ...task, report: e.target.value })} placeholder="Résumé du travail réalisé" />
                </div>
              </div>
              <button
                type="button"
                disabled={busy || id === ""}
                className={`${btn} mt-3`}
                onClick={() =>
                  run(
                    () => api.post(`/manual-progress/internships/${id}/tasks`, { ...task, progress: Number(task.progress) }),
                    () => setTask({ title: "", status: "IN_PROGRESS", progress: "0", dueDate: "", report: "" }),
                  )
                }
              >
                <Plus className="h-4 w-4" /> Ajouter la tâche
              </button>
            </div>

            <div className={box}>
              <p className="mb-2 text-sm font-semibold text-gray-900">
                Présence ({presenceDays.length} jour(s) enregistré(s))
              </p>
              <p className="mb-2 text-xs text-gray-500">
                Présence = jours présents ÷ jours ouvrés de la durée du stage. Indiquez un jour, ou une période (week-ends ignorés).
              </p>
              <label className={label}>Durée du stage</label>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="inline-flex overflow-hidden rounded-lg border border-gray-300">
                  {(
                    [
                      ["2", "L3 — 2 mois"],
                      ["6", "M2 — 6 mois"],
                      ["other", "Autre"],
                    ] as const
                  ).map(([value, text]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDurKind(value)}
                      className={`px-3 py-2 text-sm font-medium ${durKind === value ? "bg-blue-700 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                    >
                      {text}
                    </button>
                  ))}
                </div>
                {durKind === "other" && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={36}
                      aria-label="Durée en mois"
                      className={`${input} !w-20`}
                      value={durOther}
                      onChange={(e) => setDurOther(e.target.value)}
                    />
                    <span className="text-xs text-gray-500">mois</span>
                  </div>
                )}
                <button
                  type="button"
                  disabled={busy || id === ""}
                  className={btn}
                  onClick={() =>
                    run(() =>
                      api.put(`/manual-progress/internships/${id}/duration`, {
                        months: durKind === "other" ? Number(durOther) : Number(durKind),
                      }),
                    )
                  }
                >
                  Enregistrer la durée
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className={label}>Du *</label>
                  <input type="date" className={input} value={pres.from} onChange={(e) => setPres({ ...pres, from: e.target.value })} />
                </div>
                <div>
                  <label className={label}>Au (facultatif)</label>
                  <input type="date" className={input} value={pres.to} onChange={(e) => setPres({ ...pres, to: e.target.value })} />
                </div>
              </div>
              <button
                type="button"
                disabled={busy || id === "" || !pres.from}
                className={`${btn} mt-3`}
                onClick={() =>
                  run(
                    () => api.post(`/manual-progress/internships/${id}/presence`, { from: pres.from, to: pres.to || pres.from }),
                    () => setPres({ from: "", to: "" }),
                  )
                }
              >
                <Plus className="h-4 w-4" /> Ajouter la présence
              </button>
            </div>

            <div className={box}>
              <p className="mb-2 text-sm font-semibold text-gray-900">
                Évaluation du tuteur (notes /20) ({evals.length})
              </p>
              {evals.map((e) => (
                <p key={e.id} className="text-xs text-gray-600">
                  {e.title} · {e.overallScore ?? "—"}/20
                </p>
              ))}
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-3">
                  <label className={label}>Titre</label>
                  <input className={input} value={ev.title} onChange={(e) => setEv({ ...ev, title: e.target.value })} />
                </div>
                {(
                  [
                    ["technicalScore", "Technique (/20)"],
                    ["qualityScore", "Qualité (/20)"],
                    ["autonomyScore", "Autonomie (/20)"],
                    ["punctualityScore", "Ponctualité (/20)"],
                    ["communicationScore", "Communication (/20)"],
                  ] as const
                ).map(([key, text]) => (
                  <div key={key}>
                    <label className={label}>{text}</label>
                    <input type="number" min={0} max={20} step="0.5" className={input} value={ev[key]} onChange={(e) => setEv({ ...ev, [key]: e.target.value })} />
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">La note globale est la moyenne des critères renseignés.</p>
              <button
                type="button"
                disabled={busy || id === ""}
                className={`${btn} mt-3`}
                onClick={() =>
                  run(
                    () => api.post(`/manual-progress/internships/${id}/evaluations`, ev),
                    () => setEv({ ...ev, technicalScore: "", qualityScore: "", autonomyScore: "", punctualityScore: "", communicationScore: "" }),
                  )
                }
              >
                <Plus className="h-4 w-4" /> Ajouter l&apos;évaluation
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
