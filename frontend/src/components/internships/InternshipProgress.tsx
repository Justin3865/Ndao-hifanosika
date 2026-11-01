"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, ClipboardList, Star } from "lucide-react";
import api from "@/lib/axios";
import { fmtDate, fmtDateTime } from "@/lib/crud";

interface TaskRow {
  id: number;
  title: string;
  status: string;
  progress: number;
  dueDate?: string | null;
  report?: string | null;
  updatedAt?: string | null;
}
interface EvalRow {
  id: number;
  title: string;
  overallScore: number | null;
  evaluatedAt?: string | null;
}
interface Data {
  tasks: TaskRow[];
  evaluations: EvalRow[];
  presenceDays: string[];
  durationMonths: number | null;
  defaultMonths: number;
}

const TASK_STATUS: Record<string, { label: string; tone: string }> = {
  TODO: { label: "À faire", tone: "bg-gray-100 text-gray-700" },
  IN_PROGRESS: { label: "En cours", tone: "bg-blue-100 text-blue-700" },
  COMPLETED: { label: "Terminée", tone: "bg-green-100 text-green-700" },
  BLOCKED: { label: "Bloquée", tone: "bg-red-100 text-red-700" },
  CANCELLED: { label: "Annulée", tone: "bg-orange-100 text-orange-800" },
};

const card = "rounded-2xl border border-gray-200 bg-white p-6 shadow-sm";
const th = "px-3 py-2 font-semibold";

/**
 * Suivi du stage dans la fiche du stage : tâches, présence et évaluations du tuteur
 * (ce qui est saisi dans « Ajouter avancement stage »).
 * Composant AJOUTÉ : ne modifie aucun écran existant ; masqué si l'API refuse l'accès.
 */
export function InternshipProgress({ internshipId }: { internshipId: number | string }) {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    let alive = true;

    api
      .get(`/manual-progress/internships/${internshipId}`)
      .then((res) => {
        if (!alive) return;
        setData({
          tasks: res.data?.tasks ?? [],
          evaluations: res.data?.evaluations ?? [],
          presenceDays: res.data?.presenceDays ?? [],
          durationMonths: res.data?.durationMonths ?? null,
          defaultMonths: res.data?.defaultMonths ?? 2,
        });
      })
      .catch(() => alive && setData(null));

    return () => {
      alive = false;
    };
  }, [internshipId]);

  if (!data) return null;

  const done = data.tasks.filter((t) => t.status === "COMPLETED").length;
  const months = data.durationMonths ?? data.defaultMonths;
  const scores = data.evaluations.map((e) => e.overallScore).filter((v): v is number => typeof v === "number");
  const average = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 : null;

  return (
    <div className="mt-6 space-y-6">
      <section className={card}>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
          <ClipboardList className="h-5 w-5 text-blue-600" /> Tâches du stage ({done}/{data.tasks.length} terminée(s))
        </h2>

        {data.tasks.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune tâche pour ce stage.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-gray-500">
                <tr>
                  <th className={th}>Tâche</th>
                  <th className={th}>Statut</th>
                  <th className={th}>Avancement</th>
                  <th className={th}>Échéance</th>
                  <th className={th}>Rapport</th>
                  <th className={th}>Mise à jour</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.tasks.map((t) => {
                  const status = TASK_STATUS[t.status] ?? { label: t.status, tone: "bg-gray-100 text-gray-700" };
                  return (
                    <tr key={t.id}>
                      <td className="px-3 py-2 font-medium text-gray-900">{t.title}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${status.tone}`}>{status.label}</span>
                      </td>
                      <td className="min-w-[120px] px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                            <div className="h-full bg-blue-600" style={{ width: `${Math.min(100, Math.max(0, t.progress))}%` }} />
                          </div>
                          <span className="text-xs text-gray-700">{t.progress}%</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-gray-700">{fmtDate(t.dueDate)}</td>
                      <td className="px-3 py-2 text-gray-700">{t.report || "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-500">{fmtDateTime(t.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={card}>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900">
            <CalendarCheck className="h-5 w-5 text-blue-600" /> Présence
          </h2>
          <p className="text-sm text-gray-700">
            {data.presenceDays.length} jour(s) enregistré(s) · durée prévue : {months} mois
          </p>
          {data.presenceDays.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {data.presenceDays.slice(-20).map((day) => (
                <span key={day} className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700">
                  {fmtDate(day)}
                </span>
              ))}
            </div>
          )}
          {data.presenceDays.length > 20 && <p className="mt-2 text-xs text-gray-500">20 derniers jours affichés.</p>}
        </section>

        <section className={card}>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900">
            <Star className="h-5 w-5 text-blue-600" /> Évaluations du tuteur ({data.evaluations.length})
          </h2>
          {data.evaluations.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune évaluation pour ce stage.</p>
          ) : (
            <>
              <ul className="space-y-1 text-sm text-gray-700">
                {data.evaluations.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3">
                    <span>{e.title}</span>
                    <span className="font-semibold text-gray-900">{e.overallScore ?? "—"}/20</span>
                  </li>
                ))}
              </ul>
              {average !== null && <p className="mt-3 text-xs text-gray-500">Moyenne : {average}/20</p>}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
