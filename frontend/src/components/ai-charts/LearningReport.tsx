"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import api from "@/lib/axios";
import { errorMessage } from "@/lib/crud";
import { toast } from "@/lib/toast";

/**
 * « Rapport d'apprentissage » d'un entraînement, présenté comme dans un mémoire :
 * jeu de données (effectifs, variables), découpage, validation croisée, courbe d'apprentissage,
 * matrice de confusion. Toutes les valeurs viennent du rapport enregistré par le backend.
 */

export interface LearningReportData {
  kind: string;
  seed: number;
  testRatio: number;
  positiveText: string;
  negativeText: string;
  counts: { total: number; labeled: number; train: number; test: number; unlabeled: number; positives: number; trainPositives: number; testPositives: number };
  confusion: { tp: number; fp: number; tn: number; fn: number };
  baselineTest: { accuracy: number; auc: number };
  methods: Array<{ key: string; name: string; test: { auc: number }; train: { auc: number } }>;
  stats?: Array<{ name: string; missingPct: number; mean: number; std: number; min: number; max: number; meanPositive: number | null; meanNegative: number | null; effect: number }>;
  cv?: { k: number; results: Array<{ key: string; name: string; aucMean: number; aucStd: number; f1Mean: number; accuracyMean: number; folds: number[] }> } | null;
  curve?: Array<{ size: number; trainAuc: number; testAuc: number }>;
}

const pct = (v: number) => `${Math.round(v * 100)} %`;
const f2 = (v: number) => (Math.round(v * 100) / 100).toFixed(2);

function CurveChart({ points }: { points: NonNullable<LearningReportData["curve"]> }) {
  const W = 420;
  const H = 220;
  const pad = { l: 40, r: 12, t: 12, b: 34 };
  const minAuc = Math.max(0, Math.min(0.5, ...points.flatMap((p) => [p.trainAuc, p.testAuc])) - 0.05);
  const maxSize = Math.max(...points.map((p) => p.size));
  const minSize = Math.min(...points.map((p) => p.size));
  const x = (s: number) => pad.l + ((s - minSize) / Math.max(1, maxSize - minSize)) * (W - pad.l - pad.r);
  const y = (a: number) => pad.t + (1 - (a - minAuc) / (1 - minAuc)) * (H - pad.t - pad.b);
  const path = (key: "trainAuc" | "testAuc") => points.map((p, i) => `${i ? "L" : "M"}${x(p.size).toFixed(1)},${y(p[key]).toFixed(1)}`).join(" ");
  const ticks = [minAuc, (minAuc + 1) / 2, 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-lg" role="img" aria-label="Courbe d'apprentissage : AUC selon la taille de l'entraînement">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#e5e7eb" />
          <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#6b7280">{f2(t)}</text>
        </g>
      ))}
      {points.map((p) => (
        <text key={p.size} x={x(p.size)} y={H - 16} textAnchor="middle" fontSize="10" fill="#6b7280">{p.size}</text>
      ))}
      <text x={(W + pad.l) / 2} y={H - 3} textAnchor="middle" fontSize="10" fill="#6b7280">Lignes d&apos;entraînement utilisées</text>
      <path d={path("trainAuc")} fill="none" stroke="#2563eb" strokeWidth="2" />
      <path d={path("testAuc")} fill="none" stroke="#059669" strokeWidth="2" strokeDasharray="5 3" />
      {points.map((p) => (
        <g key={`pt-${p.size}`}>
          <circle cx={x(p.size)} cy={y(p.trainAuc)} r="3" fill="#2563eb" />
          <circle cx={x(p.size)} cy={y(p.testAuc)} r="3" fill="#059669" />
        </g>
      ))}
    </svg>
  );
}

