"use client";

import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";

import api from "@/lib/axios";
import { InternshipJournal, flagLabel, fmtDay, fmtTime } from "@/lib/presence";

/** Journal de présence GPS et tâches du jour d'un stagiaire (page Suivi & Évaluation). Se masque si indisponible. */
export default function PresenceJournal({ internshipId, userId }: { internshipId?: string; userId?: string }) {
  const [data, setData] = useState<InternshipJournal | null>(null);

  useEffect(() => {
    const url = internshipId ? `/presence/internship/${internshipId}` : userId ? `/presence/user/${userId}` : null;
    if (!url) return;
    let cancelled = false;

    api
      .get(url, { params: { days: 60 } })
      .then((res) => !cancelled && setData(res.data?.data ?? null))
      .catch(() => !cancelled && setData(null));

    return () => {
      cancelled = true;
    };
  }, [internshipId, userId]);

  if (!data) return null;

  const kpis: Array<[string, number]> = [
    ["Jours pointés (GPS)", data.totals.daysPresent],
    ["Départs pointés", data.totals.daysCheckedOut],
    ["Jours à vérifier", data.totals.daysSuspect],
    ["Tâches déclarées", data.totals.tasksLogged],
  ];

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Présence GPS et tâches du jour</h2>
        <p className="text-xs text-slate-500">Arrivée vérifiée au siège / sur le terrain, et ce qui a été fait chaque jour (alimente l&apos;avancement du stage).</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {kpis.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 px-4 py-3">
            <p className="text-xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {data.alerts.map((a) => (
        <p key={a.message} className={`rounded-xl border px-4 py-2 text-sm ${a.level === "warning" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-blue-200 bg-blue-50 text-blue-900"}`}>
          {a.message}
        </p>
      ))}

      {data.days.length === 0 ? (
        <p className="text-sm text-slate-500">Aucun pointage GPS enregistré pour le moment.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {data.days.slice(0, 30).map((d) => (
            <li key={d.id} className="py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-slate-900">
                  {fmtDay(d.day)} · {d.mode === "SIEGE" ? "Siège" : "Terrain"}{d.projectName ? ` · ${d.projectName}` : ""} · {fmtTime(d.checkInAt)} → {d.checkOutAt ? fmtTime(d.checkOutAt) : "départ non pointé"}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${d.status === "OK" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`}>{d.status === "OK" ? "Vérifié" : "À vérifier"}</span>
              </div>
              {d.flags.length > 0 && (
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-amber-800">
                  <ShieldAlert className="h-3.5 w-3.5" /> {d.flags.map(flagLabel).join(" · ")}
                </p>
              )}
              {d.tasks.length > 0 && (
                <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">
                  {d.tasks.map((t) => (
                    <li key={t.id}>
                      {t.activityTitle ? `Activité « ${t.activityTitle} » — ` : ""}
                      {t.title}
                      {t.progress !== null ? ` — ${t.progress} %` : ""}
                      {t.completed ? " (terminée)" : ""}
                      {t.note ? ` : ${t.note}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
