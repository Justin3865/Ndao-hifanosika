"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Play, Trash2, Trophy } from "lucide-react";
import api from "@/lib/axios";
import { getStoredRole } from "@/lib/access";
import { errorMessage } from "@/lib/crud";
import { confirmDialog, toast } from "@/lib/toast";
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

interface TestRun {
  id: number;
  at: string;
  sampleSize: number;
  positives: number | null;
  folds: number | null;
  reliability: Report["reliability"] | null;
  best: { key: string; name: string; auc: number; f1: number; accuracy: number } | null;
  ranking: Array<{ key: string; name: string; auc: number; f1: number; accuracy: number; rank: number }>;
  vulnerableSource: "saved" | "current";
  vulnerableHouseholds: Array<{ id: number; name: string; projectName: string; locality: string | null; ensemble: number; scores: Record<string, number> }>;
}

const fmtDate = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const COLORS: Record<string, string> = { sgd: PALETTE.blue, mlp: PALETTE.purple, nb: PALETTE.green, knn: PALETTE.amber, ensemble: PALETTE.red };
const pct = (v: number) => `${Math.round(v * 100)} %`;
const fmt = (v: number) => (Math.round(v * 100) / 100).toFixed(2);

/**
 * Laboratoire de comparaison : toutes les méthodes d'apprentissage testées sur les ménages de la base,
 * courbes superposées, éléments communs, et mise en évidence du meilleur modèle.
 */
