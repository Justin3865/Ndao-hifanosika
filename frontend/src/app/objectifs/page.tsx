"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Info, Loader2, Plus, Trash2 } from "lucide-react";

import { AppLayout } from "@/components/layout";
import { getStoredRole } from "@/lib/access";
import api from "@/lib/axios";
import { LookupItem, errorMessage, fetchLookup, fmtDate } from "@/lib/crud";
import {
  OBJECTIVE_EDIT_ROLES,
  OBJECTIVE_LABEL,
  OBJECTIVE_MANAGERS,
  ObjectiveRow,
} from "@/lib/gaps";

/** Affiche un nombre tel quel (150, 12,5) : sans séparateur de milliers ni espace parasite. */
function fmtTarget(v: number | string): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return String(Math.round(n * 100) / 100).replace(".", ",");
}

const EMPTY = { title: "", kpi: "", unit: "", targetValue: "", dueDate: "", description: "" };

export default function ObjectifsPage() {
  const [role, setRole] = useState("");
  const [members, setMembers] = useState<LookupItem[]>([]);
  const [userId, setUserId] = useState("");
  const [rows, setRows] = useState<ObjectiveRow[]>([]);
  const [alerts, setAlerts] = useState<ObjectiveRow[]>([]);
  const [progress, setProgress] = useState<Record<number, string>>({});
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const isManager = OBJECTIVE_MANAGERS.includes(role);
  const canEdit = OBJECTIVE_EDIT_ROLES.includes(role);

  useEffect(() => {
    const r = getStoredRole();
    setRole(r);
    if (OBJECTIVE_MANAGERS.includes(r)) fetchLookup("users").then(setMembers).catch(() => setMembers([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/objectives", { params: userId ? { userId } : {} });
      const list: ObjectiveRow[] = res.data?.data ?? [];
      setRows(list);
      setProgress(Object.fromEntries(list.map((o) => [o.id, o.currentValue === null ? "" : String(o.currentValue)])));
    } catch (err) {
      setError(errorMessage(err, "Impossible de charger les objectifs."));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadAlerts = useCallback(async () => {
    if (!isManager) return;
    try {
      const res = await api.get("/objectives/alerts");
      setAlerts(res.data?.data ?? []);
    } catch {
      setAlerts([]);
    }
  }, [isManager]);

  useEffect(() => {
    if (role) void load();
  }, [role, load]);
  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!userId) {
      setError("Choisissez d'abord le membre concerné.");
      return;
    }
    try {
      await api.post("/objectives", {
        userId: Number(userId),
        title: form.title.trim(),
        kpi: form.kpi.trim() || null,
        unit: form.unit.trim() || null,
        description: form.description.trim() || null,
        targetValue: form.targetValue === "" ? null : Number(form.targetValue),
        dueDate: form.dueDate || null,
      });
      setForm(EMPTY);
      setShowForm(false);
      setInfo("Objectif créé.");
      await Promise.all([load(), loadAlerts()]);
    } catch (err) {
      setError(errorMessage(err, "Création impossible."));
    }
  };

  const saveProgress = async (o: ObjectiveRow) => {
    setError("");
    setInfo("");
    const value = Number(progress[o.id]);
    if (!Number.isFinite(value)) {
      setError("Saisissez une valeur numérique.");
      return;
    }
    try {
      await api.patch(`/objectives/${o.id}/progress`, { currentValue: value });
      setInfo("Progression enregistrée.");
      await Promise.all([load(), loadAlerts()]);
    } catch (err) {
      setError(errorMessage(err, "Enregistrement impossible."));
    }
  };

  const remove = async (o: ObjectiveRow) => {
    if (!window.confirm(`Supprimer l'objectif « ${o.title} » ?`)) return;
    try {
      await api.delete(`/objectives/${o.id}`);
      await Promise.all([load(), loadAlerts()]);
    } catch (err) {
      setError(errorMessage(err, "Suppression impossible."));
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Objectifs individuels</h1>
            <p className="text-sm text-gray-500">Objectifs et indicateurs (KPI RH) de chaque membre.</p>
          </div>
          {canEdit && (
            <button type="button" onClick={() => setShowForm((v) => !v)} className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800">
              <Plus className="h-4 w-4" /> Nouvel objectif
            </button>
          )}
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {info && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{info}</div>}

        {isManager && alerts.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="mb-2 flex items-center gap-2 font-semibold"><Info className="h-4 w-4" /> {alerts.length} objectif(s) en retard</div>
            <ul className="list-disc space-y-1 pl-5">
              {alerts.slice(0, 8).map((a) => (
                <li key={a.id}>{a.memberName} — {a.title} (échéance {fmtDate(a.dueDate)})</li>
              ))}
            </ul>
          </div>
        )}

        {isManager && (
          <label className="block text-sm sm:max-w-sm">
            <span className="mb-1 block font-medium text-gray-700">Membre</span>
            <select value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2">
              <option value="">Moi-même</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </label>
        )}

        {showForm && canEdit && (
          <form onSubmit={create} className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-2">
            <input required placeholder="Intitulé de l'objectif" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-2" />
            <input placeholder="Indicateur (KPI)" value={form.kpi} onChange={(e) => setForm({ ...form, kpi: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input placeholder="Unité (ex. rapports, %)" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input type="number" step="any" placeholder="Valeur cible" value={form.targetValue} onChange={(e) => setForm({ ...form, targetValue: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <textarea placeholder="Description (facultatif)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-2" rows={2} />
            <div className="sm:col-span-2">
              <button type="submit" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">Créer</button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-blue-700" /></div>
        ) : rows.length === 0 ? (
          <p className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Aucun objectif enregistré.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((o) => (
              <li key={o.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{o.title}</p>
                    <p className="text-xs text-gray-500">
                      {o.kpi ? `${o.kpi} · ` : ""}{OBJECTIVE_LABEL[o.status]}
                      {o.dueDate ? ` · échéance ${fmtDate(o.dueDate)}` : ""}
                      {o.overdue && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-red-700">En retard</span>}
                    </p>
                    {o.description && <p className="mt-1 text-sm text-gray-600">{o.description}</p>}
                  </div>
                  {canEdit && (
                    <button type="button" onClick={() => remove(o)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label="Supprimer">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="mt-3">
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full bg-blue-600" style={{ width: `${o.progress ?? 0}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {o.progress === null ? "Pas de cible chiffrée" : `${o.progress} %`}
                    {o.targetValue !== null && o.targetValue !== undefined ? ` — cible : ${fmtTarget(o.targetValue)}${o.unit ? `\u00a0${String(o.unit).trim()}` : ""}` : ""}
                  </p>
                </div>
                {o.status !== "CANCELLED" && (
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <input
                      type="number"
                      step="any"
                      value={progress[o.id] ?? ""}
                      onChange={(e) => setProgress((p) => ({ ...p, [o.id]: e.target.value }))}
                      placeholder="Valeur atteinte"
                      className="w-40 rounded-lg border border-gray-300 px-3 py-1.5"
                    />
                    <button type="button" onClick={() => saveProgress(o)} className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50">Mettre à jour</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppLayout>
  );
}

