"use client";

import { useEffect, useMemo, useState } from "react";
import { Layers } from "lucide-react";
import api from "@/lib/axios";
import { BarChart, LineChart } from "./svgCharts";

export interface CurvePoint { x: number; y: number }

export interface Curves {
  roc: CurvePoint[];
  pr: CurvePoint[];
  histogram: { bins: number[]; vulnerable: number[]; other: number[] };
  lossCurve?: number[];
}

export interface ChartMetrics {
  accuracy: number; precision: number; recall: number; f1: number; auc: number;
  curves?: Curves;
}

export interface ChartModel { name: string; kind: string; metrics: ChartMetrics }

const COLORS = { sgd: "#3b82f6", mlp: "#a855f7", rules: "#f59e0b", mean: "#22c55e", baseline: "#94a3b8" };

const colorOf = (kind: string, index: number) =>
  /sgd/i.test(kind) ? COLORS.sgd : /mlp/i.test(kind) ? COLORS.mlp : [COLORS.sgd, COLORS.mlp][index % 2];

const shortName = (name: string) => (/sgd|logist/i.test(name) ? "SGD" : /mlp|neurone/i.test(name) ? "MLP" : name);

/** Courbes ROC / précision-rappel, histogrammes des scores, perte du MLP et comparaison des métriques. */
export function ModelCharts({ models, baseline }: { models: ChartModel[]; baseline?: ChartMetrics | null }) {
  const withCurves = models.filter((m) => m.metrics?.curves);

  if (models.length === 0) return null;

  const metricGroups = [
    { key: "accuracy", label: "Exactitude" },
    { key: "precision", label: "Précision" },
    { key: "recall", label: "Rappel" },
    { key: "f1", label: "F1" },
    { key: "auc", label: "AUC" },
  ] as const;

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="font-semibold text-gray-900">Résultats en graphiques</h2>
        <p className="text-sm text-gray-500">
          Calculés en validation croisée : chaque ménage est noté par un modèle qui ne l&apos;a jamais vu à l&apos;entraînement.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BarChart
          title="Comparaison des métriques"
          xLabel="Métrique"
          yLabel="Valeur (0-1)"
          yMax={1}
          format={(v) => v.toFixed(2)}
          groups={metricGroups.map(({ key, label }) => ({
            label,
            values: [
              ...(baseline ? [{ name: "Référence", color: COLORS.baseline, value: baseline[key] }] : []),
              ...models.map((m, i) => ({ name: shortName(m.name), color: colorOf(m.kind, i), value: m.metrics[key] })),
            ],
          }))}
        />

        <LineChart
          title="Courbe ROC"
          xLabel="Faux positifs (taux)"
          yLabel="Vrais positifs (taux)"
          diagonal
          empty="Réentraînez les modèles pour obtenir la courbe."
          series={withCurves.map((m, i) => ({
            name: `${shortName(m.name)} · AUC ${m.metrics.auc.toFixed(2)}`,
            color: colorOf(m.kind, i),
            points: m.metrics.curves?.roc ?? [],
          }))}
        />

        <LineChart
          title="Courbe précision-rappel"
          xLabel="Rappel"
          yLabel="Précision"
          empty="Réentraînez les modèles pour obtenir la courbe."
          series={withCurves.map((m, i) => ({
            name: shortName(m.name),
            color: colorOf(m.kind, i),
            points: m.metrics.curves?.pr ?? [],
          }))}
        />

        {withCurves.map((m, i) => {
          const h = m.metrics.curves?.histogram;
          if (!h) return null;

          return (
            <BarChart
              key={m.kind}
              title={`Répartition des scores · ${shortName(m.name)}`}
              xLabel="Score prédit (0 = faible, 1 = élevé)"
              yLabel="Nombre de ménages"
              groups={h.vulnerable.map((count, bin) => ({
                label: h.bins[bin].toFixed(1),
                values: [
                  { name: "Vulnérables", color: "#ef4444", value: count },
                  { name: "Autres", color: colorOf(m.kind, i), value: h.other[bin] },
                ],
              }))}
            />
          );
        })}

        {withCurves.some((m) => m.metrics.curves?.lossCurve?.length) &&
          (() => {
            const model = withCurves.find((m) => m.metrics.curves?.lossCurve?.length) as ChartModel;
            const loss = model.metrics.curves?.lossCurve as number[];
            const max = Math.max(...loss);

            return (
              <LineChart
                title={`Apprentissage du réseau de neurones (perte)`}
                xLabel="Itération (échantillonnée)"
                yLabel="Perte"
                xDomain={[0, loss.length - 1]}
                yDomain={[0, Math.ceil(max * 10) / 10 || 1]}
                series={[{ name: "Perte (plus bas = mieux)", color: COLORS.mlp, points: loss.map((v, x) => ({ x, y: v })) }]}
              />
            );
          })()}
      </div>

      {withCurves.length === 0 && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          Ces modèles ont été entraînés avant l&apos;ajout des graphiques : lancez « Entraîner maintenant » pour obtenir les courbes.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Consensus : ce sur quoi TOUTES les méthodes sont d'accord             */
/* ------------------------------------------------------------------ */

interface ConsensusData {
  threshold: number;
  total: number;
  surveyed: number;
  commonCount: number;
  engine: string;
  methods: Array<{ key: string; name: string; available: boolean; flagged: number }>;
  regions: Array<{ label: string; count: number }>;
  histogram: { bins: number[]; sgd: number[] | null; mlp: number[] | null; rules: number[]; mean: number[] };
  common: Array<{
    id: number; name: string; locality: string | null; zoneName: string | null; projectName: string; altitude: number | null;
    surveyed: boolean; scoreSgd: number | null; scoreMlp: number | null; scoreRules: number; mean: number;
  }>;
}

export function ConsensusPanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const [data, setData] = useState<ConsensusData | null>(null);
  const [error, setError] = useState("");
  const [surveyedOnly, setSurveyedOnly] = useState(false);

  useEffect(() => {
    api
      .get("/ai/consensus")
      .then((res) => setData(res.data?.data ?? null))
      .catch(() => setError("Consensus indisponible (réservé à l'administration, la direction et les coordinateurs)."));
  }, [refreshKey]);

  const rows = useMemo(
    () => (data?.common ?? []).filter((h) => !surveyedOnly || h.surveyed).slice(0, 15),
    [data, surveyedOnly]
  );

  if (error) return <p className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">{error}</p>;
  if (!data) return null;

  const available = data.methods.filter((m) => m.available);
  const colorFor = (key: string) => (COLORS as Record<string, string>)[key] ?? COLORS.baseline;

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-700"><Layers className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-gray-900">Résultat commun des méthodes</h2>
          <p className="text-sm text-gray-500">
            Un ménage est « commun » quand <b>toutes</b> les méthodes disponibles ({available.map((m) => m.name.split(" (")[0]).join(", ")}) le jugent
            vulnérable (score ≥ {data.threshold}). Classés par score moyen.
          </p>
        </div>
        <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-700">{data.commonCount} ménage(s) commun(s)</span>
      </div>

      {available.length < 3 && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          Seules les règles métier sont disponibles pour l&apos;instant : entraînez les modèles (au moins 10 ménages enquêtés par les agents en mission) pour comparer SGD et MLP.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <BarChart
          title="Ménages signalés par méthode"
          xLabel="Méthode"
          yLabel="Ménages (score ≥ seuil)"
          groups={data.methods.filter((m) => m.available).map((m) => ({
            label: m.key === "rules" ? "Règles" : m.key.toUpperCase(),
            values: [{ name: m.name, color: colorFor(m.key), value: m.flagged }],
          }))}
        />

        <BarChart
          title="Recoupements entre méthodes"
          xLabel="Combinaison de méthodes"
          yLabel="Ménages"
          empty="Aucun ménage signalé."
          groups={data.regions.slice(0, 7).map((r) => ({
            label: r.label.replace(/ \+ /g, "+"),
            values: [{ name: r.label.includes("+") && r.label.split("+").length === available.length ? "Accord total" : "Accord partiel", color: r.label.split("+").length === available.length ? COLORS.mean : COLORS.baseline, value: r.count }],
          }))}
        />

        <div className="lg:col-span-2">
          <BarChart
            title="Répartition des scores par méthode (tous les ménages)"
            xLabel="Score (tranches de 10)"
            yLabel="Ménages"
            groups={data.histogram.bins.slice(0, 10).map((b, i) => ({
              label: `${b}`,
              values: [
                ...(data.histogram.sgd ? [{ name: "SGD", color: COLORS.sgd, value: data.histogram.sgd[i] }] : []),
                ...(data.histogram.mlp ? [{ name: "MLP", color: COLORS.mlp, value: data.histogram.mlp[i] }] : []),
                { name: "Règles", color: COLORS.rules, value: data.histogram.rules[i] },
                { name: "Moyenne (commun)", color: COLORS.mean, value: data.histogram.mean[i] },
              ],
            }))}
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Ménages communs aux méthodes, du score le plus élevé au plus bas</h3>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" checked={surveyedOnly} onChange={(e) => setSurveyedOnly(e.target.checked)} className="h-4 w-4" />
            Seulement ménages enquêtés ({data.surveyed})
          </label>
        </div>

        {rows.length === 0 ? (
          <p className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-500">Aucun ménage ne fait l&apos;unanimité des méthodes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase text-gray-500">
                <tr>
                  {["Ménage", "Localité", "SGD", "MLP", "Règles", "Moyenne"].map((h) => <th key={h} className="py-2 pr-4 font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((h) => (
                  <tr key={h.id}>
                    <td className="py-2 pr-4">
                      <span className="font-medium text-gray-900">{h.name}</span>
                      {h.surveyed && <span className="ml-2 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">enquêté</span>}
                      <span className="block text-xs text-gray-500">{h.projectName}</span>
                    </td>
                    <td className="pr-4 text-gray-600">{h.locality ?? h.zoneName ?? "—"}{h.altitude !== null ? ` · ${Math.round(h.altitude)} m` : ""}</td>
                    <td className="pr-4">{h.scoreSgd ?? "—"}</td>
                    <td className="pr-4">{h.scoreMlp ?? "—"}</td>
                    <td className="pr-4">{h.scoreRules}</td>
                    <td className="pr-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-green-500" style={{ width: `${h.mean}%` }} />
                        </div>
                        <b>{h.mean}</b>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