export function ModelsLab({ onChanged }: { onChanged?: () => void } = {}) {
  const [report, setReport] = useState<Report | null>(null);
  const [history, setHistory] = useState<History[]>([]);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [canTrain, setCanTrain] = useState(false);
  const [selected, setSelected] = useState("");
  const [openRun, setOpenRun] = useState<number | null>(null);
  const [more, setMore] = useState(false);

  const load = useCallback(async () => {
    try {
      const [cmp, hist, tests] = await Promise.all([
        api.get("/ai/compare"),
        api.get("/ai/models/history"),
        api.get("/ai/compare/history").catch(() => null),
      ]);
      setReport(cmp.data?.data ?? null);
      setHistory(hist.data?.data ?? []);
      setRuns(tests?.data?.data ?? []);
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

  const removeRun = async (r: TestRun) => {
    const ok = await confirmDialog(`Supprimer le test du ${fmtDate(r.at)} ? Cette action est définitive.`, {
      title: "Supprimer ce test",
      confirmLabel: "Supprimer",
      danger: true,
    });
    if (!ok) return;

    try {
      await api.delete(`/ai/models/${r.id}`);
      toast.success("Test supprimé.");
      if (openRun === r.id) setOpenRun(null);
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(errorMessage(err, "Suppression impossible."));
    }
  };

  const run = async () => {
    setBusy(true);
    try {
      const res = await api.post("/ai/compare/run");
      setReport(res.data?.data ?? null);
      toast.success("Comparaison relancée et enregistrée.");
      const [hist, tests] = await Promise.all([api.get("/ai/models/history"), api.get("/ai/compare/history").catch(() => null)]);
      setHistory(hist.data?.data ?? []);
      setRuns(tests?.data?.data ?? []);
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
          <h2 className="text-lg font-bold text-gray-900">Comparaison des méthodes (ménages)</h2>
        </div>
        {canTrain && (
          <button type="button" onClick={run} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Relancer les tests
          </button>
        )}
      </div>

      <ChartCard title="Historique des tests">
        {runs.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun test enregistré.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="text-left text-xs text-gray-500">
                <tr><th className="py-2">Date</th><th>Meilleur modèle</th><th>AUC</th><th>F1</th><th>Exactitude</th><th>Ménages</th><th>Fiabilité</th><th className="text-right">Action</th></tr>
              </thead>
              <tbody>
                {runs.map((r, i) => {
                  const isOpen = openRun === r.id;
                  const count = r.vulnerableHouseholds.length;
                  return (
                    <Fragment key={r.id}>
                      <tr className="border-t border-gray-100 text-gray-700">
                        <td className="py-2 pr-2 whitespace-nowrap">{fmtDate(r.at)}{i === 0 && <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800">Dernier</span>}</td>
                        <td className="font-medium text-gray-900">{r.best ? `🏆 ${r.best.name}` : "—"}</td>
                        <td>{r.best ? fmt(r.best.auc) : "—"}</td>
                        <td>{r.best ? fmt(r.best.f1) : "—"}</td>
                        <td>{r.best ? pct(r.best.accuracy) : "—"}</td>
                        <td>
                          {r.sampleSize}
                          {r.positives !== null && (
                            <button type="button" onClick={() => setOpenRun(isOpen ? null : r.id)} className="ml-1 font-medium text-sky-700 underline decoration-dotted hover:text-sky-900">
                              ({r.positives} vulnérables)
                            </button>
                          )}
                        </td>
                        <td className="text-xs">{r.reliability ? r.reliability.toLowerCase() : "—"}</td>
                        <td className="py-1 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setOpenRun(isOpen ? null : r.id)}
                              title="Détails"
                              aria-label="Détails"
                              aria-expanded={isOpen}
                              className="inline-flex items-center rounded-lg border border-sky-200 bg-sky-50 p-1.5 text-sky-800 hover:bg-sky-100"
                            >
                              {isOpen ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                            {canTrain && (
                              <button
                                type="button"
                                onClick={() => void removeRun(r)}
                                title="Supprimer ce test"
                                aria-label="Supprimer ce test"
                                className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-700 hover:bg-red-100"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-t border-gray-100">
                          <td colSpan={8} className="bg-gray-50 p-4">
                            <div className="grid gap-4 lg:grid-cols-2">
                              <div>
                                <p className="mb-2 text-sm font-semibold text-gray-900">Ménages vulnérables ({count})</p>
                                {r.vulnerableSource === "current" && (
                                  <p className="mb-2 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-xs text-sky-800">
                                    Ce test est ancien : la liste n&apos;avait pas été enregistrée, voici la liste actuelle. Les prochains tests la conserveront.
                                  </p>
                                )}
                                {count === 0 ? (
                                  <p className="text-xs text-gray-500">Aucun ménage vulnérable.</p>
                                ) : (
                                  <ul className="max-h-64 divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-200 bg-white text-sm">
                                    {r.vulnerableHouseholds.map((h) => (
                                      <li key={h.id} className="flex items-center justify-between gap-2 px-3 py-2">
                                        <span className="min-w-0">
                                          <span className="block truncate font-medium text-gray-900">{h.name}</span>
                                          <span className="block truncate text-xs text-gray-500">{[h.projectName, h.locality].filter(Boolean).join(" · ")}</span>
                                        </span>
                                        {r.vulnerableSource === "saved" && <span className="shrink-0 text-xs font-semibold text-gray-700">{h.ensemble} %</span>}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                              <div>
                                <p className="mb-2 text-sm font-semibold text-gray-900">Classement des méthodes lors de ce test</p>
                                <table className="w-full text-xs">
                                  <thead className="text-left text-gray-500"><tr><th className="py-1">#</th><th>Méthode</th><th>AUC</th><th>F1</th><th>Exact.</th></tr></thead>
                                  <tbody>
                                    {r.ranking.map((x) => (
                                      <tr key={x.key} className="border-t border-gray-100 text-gray-700">
                                        <td className="py-1">{x.rank}</td><td>{x.name}</td><td>{fmt(x.auc)}</td><td>{fmt(x.f1)}</td><td>{pct(x.accuracy)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>

      {!report?.available && (
        <p className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">{report?.reason ?? "Données insuffisantes pour comparer les méthodes."} <Link href="/ai/vulnerability" className="font-semibold underline">Voir les ménages</Link></p>
      )}

      {report?.available && report.best && (
        <>
          <div className="flex flex-wrap items-center gap-4 rounded-3xl bg-blue-800 p-6 text-white shadow-lg">
            <Trophy className="h-10 w-10 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-90">Meilleur modèle</p>
              <p className="text-2xl font-bold">{report.best.name}</p>
              <p className="text-sm opacity-95">AUC {fmt(report.best.auc)} · F1 {fmt(report.best.f1)} · exactitude {pct(report.best.accuracy)} · {report.sampleSize} ménages ({report.positives} vulnérables) · fiabilité {report.reliability.toLowerCase()}</p>
            </div>
          </div>

          <ChartCard title="Classement des méthodes">
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

          <button type="button" onClick={() => setMore((v) => !v)} className="rounded-xl bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900">
            {more ? "Masquer" : "Voir"} les graphiques détaillés
          </button>

          {more && (
          <>
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
              <p className="mb-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">Aucune variable n&apos;est dans le top 5 de toutes les méthodes : les méthodes ne s&apos;accordent pas encore (échantillon petit).</p>
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
        </>
      )}

      {more && history.length > 0 && (
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
