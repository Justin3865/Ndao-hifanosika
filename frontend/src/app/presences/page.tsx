"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Loader2, Save, Trash2 } from "lucide-react";

import { AppLayout } from "@/components/layout";
import MyPresence from "@/components/presence/MyPresence";
import TeamPresence from "@/components/presence/TeamPresence";
import { getStoredRole } from "@/lib/access";
import api from "@/lib/axios";
import { LookupItem, errorMessage, fetchLookup, fmtDate } from "@/lib/crud";
import {
  ATTENDANCE_EDIT_ROLES,
  AttendanceRow,
  AttendanceStat,
  LEVEL_LABEL,
  LEVEL_STYLE,
} from "@/lib/gaps";

interface ActivityOption {
  id: number;
  title: string;
  startDate: string | null;
  endDate?: string | null;
  day?: string | null;
  isToday?: boolean;
  editable?: boolean;
}

interface ClockState {
  today: string;
  workingDay: boolean;
  open: boolean;
  closed: boolean;
  openHour: number;
  closeHour: number;
}

interface LogEntry {
  id: number;
  action: string;
  count: number;
  userName: string | null;
  at: string;
}

const ACTION_LABEL: Record<string, string> = {
  SAVE: "Enregistrement des présences",
  DELETE: "Suppression de pointage",
  AUTO_ABSENT: "Absences automatiques (non pointés avant 17h00)",
};