export function LearningReport({ report }: { report: LearningReportData }) {
  const [busy, setBusy] = useState(false);

  const downloadCsv = async () => {
    setBusy(true);
    try {
      const res = await api.get(`/ai/datasets/${report.kind}/export.csv`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dataset-${report.kind}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(errorMessage(err, "Export impossible."));
    } finally {
      setBusy(false);
    }
  };

  const { counts, confusion: c } = report;
  const ensembleCv = report.cv?.results.find((r) => r.key === "ensemble");
  const topFeatures = [...(report.stats ?? [])].sort((a, b) => b.effect - a.effect);
  const maxEffect = Math.max(0.01, ...topFeatures.map((s) => s.effect));
  const curve = report.curve ?? [];
  const last = curve[curve.length - 1];
  const gap = last ? last.trainAuc - last.testAuc : null;

  return (
    <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-semibold text-gray-900">Rapport d&apos;apprentissage</h3>
        <button
          type="button"
          onClick={() => void downloadCsv()}
          disabled={busy}
          title="Jeu de données au format CSV, lisible par l'application Python (ml/train_report.py)"
          className="ml-auto inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Exporter en CSV (Python)
        </button>
      </div>

      {/* 1. Jeu de données et découpage */}
      <section className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-800">1. Jeu de données et découpage</h4>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="text-xs uppercase text-gray-500">
              <tr>{["Liste", "Lignes", `« ${report.positiveText} »`, "Part"].map((h) => <th key={h} className="py-2 pr-4 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                ["Avec résultat connu", counts.labeled, counts.positives],
                [`Entraînement (${Math.round((1 - report.testRatio) * 100)} %)`, counts.train, counts.trainPositives],
                [`Test (${Math.round(report.testRatio * 100)} %)`, counts.test, counts.testPositives],
              ].map(([label, n, p]) => (
                <tr key={String(label)}>
                  <td className="py-2 pr-4 font-medium text-gray-900">{label}</td>
                  <td className="pr-4">{n}</td>
                  <td className="pr-4">{p}</td>
                  <td className="pr-4">{Number(n) ? pct(Number(p) / Number(n)) : "—"}</td>
                </tr>
              ))}
              {counts.unlabeled > 0 && (
                <tr><td className="py-2 pr-4 font-medium text-gray-900">À tester (résultat inconnu)</td><td className="pr-4">{counts.unlabeled}</td><td className="pr-4">—</td><td className="pr-4">—</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500">
          Tirage stratifié (graine {report.seed}) : les deux classes gardent la même proportion dans les deux listes. Les valeurs manquantes sont remplacées par la moyenne de l&apos;ENTRAÎNEMENT, puis les variables sont normalisées (moyenne et écart-type appris sur l&apos;entraînement seul, sans fuite vers le test).
        </p>
      </section>

      {/* 2. Variables */}
      {topFeatures.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-800">2. Variables d&apos;entrée (liste d&apos;entraînement)</h4>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase text-gray-500">
                <tr>
                  {["Variable", "Moyenne", "Écart-type", "Min – Max", "Manquant", `Moy. « ${report.positiveText.toLowerCase()} »`, `Moy. « ${report.negativeText.toLowerCase()} »`, "Pouvoir séparateur"].map((h) => (
                    <th key={h} className="py-2 pr-3 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topFeatures.map((s) => (
                  <tr key={s.name}>
                    <td className="py-2 pr-3 font-medium text-gray-900">{s.name}</td>
                    <td className="pr-3">{s.mean}</td>
                    <td className="pr-3">{s.std}</td>
                    <td className="pr-3">{s.min} – {s.max}</td>
                    <td className="pr-3">{s.missingPct} %</td>
                    <td className="pr-3">{s.meanPositive ?? "—"}</td>
                    <td className="pr-3">{s.meanNegative ?? "—"}</td>
                    <td className="pr-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-blue-600" style={{ width: `${(s.effect / maxEffect) * 100}%` }} />
                        </div>
                        {s.effect}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500">Pouvoir séparateur = écart entre les moyennes des deux classes divisé par l&apos;écart-type commun (trié du plus au moins discriminant). C&apos;est une indication descriptive, pas une causalité.</p>
        </section>
      )}

      {/* 3. Validation croisée */}
      <section className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-800">3. Validation croisée{report.cv ? ` (${report.cv.k} plis, entraînement seul)` : ""}</h4>
        {report.cv ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="text-xs uppercase text-gray-500">
                  <tr>{["Modèle", "AUC moyenne", "± écart-type", "F1 moyen", "Exactitude", "AUC par pli"].map((h) => <th key={h} className="py-2 pr-3 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.cv.results.map((r) => (
                    <tr key={r.key} className={r.key === "ensemble" ? "bg-emerald-50/60" : undefined}>
                      <td className="py-2 pr-3 font-medium text-gray-900">{r.name.split(" (")[0]}</td>
                      <td className="pr-3">{f2(r.aucMean)}</td>
                      <td className="pr-3">{f2(r.aucStd)}</td>
                      <td className="pr-3">{f2(r.f1Mean)}</td>
                      <td className="pr-3">{pct(r.accuracyMean)}</td>
                      <td className="pr-3 text-xs text-gray-500">{r.folds.map(f2).join(" · ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {ensembleCv && (
              <p className="text-xs text-gray-500">
                {ensembleCv.aucStd <= 0.05 ? "Résultat stable d'un découpage à l'autre" : "Résultat variable selon le découpage : peu de données, à interpréter avec prudence"} (AUC de l&apos;ensemble {f2(ensembleCv.aucMean)} ± {f2(ensembleCv.aucStd)}).
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-gray-500">Non calculée : il faut au moins 2 lignes de chaque classe par pli (ou le jeu est trop gros pour un calcul à la demande).</p>
        )}
      </section>

      {/* 4. Courbe d'apprentissage */}
      <section className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-800">4. Courbe d&apos;apprentissage (ensemble)</h4>
        {curve.length >= 2 ? (
          <>
            <CurveChart points={curve} />
            <div className="flex flex-wrap gap-4 text-xs text-gray-600">
              <span className="inline-flex items-center gap-1"><span className="h-0.5 w-5 bg-blue-600" /> AUC sur les lignes d&apos;entraînement utilisées</span>
              <span className="inline-flex items-center gap-1"><span className="h-0.5 w-5 border-t-2 border-dashed border-emerald-600" /> AUC sur la liste de test</span>
            </div>
            {gap !== null && (
              <p className="text-xs text-gray-500">
                {gap > 0.15
                  ? "Écart important entre entraînement et test : sur-apprentissage probable, plus de données aideraient."
                  : last && last.testAuc < 0.65
                    ? "Les deux courbes restent basses : les variables actuelles expliquent peu le résultat."
                    : "Les deux courbes se rapprochent : pas de sur-apprentissage notable."}
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-gray-500">Non calculée (au moins 10 lignes d&apos;entraînement nécessaires).</p>
        )}
      </section>

      {/* 5. Matrice de confusion */}
      <section className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-800">5. Matrice de confusion (liste de test, ensemble)</h4>
        <table className="text-center text-sm">
          <thead>
            <tr>
              <th />
              <th className="px-3 py-1 text-xs font-semibold text-gray-500">Prédit « {report.positiveText.toLowerCase()} »</th>
              <th className="px-3 py-1 text-xs font-semibold text-gray-500">Prédit « {report.negativeText.toLowerCase()} »</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th className="pr-3 text-left text-xs font-semibold text-gray-500">Réel « {report.positiveText.toLowerCase()} »</th>
              <td className="rounded-lg bg-emerald-100 px-6 py-3 font-bold text-emerald-800" title="Vrais positifs">{c.tp}</td>
              <td className="rounded-lg bg-red-50 px-6 py-3 font-bold text-red-700" title="Cas manqués">{c.fn}</td>
            </tr>
            <tr>
              <th className="pr-3 text-left text-xs font-semibold text-gray-500">Réel « {report.negativeText.toLowerCase()} »</th>
              <td className="rounded-lg bg-red-50 px-6 py-3 font-bold text-red-700" title="Fausses alertes">{c.fp}</td>
              <td className="rounded-lg bg-emerald-100 px-6 py-3 font-bold text-emerald-800" title="Vrais négatifs">{c.tn}</td>
            </tr>
          </tbody>
        </table>
        <p className="text-xs text-gray-500">
          Référence « toujours la classe majoritaire » : exactitude {pct(report.baselineTest.accuracy)}. Un modèle n&apos;est utile que s&apos;il fait nettement mieux que cette référence.
        </p>
      </section>
    </div>
  );
}
