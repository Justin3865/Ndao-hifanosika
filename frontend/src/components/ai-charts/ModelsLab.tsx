"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Play, Trophy } from "lucide-react";
import api from "@/lib/axios";
import { getStoredRole } from "@/lib/access";
import { errorMessage } from "@/lib/crud";
import { toast } from "@/lib/toast";
import { BarChart, ChartCard, GroupedBars, Legend, LineChart, PALETTE } from "./charts";

interface Metrics { accuracy: number; precision: number; recall: number; f1: number; auc: number }

interface Method {
  key: string;
  name: string;
  kind: string;
  metrics: Metrics;
  cv: { aucMean: number; aucStd: number; foldAucs: number[] };
  trainAuc: number;
  roc: Array<{ x: number; y: number }>;
  histogram: { edges: number[]; positives: number[]; negatives: number[] };
  learning: Array<{ fraction: number; nTrain: number; trainAuc: number | null; valAuc: number | null }>;
  importance: Array<{ feature: string; value: number }>;
}

interface Report {
  available: boolean;
  reason?: string;
  generatedAt: string;
  sampleSize: number;
  positives: number;
  folds: number;
  reliability: "INSUFFISANTE" | "FAIBLE" | "CORRECTE";
  methods: Method[];
  baseline: Metrics;
  best: { key: string; name: string; auc: number; f1: number; accuracy: number } | null;
  ranking: Array<{ key: string; name: string; auc: number; f1: number; accuracy: number; rank: number }>;
  common: { inAllMethods: string[]; top: Array<{ feature: string; mean: number; agreement: number; perMethod: Record<string, number> }> };
  consensusHouseholds: Array<{ id: number; name: string; projectName: string; flagged: boolean; ensemble: number; scores: Record<string, number> }>;
  disagreements: Array<{ id: number; name: string; projectName: string; flagged: boolean; spread: number; scores: Record<string, number> }>;
}

interface History { name: string; points: Array<{ at: string; auc: number | null; accuracy: number | null; sampleSize: number }> }

const COLORS: Record<string, string> = { sgd: PALETTE.blue, mlp: PALETTE.purple, nb: PALETTE.green, knn: PALETTE.amber, ensemble: PALETTE.red };
const pct = (v: number) => `${Math.round(v * 100)} %`;
const fmt = (v: number) => (Math.round(v * 100) / 100).toFixed(2);

/**
 * Laboratoire de comparaison : toutes les méthodes d'apprentissage testées sur les ménages de la base,
 * courbes superposées, éléments communs, et mise en évidence du meilleur modèle.
 */
