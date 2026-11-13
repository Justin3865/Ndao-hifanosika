"use client";

import { useState } from "react";
import { Loader2, LogOut, Plus, Trash2 } from "lucide-react";

import api from "@/lib/axios";
import { errorMessage } from "@/lib/crud";
import type { PresenceState } from "@/lib/presence";
import { toast } from "@/lib/toast";

interface Line {
  taskId: string; // "" = nouvelle tâche
  title: string;
  note: string;
  progress: string;
  completed: boolean;
}

const emptyLine = (): Line => ({ taskId: "", title: "", note: "", progress: "", completed: false });
const inputClass = "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-blue-500";

function readPosition(): Promise<{ latitude: number; longitude: number; altitude: number | null; accuracy: number | null }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("La localisation n'est pas disponible sur cet appareil."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, altitude: p.coords.altitude, accuracy: p.coords.accuracy }),
      (err) => reject(new Error(err.code === 1 ? "Localisation refusée : autorisez la position dans le navigateur, puis réessayez." : "Position indisponible : activez le GPS et réessayez.")),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}

/**
 * Déclaration des tâches du jour + pointage du départ, directement depuis l'agenda.
 * Visible seulement une fois l'arrivée pointée (le serveur l'exige aussi : /presence/check-out).
 */
export function DayTasksForm({ state, onDone }: { state: PresenceState; onDone: () => void | Promise<void> }) {
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const forInternship = !!state.internship;
  const options: Array<{ id: number; title: string; progress: number }> = state.internship ? state.internship.tasks : state.activities;

  const setLine = (i: number, patch: Partial<Line>) => setLines((cur) => cur.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  const pickTask = (i: number, taskId: string) => {
    const t = options.find((o) => String(o.id) === taskId);
    setLine(i, { taskId, title: t ? t.title : "", progress: t ? String(t.progress) : "" });
  };

  const submit = async () => {
    setError("");
    const payload = lines.map((l) => ({
      internshipTaskId: forInternship && l.taskId ? Number(l.taskId) : undefined,
      activityId: !forInternship && l.taskId ? Number(l.taskId) : undefined,
      title: l.title.trim(),
      note: l.note.trim(),
      progress: l.progress === "" ? undefined : Number(l.progress),
      completed: l.completed,
    }));

    if (payload.some((l) => !l.internshipTaskId && !l.activityId && !l.title)) {
      setError("Chaque ligne doit désigner une tâche existante ou avoir un titre.");
      return;
    }
    if (payload.some((l) => l.progress !== undefined && (Number.isNaN(l.progress) || l.progress < 0 || l.progress > 100))) {
      setError("L'avancement d'une tâche doit être compris entre 0 et 100.");
      return;
    }

    setBusy(true);
    try {
      const fresh = await readPosition();
      await api.post("/presence/check-out", { ...fresh, tasks: payload, summary: summary.trim() || undefined });
      toast.success("Départ pointé : tâches du jour enregistrées.");
      setLines([emptyLine()]);
      setSummary("");
      await onDone();
    } catch (err) {
      setError(err instanceof Error && !("response" in err) ? err.message : errorMessage(err, "Pointage du départ impossible."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50/40 p-3">
      <p className="font-semibold text-slate-900">Tâches faites aujourd’hui (obligatoire avant de partir)</p>

      {lines.map((l, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-slate-200 bg-white p-2.5">
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_90px]">
            {options.length > 0 ? (
              <select value={l.taskId} onChange={(e) => pickTask(i, e.target.value)} className={inputClass} aria-label="Tâche">
                <option value="">{forInternship ? "Nouvelle tâche…" : "Autre tâche (hors activité)…"}</option>
                {options.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.progress} %)
                  </option>
                ))}
              </select>
            ) : (
              <span className="self-center text-slate-500">Tâche réalisée</span>
            )}
            <input value={l.title} readOnly={!!l.taskId} onChange={(e) => setLine(i, { title: e.target.value })} placeholder="Titre de la tâche" className={inputClass} />
            <input type="number" min={0} max={100} value={l.progress} onChange={(e) => setLine(i, { progress: e.target.value })} placeholder="% avancé" className={inputClass} />
          </div>
          <textarea value={l.note} onChange={(e) => setLine(i, { note: e.target.value })} rows={2} placeholder="Ce qui a été fait (compte rendu)" className={inputClass} />
          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-slate-700">
              <input type="checkbox" checked={l.completed} onChange={(e) => setLine(i, { completed: e.target.checked })} className="h-4 w-4" /> Tâche terminée
            </label>
            {lines.length > 1 && (
              <button type="button" onClick={() => setLines((cur) => cur.filter((_, k) => k !== i))} className="inline-flex items-center gap-1 text-red-600 hover:underline">
                <Trash2 className="h-3.5 w-3.5" /> Retirer
              </button>
            )}
          </div>
        </div>
      ))}

      <button type="button" onClick={() => setLines((cur) => [...cur, emptyLine()])} className="inline-flex items-center gap-1.5 font-medium text-blue-800 hover:underline">
        <Plus className="h-3.5 w-3.5" /> Ajouter une tâche
      </button>

      <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} placeholder="Bilan de la journée (facultatif)" className={inputClass} />

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</p>}

      <button type="button" onClick={() => void submit()} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-800 px-4 py-1.5 font-semibold text-white hover:bg-blue-900 disabled:opacity-60">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />} Pointer mon départ
      </button>
    </div>
  );
}
