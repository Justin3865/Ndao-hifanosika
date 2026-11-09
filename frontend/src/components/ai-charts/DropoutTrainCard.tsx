"use client";

// AJOUT — « Entraîner le modèle d'abandon » : pilote le service ML via le backend (jamais en direct).
// Tant que le verdict n'est pas « retenu », le score à règles reste la référence.

import { useCallback, useEffect, useState } from "react";
import { Loader2, Play, UserMinus } from "lucide-react";

import api from "@/lib/axios";
import { getStoredRole } from "@/lib/access";
import { errorMessage, fmtDateTime } from "@/lib/crud";
import { confirmDialog, toast } from "@/lib/toast";

interface DropoutReport {
  trained_at?: string;
  version?: string;
  stats?: { rows?: number; positives?: number };
  decision?: { verdict?: string; message?: string };
  models?: Array<{ name: string; pr_auc?: number; recall?: number }>;
  baseline?: { pr_auc?: number; recall?: number };
  [key: string]: unknown;
}

export function DropoutTrainCard() {
  const [canTrain, setCanTrain] = useState(false);
  const [report, setReport] = useState<DropoutReport | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/ai/dropout/report");
      setReport(res.data?.data ?? null);
      setMessage("");
    } catch (err) {
      setReport(null);
      setMessage(errorMessage(err, "Aucun entraînement du modèle d'abandon pour le moment."));
    }
  }, []);

  useEffect(() => {
    setCanTrain(["ADMIN", "DSI"].includes(getStoredRole()));
    void load();
  }, [load]);

  const train = async () => {
    const ok = await confirmDialog(
      "Entraîner le modèle d'abandon sur les parcours clos (terminé / abandon) ? Il ne sera utilisé que s'il bat le score à règles ; sinon les règles sont conservées.",
      { title: "Modèle d'abandon", confirmLabel: "Lancer" },
    );
    if (!ok) return;

    setBusy(true);
    try {
      const res = await api.post("/ai/dropout/train");
      setReport(res.data?.data ?? null);
      toast.success("Entraînement terminé.");
      await load();
    } catch (err) {
      // 422 = données insuffisantes : message métier, pas une panne
      toast.warning(errorMessage(err, "Entraînement impossible."));
    } finally {
      setBusy(false);
    }
  };

  const verdict = report?.decision?.verdict;

  return (
    <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <UserMinus className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1 text-sm text-gray-600">
          <p className="font-semibold text-gray-900">Modèle de risque d&apos;abandon des bénéficiaires</p>
          Apprentissage sur les parcours clos (≥ 30 requis, ≥ 100 recommandés), comparé au score à règles.
        </div>
        {canTrain && (
          <button type="button" onClick={train} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-blue-800 px-5 py-3 font-semibold text-white hover:bg-blue-900 disabled:opacity-60">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
            {busy ? "Entraînement..." : "Entraîner le modèle d'abandon"}
          </button>
        )}
      </div>

      {report ? (
        <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${verdict === "retenu" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
              {verdict === "retenu" ? "Modèle retenu" : "Non concluant : règles conservées"}
            </span>
            {report.stats?.rows !== undefined && <span>{report.stats.rows} parcours · {report.stats.positives ?? 0} abandons</span>}
            {report.trained_at && <span className="text-xs text-gray-400">{fmtDateTime(report.trained_at)}</span>}
          </div>
          {report.decision?.message && <p className="mt-2">{report.decision.message}</p>}
        </div>
      ) : (
        message && <p className="text-sm text-gray-500">{message}</p>
      )}
    </div>
  );
}