export function ModelsLab() {
  const [report, setReport] = useState<Report | null>(null);
  const [history, setHistory] = useState<History[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [canTrain, setCanTrain] = useState(false);
  const [selected, setSelected] = useState("");

  const load = useCallback(async () => {
    try {
      const [cmp, hist] = await Promise.all([api.get("/ai/compare"), api.get("/ai/models/history")]);
      setReport(cmp.data?.data ?? null);
      setHistory(hist.data?.data ?? []);
      setError("");
    } catch (err) {
      setError(errorMessage(err, "Comparaison indisponible."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setCanTrain(["ADMIN", "DSI"].includes(getStoredRole()));
    void load();
  }, [load]);

  const run = async () => {
    setBusy(true);
    try {
      const res = await api.post("/ai/compare/run");
      setReport(res.data?.data ?? null);
      toast.success("Comparaison relancée et enregistrée.");
      const hist = await api.get("/ai/models/history");
      setHistory(hist.data?.data ?? []);
    } catch (err) {
      toast.error(errorMessage(err, "Échec de la comparaison."));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="flex items-center gap-2 p-6 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Comparaison des méthodes…</div>;
  if (error) return <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>;

  const methods = report?.methods ?? [];
  const best = report?.best?.key ?? "";
  const current = methods.find((m) => m.key === (selected || best)) ?? methods[0];
  const colorOf = (key: string) => COLORS[key] ?? PALETTE.slate;
  const shortName = (m: Method) => m.name.split(" (")[0];

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Comparaison de toutes les méthodes d&apos;apprentissage</h2>
          <p className="text-sm text-gray-500">Chaque méthode est testée par validation croisée sur les ménages de la base ; les courbes sont superposées.</p>
        </div>
        {canTrain && (
          <button type="button" onClick={run} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Relancer les tests
          </button>
        )}
      </div>

      {!report?.available && (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{report?.reason ?? "Données insuffisantes pour comparer les méthodes."} <Link href="/ai/vulnerability" className="font-semibold underline">Voir les ménages</Link></p>
      )}

      {report?.available && report.best && (
        <>
          <div className="flex flex-wrap items-center gap-4 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-600 p-6 text-white shadow-lg">
            <Trophy className="h-10 w-10 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-90">Meilleur modèle (résultat le plus élevé aux tests)</p>
              <p className="text-2xl font-bold">{report.best.name}</p>
              <p className="text-sm opacity-95">AUC {fmt(report.best.auc)} · F1 {fmt(report.best.f1)} · exactitude {pct(report.best.accuracy)} — sur {report.sampleSize} ménages ({report.positives} vulnérables), {report.folds} plis</p>
            </div>
          </div>

          {report.reliability !== "CORRECTE" && (
            <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
              Fiabilité {report.reliability.toLowerCase()} : l&apos;échantillon est petit, les écarts entre méthodes peuvent être dus au hasard. Plus il y aura de ménages enquêtés, plus le classement sera fiable.
            </p>
          )}

          <ChartCard title="Classement des méthodes" subtitle="Trié par AUC puis F1 (validation croisée = test hors échantillon)">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-gray-500">
                  <tr><th className="py-2">#</th><th>Méthode</th><th>AUC</th><th>F1</th><th>Exactitude</th><th>AUC entraînement</th></tr>
                </thead>
                <tbody>
                  {report.ranking.map((r) => {
                    const m = methods.find((x) => x.key === r.key) as Method;
                    const isBest = r.key === best;
                    return (
                      <tr key={r.key} className={`border-t border-gray-100 ${isBest ? "bg-amber-50 font-semibold text-amber-900" : "text-gray-700"}`}>
                        <td className="py-2 pr-2">{isBest ? "🏆" : r.rank}</td>
                        <td><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: colorOf(r.key) }} />{r.name}</td>
                        <td>{fmt(r.auc)} <span className="text-xs font-normal text-gray-400">±{fmt(m.cv.aucStd)}</span></td>
                        <td>{fmt(r.f1)}</td>
                        <td>{pct(r.accuracy)}</td>
                        <td className={m.trainAuc - r.auc > 0.1 ? "text-red-600" : ""}>{fmt(m.trainAuc)}{m.trainAuc - r.auc > 0.1 ? " (sur-apprentissage)" : ""}</td>
                      </tr>
                    );
                  })}
                  <tr className="border-t border-gray-100 text-gray-400"><td className="py-2" /><td>Référence (classe majoritaire)</td><td>{fmt(report.baseline.auc)}</td><td>{fmt(report.baseline.f1)}</td><td>{pct(report.baseline.accuracy)}</td><td /></tr>
                </tbody>
              </table>
            </div>
          </ChartCard>

          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard title="Courbes ROC superposées" subtitle="Plus la courbe épouse le coin haut-gauche, meilleur est le modèle (diagonale = hasard)">
              <LineChart
                xDomain={[0, 1]}
                yDomain={[0, 1]}
                diagonal
                xLabel="Faux positifs"
                yLabel="Vrais positifs"
                series={methods.map((m) => ({ name: m.name, color: colorOf(m.key), points: m.roc, highlight: m.key === best, width: 2 }))}
              />
              <Legend items={methods.map((m) => ({ label: `${m.key === best ? "🏆 " : ""}${shortName(m)} (AUC ${fmt(m.metrics.auc)})`, color: colorOf(m.key) }))} />
            </ChartCard>

            <ChartCard title="Métriques côte à côte" subtitle="Exactitude, précision, rappel, F1 et AUC de chaque méthode (le contour jaune = meilleur)">
              <GroupedBars
                categories={["Exactitude", "Précision", "Rappel", "F1", "AUC"]}
                highlight={report.best.name}
                series={methods.map((m) => ({ name: m.name, color: colorOf(m.key), values: [m.metrics.accuracy, m.metrics.precision, m.metrics.recall, m.metrics.f1, m.metrics.auc] }))}
              />
              <Legend items={methods.map((m) => ({ label: shortName(m), color: colorOf(m.key) }))} />
            </ChartCard>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard title="Courbes d'apprentissage superposées" subtitle="AUC de validation selon le nombre de ménages utilisés pour apprendre">
              <LineChart
                yDomain={[0, 1]}
                xLabel="Ménages d'entraînement"
                yLabel="AUC (validation)"
                format={(v) => (v <= 1 ? String(Math.round(v * 100) / 100) : String(Math.round(v)))}
                series={methods.map((m) => ({
                  name: m.name,
                  color: colorOf(m.key),
                  highlight: m.key === best,
                  points: m.learning.filter((l) => l.valAuc !== null).map((l) => ({ x: l.nTrain, y: l.valAuc as number })),
                }))}
              />
              <Legend items={methods.map((m) => ({ label: shortName(m), color: colorOf(m.key) }))} />
            </ChartCard>

            <ChartCard title="AUC par pli de validation" subtitle="Stabilité : des points proches = méthode régulière">
              <LineChart
                yDomain={[0, 1]}
                xLabel="Pli"
                xTicks={Array.from({ length: report.folds }, (_, i) => ({ value: i + 1, label: `#${i + 1}` }))}
                series={methods.filter((m) => m.key !== "ensemble").map((m) => ({ name: m.name, color: colorOf(m.key), points: m.cv.foldAucs.map((a, i) => ({ x: i + 1, y: a })), highlight: m.key === best }))}
              />
              <Legend items={methods.filter((m) => m.key !== "ensemble").map((m) => ({ label: shortName(m), color: colorOf(m.key) }))} />
            </ChartCard>
          </div>

          {current && (
            <ChartCard
              title={`Histogramme des scores — ${shortName(current)}`}
              subtitle="Bleu : ménages non vulnérables · Rouge : vulnérables. Deux bosses bien séparées = modèle qui discrimine bien."
              right={
                <select value={current.key} onChange={(e) => setSelected(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm text-gray-800">
                  {methods.map((m) => <option key={m.key} value={m.key}>{m.key === best ? "🏆 " : ""}{shortName(m)}</option>)}
                </select>
              }
            >
              <BarChart
                histogram
                color={PALETTE.blue}
                color2={PALETTE.red}
                xLabel="Probabilité prédite"
                yLabel="Ménages"
                data={current.histogram.negatives.map((n, i) => ({ label: `${current.histogram.edges[i]}-${current.histogram.edges[i + 1]}`, value: n, value2: current.histogram.positives[i] }))}
              />
            </ChartCard>
          )}

          <ChartCard
            title="Ce qui est commun à toutes les méthodes"
            subtitle="Importance des variables (baisse d'AUC quand on la mélange), normalisée par méthode"
          >
            {report.common.inAllMethods.length > 0 ? (
              <p className="mb-3 rounded-xl bg-green-50 p-3 text-sm text-green-800">
                Variables classées dans le top 5 par <strong>toutes</strong> les méthodes : <strong>{report.common.inAllMethods.join(", ")}</strong>. Ce sont les facteurs de vulnérabilité les plus robustes.
              </p>
            ) : (
              <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Aucune variable n&apos;est dans le top 5 de toutes les méthodes : les méthodes ne s&apos;accordent pas encore (échantillon petit).</p>
            )}
            <GroupedBars
              max={Math.max(0.3, ...report.common.top.flatMap((t) => Object.values(t.perMethod)))}
              categories={report.common.top.map((t) => (t.feature.length > 11 ? `${t.feature.slice(0, 10)}…` : t.feature))}
              series={methods.filter((m) => m.key !== "ensemble").map((m) => ({ name: m.name, color: colorOf(m.key), values: report.common.top.map((t) => t.perMethod[m.key] ?? 0) }))}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <Legend items={methods.filter((m) => m.key !== "ensemble").map((m) => ({ label: shortName(m), color: colorOf(m.key) }))} />
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {report.common.top.map((t) => (
                <span key={t.feature} className={`rounded-full px-3 py-1 font-medium ${t.agreement >= 4 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{t.feature} · {t.agreement}/4 méthodes</span>
              ))}
            </div>
          </ChartCard>

          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard title="Ménages sur lesquels toutes les méthodes sont d'accord" subtitle="Score ≥ 50 % chez les 4 méthodes">
              {report.consensusHouseholds.length === 0 && <p className="text-sm text-gray-500">Aucun ménage ne fait l&apos;unanimité.</p>}
              <div className="divide-y divide-gray-100 text-sm">
                {report.consensusHouseholds.map((h) => (
                  <div key={h.id} className="flex items-center justify-between gap-2 py-2">
                    <span className="min-w-0"><span className="font-medium text-gray-900">{h.name}</span><span className="block truncate text-xs text-gray-500">{h.projectName}</span></span>
                    <span className="flex items-center gap-2">
                      {!h.flagged && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">À vérifier</span>}
                      <span className="font-semibold text-gray-900">{h.ensemble} %</span>
                    </span>
                  </div>
                ))}
              </div>
            </ChartCard>

            <ChartCard title="Ménages où les méthodes divergent" subtitle="Écart ≥ 30 points entre la méthode la plus haute et la plus basse">
              {report.disagreements.length === 0 && <p className="text-sm text-gray-500">Les méthodes sont cohérentes entre elles.</p>}
              <div className="divide-y divide-gray-100 text-sm">
                {report.disagreements.map((h) => (
                  <div key={h.id} className="py-2">
                    <div className="flex justify-between"><span className="font-medium text-gray-900">{h.name}</span><span className="text-xs text-gray-500">écart {h.spread} pts</span></div>
                    <div className="mt-1 flex gap-1.5">
                      {Object.entries(h.scores).map(([key, value]) => (
                        <span key={key} className="rounded-md px-2 py-0.5 text-xs font-semibold text-white" style={{ background: colorOf(key) }}>{key.toUpperCase()} {value}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>
        </>
      )}

      {history.length > 0 && (
        <ChartCard title="Évolution des résultats dans la base de données" subtitle="AUC de chaque entraînement enregistré (table AiModel) : les modèles s'améliorent-ils avec plus de données ?">
          <LineChart
            yDomain={[0, 1]}
            xLabel="Entraînement n°"
            format={(v) => (v <= 1 ? String(Math.round(v * 100) / 100) : String(Math.round(v)))}
            series={history.map((h, i) => ({
              name: h.name,
              color: [PALETTE.blue, PALETTE.purple, PALETTE.green, PALETTE.amber, PALETTE.red][i % 5],
              points: h.points.map((p, k) => ({ x: k + 1, y: p.auc ?? 0 })),
            }))}
          />
          <Legend items={history.map((h, i) => ({ label: h.name, color: [PALETTE.blue, PALETTE.purple, PALETTE.green, PALETTE.amber, PALETTE.red][i % 5] }))} />
        </ChartCard>
      )}
    </section>
  );
}
