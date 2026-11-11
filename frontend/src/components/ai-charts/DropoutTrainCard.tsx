"use client";

// AJOUT — « Entraîner le modèle d'abandon » : pilote le service ML via le backend (jamais en direct).
// Tant que le verdict n'est pas « retenu », le score à règles reste la référence.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LineChart, Loader2, Play, Trash2, UserMinus } from "lucide-react";

import { Modal } from "@/components/ui/Modal";
import api from "@/lib/axios";
import { getStoredRole } from "@/lib/access";
import { errorMessage, fmtDateTime } from "@/lib/crud";
import { confirmDialog, toast } from "@/lib/toast";

interface DropoutHistoryRow {
  id: number;
  name: string;
  sampleSize: number;
  trainedAt: string;
  metrics: { verdict?: string | null; message?: string | null; best_model?: string | null; dropouts?: number | null };
}

interface DropoutReport {
  trained_at?: string;
  version?: string;
  stats?: { rows?: number; dropouts?: number; completed?: number; positives?: number };
  decision?: { verdict?: string; message?: string; best_model?: string; pr_auc_gap?: number; sigma?: number; recall_gap?: number };
  metrics?: {
    models?: Record<string, { pr_auc?: { mean: number; std: number }; recall?: { mean: number; std: number } }>;
    curves?: { prevalence?: number | null; points?: Record<string, Array<[number, number]>> };
  };
  models?: Array<{ name: string; pr_auc?: number; recall?: number }>;
  baseline?: { pr_auc?: number; recall?: number };
  [key: string]: unknown;
}

// Histogramme groupé : PR-AUC et rappel par méthode (moyennes de la validation croisée). SVG pur.
function MetricsBars({ models }: { models?: NonNullable<DropoutReport["metrics"]>["models"] }) {
  const entries = Object.entries(models ?? {});
  if (!entries.length) return null;
  const W = 460, H = 260, L = 40, R = 10, T = 14, B = 56;
  const y = (v: number) => T + (1 - Math.max(0, Math.min(1, v))) * (H - T - B);
  const groupW = (W - L - R) / entries.length;
  const barW = Math.min(34, groupW / 3);
  const nice = (n: string) => (n === "baseline_rules" ? "Score à règles" : n === "logistic_regression" ? "Régression logistique" : n === "decision_tree" ? "Arbre de décision" : n);
  const bar = (v: number | undefined, x: number, fill: string) => v === undefined ? null : (
    <g>
      <rect x={x} y={y(v)} width={barW} height={Math.max(0, H - B - y(v))} fill={fill} rx="2" />
      <text x={x + barW / 2} y={y(v) - 4} textAnchor="middle" fontSize="10" fill="#374151">{v.toFixed(2)}</text>
    </g>
  );
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-800">Comparaison des méthodes (histogramme)</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Histogramme PR-AUC et rappel par méthode">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#e5e7eb" />
            <text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#6b7280">{t}</text>
          </g>
        ))}
        {entries.map(([name, v], i) => {
          const cx = L + groupW * i + groupW / 2;
          const base = name === "baseline_rules";
          return (
            <g key={name}>
              {bar(v.pr_auc?.mean, cx - barW - 2, base ? "#d97706" : "#1e40af")}
              {bar(v.recall?.mean, cx + 2, base ? "#fcd34d" : "#93c5fd")}
              <text x={cx} y={H - B + 16} textAnchor="middle" fontSize="11" fill="#374151">{nice(name)}</text>
            </g>
          );
        })}
        <rect x={L} y={H - 16} width="10" height="10" fill="#1e40af" rx="2" />
        <text x={L + 14} y={H - 7} fontSize="10" fill="#374151">PR-AUC (qualité globale)</text>
        <rect x={L + 150} y={H - 16} width="10" height="10" fill="#93c5fd" rx="2" />
        <text x={L + 164} y={H - 7} fontSize="10" fill="#374151">Rappel (abandons détectés)</text>
      </svg>
      <p className="text-xs text-gray-500">Barres foncées : PR-AUC ; barres claires : rappel. Plus la barre est haute, mieux c&apos;est.</p>
    </div>
  );
}

