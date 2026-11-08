"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, ShieldAlert } from "lucide-react";

import api from "@/lib/axios";
import { errorMessage } from "@/lib/crud";
import { TeamPresence as TeamData, flagLabel, fmtTime } from "@/lib/presence";

const localToday = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** Présences GPS de l'équipe pour un jour : arrivée vérifiée, départ, tâches déclarées, anomalies, absents du jour. */
export default function TeamPresence() {
  const [day, setDay] = useState(localToday());
  const [data, setData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<number | null>(null);

  const load = useCallback(async (d: string) => {
    setLoading(true);
    setError("");

    try {
      const res = await api.get("/presence/overview", { params: { day: d } });
      setData(res.data?.data ?? null);
    } catch (err) {
      setError(errorMessage(err, "Impossible de charger les présences GPS."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(day);
  }, [day, load]);

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Présences GPS de l&apos;équipe</h2>
          <p className="text-xs text-gray-500">Arrivée vérifiée (position, altitude), départ et tâches du jour. Les tâches alimentent le Suivi &amp; Évaluation.</p>
        </div>
        <label className="text-sm">
          <span className="sr-only">Jour</span>
          <input type="date" value={day} max={localToday()} onChange={(e) => e.target.value && setDay(e.target.value)} className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm" />
        </label>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {loading && (
        <p className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </p>
      )}

      {data && !loading && (
        <>
          <div className="grid gap-3 sm:grid-cols-4 text-sm">
            {[
              ["Présents", data.totals.present],
              ["Départs pointés", data.totals.checkedOut],
              ["À vérifier", data.totals.suspect],
              ["Tâches déclarées", data.totals.tasks],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-gray-200 px-4 py-3">
                <p className="text-xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Personne</th>
                  <th className="px-3 py-2">Stage / projet</th>
                  <th className="px-3 py-2">Lieu</th>
                  <th className="px-3 py-2">Arrivée</th>
                  <th className="px-3 py-2">Départ</th>
                  <th className="px-3 py-2">Tâches</th>
                  <th className="px-3 py-2">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.rows.map((r) => (
                  <Fragment key={r.id}>
                    <tr className="align-top">
                      <td className="px-3 py-2 font-medium text-gray-900">{r.userName}</td>
                      <td className="px-3 py-2 text-gray-600">{r.internshipTitle ?? r.projectName ?? "—"}</td>
                      <td className="px-3 py-2">
                        {r.mode === "SIEGE" ? "Siège" : "Terrain"}
                        {r.checkIn.distanceM !== null && <span className="block text-xs text-gray-500">{r.checkIn.distanceM} m</span>}
                      </td>
                      <td className="px-3 py-2">{fmtTime(r.checkInAt)}</td>
                      <td className="px-3 py-2">{r.checkOutAt ? fmtTime(r.checkOutAt) : <span className="text-amber-700">non pointé</span>}</td>
                      <td className="px-3 py-2">
                        <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)} className="inline-flex items-center gap-1 text-blue-800 hover:underline">
                          {r.tasks.length} {open === r.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.status === "OK" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>{r.status === "OK" ? "Vérifié" : "À vérifier"}</span>
                      </td>
                    </tr>
                    {open === r.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={7} className="px-4 py-3 text-xs text-gray-700">
                          {r.flags.length > 0 && (
                            <ul className="mb-2 space-y-1 text-amber-800">
                              {r.flags.map((f) => (
                                <li key={f} className="flex items-center gap-1.5">
                                  <ShieldAlert className="h-3.5 w-3.5" /> {flagLabel(f)}
                                </li>
                              ))}
                            </ul>
                          )}
                          {r.tasks.length === 0 ? (
                            <p>Aucune tâche déclarée.</p>
                          ) : (
                            <ul className="list-disc space-y-1 pl-5">
                              {r.tasks.map((t) => (
                                <li key={t.id}>
                                  {t.title}
                                  {t.progress !== null ? ` — ${t.progress} %` : ""}
                                  {t.completed ? " (terminée)" : ""}
                                  {t.note ? ` : ${t.note}` : ""}
                                </li>
                              ))}
                            </ul>
                          )}
                          {r.summary && <p className="mt-2">Bilan : {r.summary}</p>}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {data.rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                      Aucun pointage ce jour.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data.missing.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">{data.missing.length} stagiaire(s) pas encore pointé(s) aujourd&apos;hui :</p>
              <p className="text-xs">{data.missing.map((m) => m.name).join(", ")}</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
