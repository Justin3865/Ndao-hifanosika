"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";

import { AppLayout } from "@/components/layout";
import { Modal } from "@/components/ui/Modal";
import { getStoredRole } from "@/lib/access";
import api from "@/lib/axios";
import { LookupItem, errorMessage, fetchLookup, fmtDate } from "@/lib/crud";
import { CONSENT_EDIT_ROLES, CONSENT_LABEL, CONSENT_STYLE, ConsentRow, ConsentState } from "@/lib/gaps";

interface Summary {
  minors: number;
  missing: number;
  granted: number;
  revoked: number;
}

export default function ConsentementsPage() {
  const [role, setRole] = useState("");
  const [projects, setProjects] = useState<LookupItem[]>([]);
  const [projectId, setProjectId] = useState("");
  const [state, setState] = useState<"" | ConsentState>("");
  const [rows, setRows] = useState<ConsentRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [editing, setEditing] = useState<ConsentRow | null>(null);
  const [form, setForm] = useState({ guardianName: "", guardianRelation: "", guardianContact: "", scope: "" });
  const [saving, setSaving] = useState(false);

  const canEdit = CONSENT_EDIT_ROLES.includes(role);

  useEffect(() => {
    setRole(getStoredRole());
    fetchLookup("projects").then(setProjects).catch(() => setProjects([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string> = {};
      if (projectId) params.projectId = projectId;
      if (state) params.state = state;
      const res = await api.get("/consents", { params });
      setRows(res.data?.data ?? []);
      setSummary(res.data?.summary ?? null);
    } catch (err) {
      setError(errorMessage(err, "Impossible de charger les consentements."));
    } finally {
      setLoading(false);
    }
  }, [projectId, state]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = (row: ConsentRow) => {
    setEditing(row);
    setForm({ guardianName: row.guardianName ?? "", guardianRelation: row.guardianRelation ?? "", guardianContact: "", scope: "" });
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      await api.put(`/consents/beneficiary/${editing.id}`, {
        guardianName: form.guardianName.trim(),
        guardianRelation: form.guardianRelation.trim() || null,
        guardianContact: form.guardianContact.trim() || null,
        scope: form.scope.trim() || null,
      });
      setInfo("Consentement enregistré.");
      setEditing(null);
      await load();
    } catch (err) {
      setError(errorMessage(err, "Enregistrement impossible."));
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (row: ConsentRow) => {
    if (!window.confirm(`Retirer le consentement pour ${row.firstName} ${row.lastName} ?`)) return;
    try {
      await api.delete(`/consents/beneficiary/${row.id}`);
      setInfo("Consentement retiré.");
      await load();
    } catch (err) {
      setError(errorMessage(err, "Opération impossible."));
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><ShieldCheck className="h-6 w-6 text-blue-700" /> Consentement des tuteurs légaux</h1>
          <p className="text-sm text-gray-500">Pour chaque bénéficiaire mineur, enregistrez le consentement de son tuteur légal. Un retrait est conservé et daté.</p>
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {info && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{info}</div>}

        {summary && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Mineurs", summary.minors, "text-gray-900"],
              ["Consentement manquant", summary.missing, "text-red-700"],
              ["Accordés", summary.granted, "text-green-700"],
              ["Retirés", summary.revoked, "text-amber-700"],
            ].map(([label, value, color]) => (
              <div key={String(label)} className="rounded-xl border border-gray-200 bg-white p-3">
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-3 text-sm">
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2">
            <option value="">Tous les projets</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
          <select value={state} onChange={(e) => setState(e.target.value as "" | ConsentState)} className="rounded-lg border border-gray-300 px-3 py-2">
            <option value="">Tous les états</option>
            <option value="MISSING">Manquant</option>
            <option value="GRANTED">Accordé</option>
            <option value="REVOKED">Retiré</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-blue-700" /></div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2">Bénéficiaire</th>
                  <th className="px-4 py-2">Âge</th>
                  <th className="px-4 py-2">Projet</th>
                  <th className="px-4 py-2">État</th>
                  <th className="px-4 py-2">Tuteur légal</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2">{r.lastName} {r.firstName}</td>
                    <td className="px-4 py-2">{r.age ?? "—"}</td>
                    <td className="px-4 py-2">{r.project?.name ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CONSENT_STYLE[r.state]}`}>{CONSENT_LABEL[r.state]}</span>
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {r.guardianName ? `${r.guardianName}${r.guardianRelation ? ` (${r.guardianRelation})` : ""}` : "—"}
                      {r.consentAt && <span className="block text-xs text-gray-400">le {fmtDate(r.consentAt)}</span>}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {canEdit && (
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => open(r)} className="rounded-lg border border-gray-300 px-3 py-1 hover:bg-gray-50">
                            {r.state === "GRANTED" ? "Modifier" : "Enregistrer"}
                          </button>
                          {r.state === "GRANTED" && (
                            <button type="button" onClick={() => revoke(r)} className="rounded-lg border border-red-200 px-3 py-1 text-red-700 hover:bg-red-50">Retirer</button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Aucun bénéficiaire mineur à afficher.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `Consentement — ${editing.firstName} ${editing.lastName}` : ""}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">Annuler</button>
            <button type="button" onClick={save} disabled={saving || form.guardianName.trim().length < 2} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-sm">
          <input placeholder="Nom du tuteur légal" value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          <input placeholder="Lien (père, mère, tuteur…)" value={form.guardianRelation} onChange={(e) => setForm({ ...form, guardianRelation: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          <input placeholder="Contact (facultatif)" value={form.guardianContact} onChange={(e) => setForm({ ...form, guardianContact: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          <textarea placeholder="Portée du consentement (facultatif)" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2" rows={2} />
        </div>
      </Modal>
    </AppLayout>
  );
}
