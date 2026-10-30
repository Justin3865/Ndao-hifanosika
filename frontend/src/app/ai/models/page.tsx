"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, Loader2, Play, Trash2 } from "lucide-react";
import api from "@/lib/axios";
import { DatasetsLab } from "@/components/ai-charts/DatasetsLab";
import { ModelsLab } from "@/components/ai-charts/ModelsLab";
import { AppLayout } from "@/components/layout";
import { InsightHeader } from "@/components/insights/parts";
import { getStoredRole } from "@/lib/access";
import { errorMessage, fmtDateTime } from "@/lib/crud";
import { confirmDialog, toast } from "@/lib/toast";

interface Metrics { accuracy: number; precision: number; recall: number; f1: number; auc: number }

interface Report {
  trained: boolean;
  reason?: string;
  sampleSize: number;
  positives: number;
  reliability: "INSUFFISANTE" | "FAIBLE" | "CORRECTE";
  folds: number;
  models: Array<{ name: string; kind: string; metrics: Metrics }>;
  baseline: Metrics;
}

interface StoredModel { id: number; name: string; kind: string; sampleSize: number; metrics: Metrics; trainedAt: string }

const pct = (v: number) => `${Math.round(v * 100)} %`;

const RELIABILITY_STYLE = {
  INSUFFISANTE: "bg-red-100 text-red-700",
  FAIBLE: "bg-amber-100 text-amber-700",
  CORRECTE: "bg-green-100 text-green-700",
};

export default function ModelsPage() {
  const [history, setHistory] = useState<StoredModel[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [canTrain, setCanTrain] = useState(false);

  const load = () =>
    api.get("/ai/models").then((res) => setHistory(res.data?.data ?? [])).catch(() => setHistory([]));

  useEffect(() => {
    setCanTrain(["ADMIN", "DSI"].includes(getStoredRole()));
    void load();
  }, []);

  const removeModel = async (m: StoredModel) => {
    const ok = await confirmDialog(`Supprimer l'entraînement « ${m.name} » du ${fmtDateTime(m.trainedAt)} ? Cette action est définitive.`, {
      title: "Supprimer cet entraînement",
      confirmLabel: "Supprimer",
      danger: true,
    });
    if (!ok) return;

    try {
      await api.delete(`/ai/models/${m.id}`);
      toast.success("Entraînement supprimé.");
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Suppression impossible."));
    }
  };

  const train = async () => {
    if (!(await confirmDialog("Entraîner les modèles sur les données actuelles ? Cela peut prendre quelques secondes.", { title: "Entraînement IA", confirmLabel: "Lancer", danger: false }))) return;

    setBusy(true);

    try {
      const res = await api.post("/ai/train");
      const data = res.data.data as Report;
      setReport(data);

      if (data.trained) toast.success("Modèles entraînés et enregistrés.");
      else toast.warning(data.reason ?? "Données insuffisantes.");

      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Entraînement impossible."));
    } finally {
      setBusy(false);
    }
  };

  const rows = report
    ? [{ name: "Référence (classe majoritaire)", metrics: report.baseline }, ...report.models.map((m) => ({ name: m.name, metrics: m.metrics }))]
    : [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <InsightHeader title="Modèles d'apprentissage" subtitle="Entraînement et test sur vos données réelles." />

        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700"><BrainCircuit className="h-6 w-6" /></span>
          <div className="min-w-0 flex-1 text-sm text-gray-600">Modèles de vulnérabilité des ménages (SGD et réseau de neurones).</div>
          {canTrain && (
            <button type="button" onClick={train} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-blue-800 px-5 py-3 font-semibold text-white hover:bg-blue-900 disabled:opacity-60">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
              {busy ? "Entraînement..." : "Entraîner maintenant"}
            </button>
          )}
        </div>

        {report && (
          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-semibold text-gray-900">Dernier entraînement</h2>
              <span className="text-sm text-gray-500">{report.sampleSize} ménages · {report.positives} vulnérables · validation croisée {report.folds} plis</span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${RELIABILITY_STYLE[report.reliability]}`}>Fiabilité : {report.reliability.toLowerCase()}</span>
            </div>

            {report.trained && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="text-xs uppercase text-gray-500">
                    <tr>{["Modèle", "Exactitude", "Précision", "Rappel", "F1", "AUC"].map((h) => <th key={h} className="py-2 pr-4 font-semibold">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map((row) => (
                      <tr key={row.name}>
                        <td className="py-2.5 pr-4 font-medium text-gray-900">{row.name}</td>
                        <td className="pr-4">{pct(row.metrics.accuracy)}</td>
                        <td className="pr-4">{pct(row.metrics.precision)}</td>
                        <td className="pr-4">{pct(row.metrics.recall)}</td>
                        <td className="pr-4">{row.metrics.f1.toFixed(2)}</td>
                        <td className="pr-4">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-100">
                              <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-400" style={{ width: `${row.metrics.auc * 100}%` }} />
                            </div>
                            {row.metrics.auc.toFixed(2)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <details className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <summary className="cursor-pointer font-semibold text-gray-900">Historique des entraînements ({history.length})</summary>
          <div className="mt-3" />
          {history.length === 0 && <p className="text-sm text-gray-500">Aucun entraînement.</p>}
          <div className="divide-y divide-gray-100">
            {history.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span className="font-medium text-gray-900">{m.name}</span>
                <span className="text-gray-500">{m.sampleSize} {m.name.startsWith("dataset-") ? "lignes" : "ménages"} · AUC {Number(m.metrics.auc).toFixed(2)} · exactitude {pct(m.metrics.accuracy)}</span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{fmtDateTime(m.trainedAt)}</span>
                  {canTrain && (
                    <button
                      type="button"
                      onClick={() => void removeModel(m)}
                      title="Supprimer cet entraînement"
                      aria-label="Supprimer cet entraînement"
                      className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        </details>

        <DatasetsLab onChanged={() => void load()} />

        <ModelsLab onChanged={() => void load()} />
      </div>
    </AppLayout>
  );
}