// Courbe précision-rappel (hors-pli) : modèle retenu vs score à règles. SVG pur, sans dépendance.
// Disposition : à gauche la courbe + son commentaire ; à droite l'histogramme + son commentaire ; tableau en bas.
function PrCurve({ report }: { report: DropoutReport }) {
  const curves = report.metrics?.curves;
  const best = report.decision?.best_model ?? "";
  const model = curves?.points?.[best];
  const base = curves?.points?.baseline_rules;
  const mm = report.metrics?.models;
  const W = 480, H = 300, L = 44, R = 66, T = 12, B = 38;
  const x = (r: number) => L + r * (W - L - R);
  const y = (p: number) => T + (1 - p) * (H - T - B);
  const path = (pts?: Array<[number, number]>) => (pts ?? []).map(([r, p], i) => `${i ? "L" : "M"}${x(r).toFixed(1)},${y(p).toFixed(1)}`).join(" ");
  const f = (v?: number) => (v === undefined ? "—" : v.toFixed(3));
  const pct = (v: number) => `${Math.round(v * 100)} %`;
  const prev = curves?.prevalence;
  const at = (pts: Array<[number, number]> | undefined, r: number) => pts?.find((q) => Math.abs(q[0] - r) < 1e-6)?.[1];

  // --- commentaire de la courbe (calculé à partir des points : il change avec la courbe) ---
  const m50 = at(model, 0.5), b50 = at(base, 0.5);
  const above = model && base ? model.filter((q, i) => q[1] > (base[i]?.[1] ?? 0) + 0.005).length : 0;
  const share = model ? above / model.length : 0;
  const curveVerdict = share >= 0.75 ? "au-dessus des règles presque partout : le modèle fait moins de fausses alertes."
    : share >= 0.4 ? "au-dessus des règles sur une partie seulement : avantage partiel."
    : "rarement au-dessus des règles : pas d'avantage net.";

  // --- commentaire de l'histogramme (calculé à partir des métriques) ---
  const mb = mm?.baseline_rules, mmod = mm?.[best];
  const gap = report.decision?.pr_auc_gap, sigma = report.decision?.sigma;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---------- GAUCHE : courbe + commentaire ---------- */}
        <section className="space-y-3">
          <p className="text-sm font-semibold text-gray-800">Courbe précision-rappel</p>
          {model && base ? (
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Courbe précision-rappel">
              {[0, 0.25, 0.5, 0.75, 1].map((t) => (
                <g key={t}>
                  <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#e5e7eb" />
                  <text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#6b7280">{t}</text>
                  <line y1={T} y2={H - B} x1={x(t)} x2={x(t)} stroke="#f3f4f6" />
                  <text x={x(t)} y={H - B + 14} textAnchor="middle" fontSize="10" fill="#6b7280">{t}</text>
                </g>
              ))}
              {typeof prev === "number" && <line x1={L} x2={W - R} y1={y(prev)} y2={y(prev)} stroke="#9ca3af" strokeDasharray="2 3" />}
              <path d={path(base)} fill="none" stroke="#d97706" strokeWidth="2" strokeDasharray="5 4" />
              <path d={path(model)} fill="none" stroke="#1e40af" strokeWidth="2.5" />
              {(() => {
                // Étiquettes au bout des courbes (côté droit), écartées d'au moins 14 px pour ne pas se chevaucher.
                const ym = y(model[model.length - 1]?.[1] ?? 0.5) + 4;
                let yb = y(base[base.length - 1]?.[1] ?? 0.4) + 4;
                if (Math.abs(ym - yb) < 14) yb = ym + 14;
                return (
                  <>
                    <text x={x(1) + 6} y={ym} fontSize="11" fontWeight="600" fill="#1e40af">Modèle</text>
                    <text x={x(1) + 6} y={yb} fontSize="11" fontWeight="600" fill="#b45309">Règles</text>
                  </>
                );
              })()}
              {typeof prev === "number" && <text x={x(0.02)} y={y(prev) - 5} fontSize="10" fill="#6b7280">Hasard</text>}
              <text x={L + 6} y={y(0.08)} fontSize="10" fill="#15803d">↑ plus haut = meilleur</text>
              <text x={(L + W - R) / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="#374151">Rappel (abandons détectés)</text>
              <text transform={`translate(12 ${(T + H - B) / 2}) rotate(-90)`} textAnchor="middle" fontSize="11" fill="#374151">Précision</text>
            </svg>
          ) : (
            <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              La courbe détaillée n&apos;est pas dans ce rapport : relancer « Entraîner le modèle d&apos;abandon » (après redémarrage du ml-service mis à jour) pour la générer.
            </p>
          )}
          <div className="flex flex-wrap gap-4 text-xs text-gray-600">
            <span className="inline-flex items-center gap-2"><span className="h-0.5 w-6 bg-blue-800" />{best || "Modèle"}</span>
            <span className="inline-flex items-center gap-2"><span className="h-0.5 w-6 border-t-2 border-dashed border-amber-600" />Score à règles</span>
            {typeof prev === "number" && <span className="inline-flex items-center gap-2"><span className="h-0.5 w-6 border-t-2 border-dotted border-gray-400" />Hasard ({(prev * 100).toFixed(0)} % d&apos;abandons)</span>}
          </div>
          {model && base && (
            <div className="space-y-2 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-gray-800">
              <p className="font-semibold text-blue-900">À retenir</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Courbe bleue {curveVerdict}</li>
                {m50 !== undefined && b50 !== undefined && <li>Pour retrouver <b>la moitié des abandons</b> : {pct(m50)} de vraies alertes (modèle) contre {pct(b50)} (règles).</li>}
              </ul>
            </div>
          )}
        </section>

        {/* ---------- DROITE : histogramme + commentaire ---------- */}
        <section className="space-y-3">
          <MetricsBars models={mm} />
          {mb && mmod && (
            <div className="space-y-2 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-gray-800">
              <p className="font-semibold text-blue-900">À retenir</p>
              <ul className="list-disc space-y-1 pl-5">
                <li><b>PR-AUC</b> : {f(mmod.pr_auc?.mean)} (modèle) contre {f(mb.pr_auc?.mean)} (règles)
                  {gap !== undefined && sigma !== undefined && <> : écart {gap >= 0 ? "+" : ""}{f(gap)} {gap > sigma ? ">" : "≤"} σ {f(sigma)}</>}.</li>
                {(mb.recall?.mean ?? 1) < 0.1 && <li>Rappel des règles très bas avec ces données : se fier surtout au PR-AUC.</li>}
                <li>Verdict : <b>{report.decision?.verdict === "retenu" ? "modèle retenu" : "non concluant, règles conservées"}</b>.</li>
              </ul>
              <p className="text-xs text-gray-500">Si les données sont de démonstration (synthétiques), cela illustre le fonctionnement, pas la performance réelle.</p>
            </div>
          )}
        </section>
      </div>

      <table className="w-full text-sm">
        <thead><tr className="text-left text-xs text-gray-500"><th className="py-1">Méthode</th><th>PR-AUC</th><th>Rappel</th></tr></thead>
        <tbody>
          {Object.entries(mm ?? {}).map(([name, v]) => (
            <tr key={name} className="border-t border-gray-100">
              <td className="py-1">{name === "baseline_rules" ? "Score à règles (référence)" : name}</td>
              <td>{f(v.pr_auc?.mean)} <span className="text-xs text-gray-400">± {f(v.pr_auc?.std)}</span></td>
              <td>{f(v.recall?.mean)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DropoutTrainCard() {
  const [canTrain, setCanTrain] = useState(false);
  const [report, setReport] = useState<DropoutReport | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showCurve, setShowCurve] = useState(false);
  const [history, setHistory] = useState<DropoutHistoryRow[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await api.get("/ai/dropout/history");
      setHistory(res.data?.data ?? []);
    } catch {
      setHistory([]);
    }
  }, []);

  const removeRow = async (row: DropoutHistoryRow) => {
    const ok = await confirmDialog(`Supprimer l'entraînement du ${fmtDateTime(row.trainedAt)} ? Cette action est définitive.`, {
      title: "Supprimer cet entraînement",
      confirmLabel: "Supprimer",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/ai/models/${row.id}`);
      toast.success("Entraînement supprimé.");
      await loadHistory();
    } catch (err) {
      toast.error(errorMessage(err, "Suppression impossible."));
    }
  };

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
    // Le rapport n'est PAS chargé à l'ouverture : il n'apparaît qu'après un clic sur « Entraîner le modèle d'abandon ».
    void loadHistory();
  }, [loadHistory]);

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
      await loadHistory();
    } catch (err) {
      // 422 = données insuffisantes : message métier, pas une panne
      toast.warning(errorMessage(err, "Entraînement impossible."));
    } finally {
      setBusy(false);
    }
  };

  const verdict = report?.decision?.verdict;

  return (
    <div className="space-y-6">
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
            {report.stats?.rows !== undefined && (
              <span>
                <Link href="/parcours" className="font-medium text-blue-800 underline-offset-2 hover:underline" title="Voir tous les parcours">
                  {report.stats.rows} parcours
                </Link>
                {" · "}
                <Link href="/parcours?status=DROPPED_OUT" className="font-medium text-blue-800 underline-offset-2 hover:underline" title="Voir les parcours en abandon">
                  {report.stats.dropouts ?? report.stats.positives ?? 0} abandons
                </Link>
              </span>
            )}
            {report.trained_at && <span className="text-xs text-gray-400">{fmtDateTime(report.trained_at)}</span>}
          </div>
          {report.decision?.message && (
            <button type="button" onClick={() => setShowCurve(true)} className="mt-2 block w-full rounded-lg text-left hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" title="Voir la courbe précision-rappel">
              <span>{report.decision.message}</span>
              <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-800 underline">
                <LineChart className="h-3.5 w-3.5" /> Voir la courbe
              </span>
            </button>
          )}
        </div>
      ) : (
        message && <p className="text-sm text-gray-500">{message}</p>
      )}
      <Modal isOpen={showCurve} onClose={() => setShowCurve(false)} title="Courbe précision-rappel" description="Modèle d'abandon comparé au score à règles" size="xl" className="max-w-6xl">
        {report && <PrCurve report={report} />}
      </Modal>
    </div>

    <details className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <summary className="cursor-pointer font-semibold text-gray-900">Historique des entraînements ({history.length})</summary>
      <div className="mt-3" />
      {history.length === 0 && <p className="text-sm text-gray-500">Aucun entraînement.</p>}
      <div className="divide-y divide-gray-100">
        {history.map((row) => (
          <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
            <span className="font-medium text-gray-900">{row.metrics.best_model ?? row.name.replace("dropout-", "")}</span>
            <span className="text-gray-500">
              {row.sampleSize} parcours{row.metrics.dropouts != null ? ` · ${row.metrics.dropouts} abandons` : ""} ·{" "}
              {row.metrics.verdict === "retenu" ? "modèle retenu" : "non concluant"}
            </span>
            <span className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{fmtDateTime(row.trainedAt)}</span>
              {canTrain && (
                <button
                  type="button"
                  onClick={() => void removeRow(row)}
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
    </div>
  );
}
