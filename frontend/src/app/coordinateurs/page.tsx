"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Plus, X } from "lucide-react";

import { AppLayout } from "@/components/layout";
import { useI18n } from "@/components/i18n/I18nProvider";
import api from "@/lib/axios";
import { LookupItem, errorMessage, fetchLookup } from "@/lib/crud";
import { Assignment, parseUserLabel, unassignedCoordinators } from "@/lib/journey";

interface Coordinator {
  id: number;
  name: string;
}

export default function CoordinateursPage() {
  const { t } = useI18n();
  const [projects, setProjects] = useState<LookupItem[]>([]);
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [userId, setUserId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [proj, users, assign] = await Promise.all([
        fetchLookup("projects"),
        fetchLookup("users"),
        api.get("/project-coordinators"),
      ]);
      setProjects(proj);
      setCoordinators(
        users
          .map((u) => ({ id: u.id, ...parseUserLabel(u.label) }))
          .filter((u) => u.role === "COORDINATOR")
          .map((u) => ({ id: u.id, name: u.name })),
      );
      setAssignments(assign.data?.data ?? []);
    } catch (err) {
      setError(errorMessage(err, t("common.error")));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const nameOf = useMemo(() => new Map(coordinators.map((c) => [c.id, c.name])), [coordinators]);
  const byProject = useMemo(() => {
    const m = new Map<number, Assignment[]>();
    for (const a of assignments) m.set(a.projectId, [...(m.get(a.projectId) ?? []), a]);
    return m;
  }, [assignments]);
  const idle = useMemo(
    () => unassignedCoordinators(coordinators.map((c) => c.id), assignments),
    [coordinators, assignments],
  );

  const assign = async () => {
    if (!userId || !projectId) return;
    setSaving(true);
    setError("");
    setInfo("");
    try {
      await api.post("/project-coordinators", { userId: Number(userId), projectId: Number(projectId) });
      setInfo("Coordinateur affecté au projet.");
      setUserId("");
      await load();
    } catch (err) {
      setError(errorMessage(err, t("common.error")));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    setError("");
    setInfo("");
    try {
      await api.delete(`/project-coordinators/${id}`);
      setInfo("Affectation retirée.");
      setConfirmId(null);
      await load();
    } catch (err) {
      setError(errorMessage(err, t("common.error")));
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coordinateurs de projet</h1>
          <p className="text-sm text-gray-500">
            Un coordinateur affecté à un ou plusieurs projets ne voit que ces projets (listes, tableaux de bord, rapports, carte des zones).
          </p>
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {info && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{info}</div>}

        {!loading && idle.length > 0 && (
          <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">{t("coord.idle.title", { n: idle.length })}</p>
              <p>{t("coord.idle.body", { names: idle.map((id) => nameOf.get(id)).filter(Boolean).join(", ") })}</p>
            </div>
          </div>
        )}

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Affecter un coordinateur</h2>
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <label className="block md:w-72">
              <span className="mb-1 block text-sm text-gray-600">Coordinateur</span>
              <select value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="">—</option>
                {coordinators.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="block md:w-96">
              <span className="mb-1 block text-sm text-gray-600">{t("common.project")}</span>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="">—</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={assign}
              disabled={saving || !userId || !projectId}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Affecter
            </button>
          </div>
          {coordinators.length === 0 && !loading && (
            <p className="mt-3 text-xs text-gray-500">Aucun utilisateur n&apos;a le rôle Coordinateur. Créez-en un dans « Utilisateurs ».</p>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> {t("common.loading")}</div>
          ) : projects.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">{t("common.noData")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-2">{t("common.project")}</th>
                    <th className="px-5 py-2">Coordinateurs affectés</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {projects.map((p) => {
                    const list = byProject.get(p.id) ?? [];
                    return (
                      <tr key={p.id}>
                        <td className="px-5 py-3 font-medium text-gray-900">{p.label}</td>
                        <td className="px-5 py-3">
                          {list.length === 0 ? (
                            <span className="text-gray-400">Aucun</span>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {list.map((a) => (
                                <span key={a.id} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-900">
                                  {nameOf.get(a.userId) ?? `#${a.userId}`}
                                  {confirmId === a.id ? (
                                    <span className="ml-1 inline-flex items-center gap-1">
                                      <button type="button" onClick={() => remove(a.id)} className="font-semibold text-red-700 hover:underline">Retirer</button>
                                      <button type="button" onClick={() => setConfirmId(null)} className="text-gray-600 hover:underline">Annuler</button>
                                    </span>
                                  ) : (
                                    <button type="button" onClick={() => setConfirmId(a.id)} aria-label="Retirer l'affectation" className="rounded-full p-0.5 hover:bg-blue-100">
                                      <X className="h-3 w-3" />
                                    </button>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
