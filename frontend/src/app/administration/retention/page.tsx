"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { AppLayout } from "@/components/layout";
import api from "@/lib/axios";
import { errorMessage } from "@/lib/crud";
import { RetentionPreview } from "@/lib/gaps";

export default function RetentionPage() {
  const [data, setData] = useState<RetentionPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/retention");
      setData(res.data?.data ?? null);
    } catch (err) {
      setError(errorMessage(err, "Impossible de simuler la purge."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async () => {
    if (!data || data.total === 0) return;
    if (!window.confirm(`Supprimer définitivement ${data.total} ligne(s) de journaux techniques ? Cette action est irréversible.`)) return;
    setRunning(true);
    setError("");
    setInfo("");
    try {
      await api.post("/admin/retention", { confirm: true });
      setInfo("Purge effectuée et journalisée.");
      await load();
    } catch (err) {
      setError(errorMessage(err, "La purge a échoué."));
    } finally {
      setRunning(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conservation et purge des données</h1>
          <p className="text-sm text-gray-500">
            Seuls des journaux techniques sont concernés. Les données métier (bénéficiaires, projets, évaluations, stages) ne sont jamais supprimées ici.
          </p>
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {info && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{info}</div>}

        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-blue-700" /></div>
        ) : data ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              Politique actuelle : audit {data.policy.auditMonths} mois · notifications {data.policy.notificationMonths} mois · rappels {data.policy.reminderLogMonths} mois.
              Modifiable par les variables <code>RETENTION_AUDIT_MONTHS</code>, <code>RETENTION_NOTIFICATION_MONTHS</code>, <code>RETENTION_REMINDER_MONTHS</code> (audit : 12 mois minimum).
            </div>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr><th className="px-4 py-2">Élément</th><th className="px-4 py-2 text-right">Lignes à supprimer</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.rows.map((r) => (
                    <tr key={r.key}><td className="px-4 py-2">{r.label}</td><td className="px-4 py-2 text-right font-medium">{r.count}</td></tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold"><td className="px-4 py-2">Total</td><td className="px-4 py-2 text-right">{data.total}</td></tr>
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={run}
              disabled={running || data.total === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Exécuter la purge
            </button>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
