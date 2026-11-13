"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrainCircuit, LineChart as LineIcon, Loader2, Play, Trash2 } from "lucide-react";
import api from "@/lib/axios";
import { DatasetsLab } from "@/components/ai-charts/DatasetsLab";
import { DropoutTrainCard } from "@/components/ai-charts/DropoutTrainCard";
import { ModelsLab } from "@/components/ai-charts/ModelsLab";
import { VulnerabilityCurves } from "@/components/ai-charts/VulnerabilityCurves";
import { Modal } from "@/components/ui/Modal";
import { AppLayout } from "@/components/layout";
import { InsightHeader } from "@/components/insights/parts";
import { getStoredRole } from "@/lib/access";
import { errorMessage, fmtDateTime } from "@/lib/crud";
import { confirmDialog, toast } from "@/lib/toast";

interface Metrics { accuracy: number; precision: number; recall: number; f1: number; auc: number }
interface Predictions { probs: number[]; labels: number[] }

interface Report {
  trained: boolean;
  reason?: string;
  sampleSize: number;
  positives: number;
  reliability: "INSUFFISANTE" | "FAIBLE" | "CORRECTE";
  folds: number;
  models: Array<{ name: string; kind: string; metrics: Metrics; predictions?: Predictions }>;
  baseline: Metrics;
  trainedAt?: string;
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
  const [showCurve, setShowCurve] = useState(false);

  const best = report?.trained && report.models.length ? report.models.reduce((m, c) => (c.metrics.auc > m.metrics.auc ? c : m)) : null;

  const retained = !!best && best.metrics.auc > (report?.baseline.auc ?? 1);

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
    if (!(await confirmDialog("Entraîner les modèles ?", { title: "Entraînement IA", confirmLabel: "Lancer", danger: false }))) return;

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

  return (
    <AppLayout>
      <div className="space-y-6">
        <InsightHeader title="Modèles d'apprentissage" subtitle="Entraînement et test sur vos données réelles." />

        <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700"><BrainCircuit className="h-6 w-6" /></span>
            <div className="min-w-0 flex-1 text-sm text-gray-600">
              <p className="font-semibold text-gray-900">Modèles de vulnérabilité des ménages</p>
              Régression logistique (SGD) et réseau de neurones (MLP), comparés à la référence (classe majoritaire).
            </div>
            {canTrain && (
              <button type="button" onClick={train} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-blue-800 px-5 py-3 font-semibold text-white hover:bg-blue-900 disabled:opacity-60">
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
                {busy ? "Entraînement..." : "Entraîner maintenant"}
              </button>
            )}
          </div>

          {report && (
            <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${retained ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                  {retained ? "Modèle retenu" : report.trained ? "Non concluant" : "Données insuffisantes"}
                </span>
                <span>
                  <Link href="/ai/vulnerability" className="font-medium text-blue-800 underline-offset-2 hover:underline" title="Voir les ménages">{report.sampleSize} ménages</Link>
                  {" · "}
                  <Link href="/ai/vulnerability?filter=vulnerables" className="font-medium text-blue-800 underline-offset-2 hover:underline" title="Voir les ménages vulnérables">{report.positives} vulnérables</Link>
                  {report.trained && <> · validation croisée {report.folds} plis</>}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${RELIABILITY_STYLE[report.reliability]}`}>Fiabilité : {report.reliability.toLowerCase()}</span>
                {report.trainedAt && <span className="text-xs text-gray-400">{fmtDateTime(report.trainedAt)}</span>}
              </div>

              {report.trained && best ? (
                <p className="mt-2">
                  {best.name} {best.metrics.auc > report.baseline.auc ? "dépasse" : "ne dépasse pas"} la référence{" "}
                  <button type="button" onClick={() => setShowCurve(true)} className="font-medium text-blue-800 underline-offset-2 hover:underline" title="Voir la courbe ROC, l'histogramme et le tableau des résultats">
                    (AUC {best.metrics.auc.toFixed(2)} contre {report.baseline.auc.toFixed(2)}, rappel {pct(best.metrics.recall)})
                  </button>
                  {report.reliability === "INSUFFISANTE" ? " : échantillon trop petit pour conclure." : " : utilisable comme aide à la décision."}
                  <button type="button" onClick={() => setShowCurve(true)} className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-800 underline">
                    <LineIcon className="h-3.5 w-3.5" /> Voir la courbe
                  </button>
                </p>
              ) : (
                !report.trained && report.reason && <p className="mt-2">{report.reason}</p>
              )}
            </div>
          )}
        </div>

        <Modal isOpen={showCurve} onClose={() => setShowCurve(false)} title="Courbe ROC et histogramme" description="Modèles de vulnérabilité des ménages comparés (validation croisée)" size="xl" className="max-w-6xl">
          {report && report.trained && <VulnerabilityCurves report={{ ...report, baseline: report.baseline }} />}
        </Modal>

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

        <DropoutTrainCard />

        <DatasetsLab onChanged={() => void load()} />

        <ModelsLab onChanged={() => void load()} />
      </div>
    </AppLayout>
  );
}