const localToday = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** Date + heure complète, secondes comprises : 06/11/2026 05:32:07 */
function fmtDateTime(value?: string | number | Date | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export default function PresencesPage() {
  const [role, setRole] = useState("");
  const [projects, setProjects] = useState<LookupItem[]>([]);
  const [projectId, setProjectId] = useState("");
  const [activities, setActivities] = useState<ActivityOption[]>([]);
  const [activityId, setActivityId] = useState("");
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [marks, setMarks] = useState<Record<number, boolean>>({});
  const [stats, setStats] = useState<AttendanceStat[]>([]);
  const [overall, setOverall] = useState<{ rate: number | null; total: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [clock, setClock] = useState<ClockState | null>(null);
  const [editable, setEditable] = useState(false);
  const [blockedReason, setBlockedReason] = useState("");
  // Journal serveur (date, heure, minutes, secondes) des enregistrements et suppressions, par séance
  const [journal, setJournal] = useState<LogEntry[]>([]);
  const today = clock?.today ?? localToday();
  const dayLabel = (() => {
    const [y, m, d] = today.slice(0, 10).split("-").map(Number);
    const date = y && m && d ? new Date(y, m - 1, d) : new Date();

    // Même format que « Jour » (Présences GPS de l'équipe) et « Date d'aujourd'hui » : 08/11/2026
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  })();

  const sessionsAllowed = ["ADMIN", "DIRECTION", "COORDINATOR"].includes(role);
  const teamAllowed = ["ADMIN", "DIRECTION", "RH", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2"].includes(role);
  const canRole = ATTENDANCE_EDIT_ROLES.includes(role);
  // Règles serveur (jour / heure) : actives seulement si l'API les fournit (/attendance/state) ; sinon comportement d'origine
  const serverRules = clock !== null;
  const canEdit = canRole && (serverRules ? editable : true);
  const isTodayActivity = (a: ActivityOption) => {
    if (a.isToday !== undefined) return a.isToday;
    const first = a.startDate ? a.startDate.slice(0, 10) : null;
    const last = a.endDate ? a.endDate.slice(0, 10) : first;
    return !first || !last || (first <= today && today <= last);
  };

  useEffect(() => {
    setRole(getStoredRole());
    api.get("/attendance/state").then((res) => setClock(res.data?.data ?? null)).catch(() => setClock(null));
    fetchLookup("projects").then(setProjects).catch(() => setProjects([]));
  }, []);

  const loadSummary = useCallback(async (pid: string) => {
    try {
      const res = await api.get("/attendance/summary", { params: pid ? { projectId: pid } : {} });
      setStats(res.data?.data?.rows ?? []);
      setOverall(res.data?.data?.overall ?? null);
    } catch {
      setStats([]);
      setOverall(null);
    }
  }, []);

  useEffect(() => {
    void loadSummary(projectId);
    setActivityId("");
    setRows([]);
    setActivities([]);
    if (!projectId) return;
    api
      .get("/attendance/activities", { params: { projectId } })
      .then((res) => setActivities(res.data?.data ?? []))
      .catch((err) => setError(errorMessage(err, "Impossible de charger les séances.")));
  }, [projectId, loadSummary]);

  const loadActivity = useCallback(async (id: string) => {
    if (!id) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/attendance/activity/${id}`);
      const list: AttendanceRow[] = res.data?.data?.rows ?? [];
      setRows(list);
      setJournal(res.data?.data?.log ?? []);
      setEditable(res.data?.data?.editable === undefined ? true : Boolean(res.data.data.editable));
      setBlockedReason(res.data?.data?.blockedReason ?? "");
      if (res.data?.data?.state) setClock(res.data.data.state);
      setMarks(Object.fromEntries(list.map((r) => [r.id, r.present ?? true])));
    } catch (err) {
      setError(errorMessage(err, "Impossible de charger la liste de présence."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadActivity(activityId);
  }, [activityId, loadActivity]);

  const save = async () => {
    setSaving(true);
    setError("");
    setInfo("");
    try {
      const records = rows.map((r) => ({ beneficiaryId: r.id, present: marks[r.id] ?? true }));
      await api.put(`/attendance/activity/${activityId}`, { records });
      setInfo(`Présences enregistrées le ${fmtDateTime(new Date())}.`);
      await Promise.all([loadActivity(activityId), loadSummary(projectId)]);
    } catch (err) {
      setError(errorMessage(err, "Enregistrement impossible."));
    } finally {
      setSaving(false);
    }
  };

  const removeMarks = async (beneficiaryId?: number) => {
    const what = beneficiaryId ? "le pointage de ce bénéficiaire" : "tous les pointages de cette séance";
    if (!window.confirm(`Supprimer ${what} ? L'opération sera horodatée dans le journal.`)) return;
    setSaving(true);
    setError("");
    setInfo("");
    try {
      await api.delete(`/attendance/activity/${activityId}`, { params: beneficiaryId ? { beneficiaryId } : {} });
      setInfo(`Pointage supprimé le ${fmtDateTime(new Date())}.`);
      await Promise.all([loadActivity(activityId), loadSummary(projectId)]);
    } catch (err) {
      setError(errorMessage(err, "Suppression impossible."));
    } finally {
      setSaving(false);
    }
  };

  const setAll = (value: boolean) => setMarks(Object.fromEntries(rows.map((r) => [r.id, value])));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Présences</h1>
            <p className="text-sm text-gray-500">Pointage du jour avec preuve GPS, tâches faites, et présences aux séances.</p>
          </div>

          {/* Date du jour (celle du serveur si disponible) : en lecture seule */}
          <label className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm">
            <CalendarDays className="h-4 w-4 shrink-0 text-blue-700" />
            <span className="sr-only">Date du jour</span>
            <input readOnly tabIndex={-1} aria-label="Date du jour (non modifiable)" value={dayLabel} className="w-28 cursor-default bg-transparent font-semibold text-gray-900 outline-none" />
          </label>
        </div>

        {role && <MyPresence />}
        {teamAllowed && <TeamPresence />}

        {sessionsAllowed && (
        <>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Présences aux séances</h2>
          <p className="text-sm text-gray-500">
            Pointez les bénéficiaires présents à chaque séance. Le taux de présence aide à repérer tôt les risques de décrochage.
          </p>
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {info && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{info}</div>}

        {clock && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            Pointage possible uniquement pour les séances du jour, les jours ouvrables (lundi à vendredi), de {String(clock.openHour).padStart(2, "0")}h00 à {String(clock.closeHour).padStart(2, "0")}h00.
            Après {String(clock.closeHour).padStart(2, "0")}h00, les bénéficiaires non pointés sont marqués absents automatiquement.
            {" "}
            <strong>
              {!clock.workingDay ? "Aujourd'hui n'est pas un jour ouvrable." : clock.open ? "Le pointage est ouvert maintenant." : clock.closed ? "Le pointage est clos pour aujourd'hui." : "Le pointage n'est pas encore ouvert."}
            </strong>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700">Projet</span>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2">
              <option value="">— Choisir un projet —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 flex items-center gap-1 font-medium text-gray-700"><CalendarDays className="h-4 w-4" /> Date d'aujourd'hui</span>
            <input
              type="date"
              value={today}
              min={today}
              max={today}
              readOnly
              onChange={() => undefined}
              title="Seule la date du jour est active (anti-fraude)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-700">Séance</span>
            <select
              value={activityId}
              onChange={(e) => setActivityId(e.target.value)}
              disabled={!projectId}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-100"
            >
              <option value="">— Choisir une séance —</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id} disabled={!isTodayActivity(a)}>{a.title}{a.startDate ? ` (${fmtDate(a.startDate)})` : ""}{!isTodayActivity(a) ? " — non modifiable" : ""}</option>
              ))}
            </select>
          </label>
        </div>

        {activityId && (
          <div className="rounded-2xl border border-gray-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
              <h2 className="font-semibold text-gray-900">Liste de présence</h2>
              {canEdit && (
                <div className="flex gap-2 text-sm">
                  <button type="button" onClick={() => setAll(true)} className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50">Tous présents</button>
                  <button type="button" onClick={() => setAll(false)} className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50">Tous absents</button>
                  {serverRules && <button type="button" onClick={() => removeMarks()} disabled={saving || !rows.some((r) => r.recorded)} className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-red-700 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-4 w-4" /> Supprimer le pointage</button>}
                  <button
                    type="button"
                    onClick={save}
                    disabled={saving || rows.length === 0}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-3 py-1.5 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Enregistrer
                  </button>
                </div>
              )}
            </div>
            {!loading && canRole && !editable && blockedReason && (
              <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">{blockedReason}</p>
            )}
            {loading ? (
              <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-blue-700" /></div>
            ) : rows.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">Aucun bénéficiaire dans ce projet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <li key={r.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-gray-900">
                      {r.lastName} {r.firstName}
                      {!r.recorded && <span className="ml-2 text-xs text-gray-400">non pointé</span>}
                      {r.recorded && r.recordedAt && (
                        <span className="ml-2 text-xs text-gray-500">
                          pointé le {fmtDateTime(r.recordedAt)}{r.recordedBy ? ` par ${r.recordedBy}` : ""}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-3">
                    {canEdit && serverRules && r.recorded && (
                      <button type="button" onClick={() => removeMarks(r.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label="Supprimer le pointage" title="Supprimer ce pointage">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={marks[r.id] ?? true}
                        disabled={!canEdit}
                        onChange={(e) => setMarks((m) => ({ ...m, [r.id]: e.target.checked }))}
                        className="h-4 w-4"
                      />
                      <span className={marks[r.id] ?? true ? "text-green-700" : "text-red-600"}>
                        {marks[r.id] ?? true ? "Présent" : "Absent"}
                      </span>
                    </label>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {journal.length > 0 && (
              <div className="border-t border-gray-100 px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-900">Journal horodaté (date, heure, minutes, secondes)</h3>
                <ul className="mt-1 space-y-0.5 text-xs text-gray-600">
                  {journal.map((j, i) => (
                    <li key={j.id ?? i}>{fmtDateTime(j.at)} — {ACTION_LABEL[j.action] ?? j.action}{j.count ? ` (${j.count})` : ""}{j.userName ? ` · ${j.userName}` : ""}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="font-semibold text-gray-900">Taux de présence par bénéficiaire</h2>
            <p className="text-xs text-gray-500">
              {overall && overall.total > 0 ? `Taux global : ${overall.rate} % sur ${overall.total} pointages.` : "Aucun pointage enregistré pour le moment."}
              {" "}Le niveau n&apos;est évalué qu&apos;à partir de 3 séances.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2">Bénéficiaire</th>
                  <th className="px-4 py-2">Séances</th>
                  <th className="px-4 py-2">Présences</th>
                  <th className="px-4 py-2">Taux</th>
                  <th className="px-4 py-2">Niveau</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.filter((s) => s.total > 0).slice(0, 200).map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2">{s.lastName} {s.firstName}</td>
                    <td className="px-4 py-2">{s.total}</td>
                    <td className="px-4 py-2">{s.present}</td>
                    <td className="px-4 py-2">{s.rate === null ? "—" : `${s.rate} %`}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_STYLE[s.level]}`}>{LEVEL_LABEL[s.level]}</span>
                    </td>
                  </tr>
                ))}
                {stats.every((s) => s.total === 0) && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">Rien à afficher.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
        )}
      </div>
    </AppLayout>
  );
}
