"use client";

// AJOUT — Livrables attendus par jalon (cahier §5.2) : créer, marquer livré, valider ou rejeter (avec motif).

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { AppLayout } from "@/components/layout";
import api from "@/lib/axios";
import { errorMessage } from "@/lib/crud";
import { toast } from "@/lib/toast";

type Status = "PLANNED" | "DELIVERED" | "VALIDATED" | "REJECTED";
interface Deliverable { id: number; milestoneId: number; title: string; description: string | null; dueDate: string | null; status: Status; fileUrl: string | null; reviewComment: string | null; milestone?: { id: number; title: string } }
interface Milestone { id: number; title: string }

const LABEL: Record<Status, string> = { PLANNED: "Prévu", DELIVERED: "Livré", VALIDATED: "Validé", REJECTED: "Rejeté" };
const STYLE: Record<Status, string> = { PLANNED: "bg-gray-100 text-gray-700", DELIVERED: "bg-amber-100 text-amber-700", VALIDATED: "bg-green-100 text-green-700", REJECTED: "bg-red-100 text-red-700" };

function Content() {
  const [rows, setRows] = useState<Deliverable[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ milestoneId: "", title: "", dueDate: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [d, m] = await Promise.all([api.get("/milestone-deliverables"), api.get("/milestones")]);
      setRows(d.data?.data ?? []);
      setMilestones(m.data?.milestones ?? []);
    } catch (err) {
      setError(errorMessage(err, "Impossible de charger les livrables."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); await load(); } catch (err) { toast.error(errorMessage(err, "Action impossible.")); } finally { setBusy(false); }
  };

  const create = () => {
    if (!form.milestoneId || form.title.trim().length < 2) { toast.warning("Choisissez un jalon et saisissez un titre."); return; }
    void run(async () => {
      await api.post("/milestone-deliverables", { milestoneId: Number(form.milestoneId), title: form.title.trim(), ...(form.dueDate ? { dueDate: form.dueDate } : {}) });
      setForm({ milestoneId: "", title: "", dueDate: "" });
    }, "Livrable ajouté.");
  };

  const reject = (id: number) => {
    const comment = window.prompt("Motif du rejet (5 caractères minimum) :") ?? "";
    if (comment.trim().length < 5) { toast.warning("Motif trop court : rejet annulé."); return; }
    void run(() => api.post(`/milestone-deliverables/${id}/review`, { decision: "REJECTED", comment }), "Livrable rejeté.");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">Livrables des jalons</h1>
        <p className="text-sm text-gray-500">Chaque jalon peut avoir des livrables attendus : prévu → livré → validé ou rejeté (avec motif). Les décisions sont journalisées.</p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_1.5fr_10rem_auto]">
        <select value={form.milestoneId} onChange={(e) => setForm({ ...form, milestoneId: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" aria-label="Jalon">
          <option value="">Jalon…</option>
          {milestones.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
        </select>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Livrable attendu" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" aria-label="Titre" />
        <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" aria-label="Échéance" />
        <button onClick={create} disabled={busy} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Ajouter</button>
      </div>

      {loading && <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</div>}
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          {rows.length === 0 ? <p className="text-sm text-gray-600">Aucun livrable enregistré.</p> : (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase text-gray-500"><tr>{["Jalon", "Livrable", "Échéance", "Statut", "Actions"].map((h) => <th key={h} className="py-2 pr-4 font-semibold">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2.5 pr-4 text-gray-600">{r.milestone?.title ?? `#${r.milestoneId}`}</td>
                    <td className="pr-4 font-medium text-gray-900">{r.title}{r.reviewComment && <span className="block text-xs font-normal text-gray-500">Motif : {r.reviewComment}</span>}</td>
                    <td className="pr-4">{r.dueDate ? new Date(r.dueDate).toLocaleDateString("fr-FR") : "—"}</td>
                    <td className="pr-4"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLE[r.status]}`}>{LABEL[r.status]}</span></td>
                    <td className="space-x-3">
                      {(r.status === "PLANNED" || r.status === "REJECTED") && <button disabled={busy} onClick={() => void run(() => api.patch(`/milestone-deliverables/${r.id}`, { markDelivered: true }), "Marqué livré.")} className="font-medium text-blue-700 hover:underline">Marquer livré</button>}
                      {r.status === "DELIVERED" && <>
                        <button disabled={busy} onClick={() => void run(() => api.post(`/milestone-deliverables/${r.id}/review`, { decision: "VALIDATED" }), "Livrable validé.")} className="font-medium text-green-700 hover:underline">Valider</button>
                        <button disabled={busy} onClick={() => reject(r.id)} className="font-medium text-red-700 hover:underline">Rejeter</button>
                      </>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default function MilestoneDeliverablesPage() {
  return <AppLayout><Content /></AppLayout>;
}
