"use client";

import { State, useInsight } from "@/components/insights/parts";
import { BarChart, ChartCard, Donut, GroupedBars, Legend, LineChart, PALETTE, SEVERITY_COLOR, binsToBars } from "./charts";

type Bin = { from: number; to: number; count: number };

interface Charts {
  performance: { histogram: Bin[]; levels: Array<{ level: string; count: number }> };
  dropout: {
    histogram: Bin[];
    levels: Array<{ level: string; count: number }>;
    byProject: Array<{ project: string; count: number; average: number }>;
  };
  vulnerability: {
    histogram: Bin[];
    histogramFlagged: Bin[];
    histogramOthers: Bin[];
    curve: Array<{ rank: number; score: number; sgd: number | null; mlp: number | null; vulnerable: boolean }>;
    flagged: number;
    total: number;
    method: string | null;
  };
}

const LEVEL_LABEL: Record<string, string> = { GOOD: "Bon", WATCH: "À surveiller", CRITICAL: "Critique", UNKNOWN: "Non évalué", HIGH: "Élevé", MEDIUM: "Moyen", LOW: "Faible" };

/* ------------------------------- performance ------------------------------- */

interface Perf {
  projectId: number;
  name: string;
  score: number | null;
  factors: { milestoneProgress: number | null; activityCompletion: number | null; evaluationAverage: number | null; timeElapsed: number; scheduleGap: number | null };
}

/** Au-delà de ce nombre de projets, les noms ne tiennent plus sous l'axe : on numérote et on affiche une légende. */
const MAX_NAMED = 8;

/** Légende « 1. Nom du projet » affichée sous un graphique dont l'axe est numéroté. */
function ProjectKey({ names }: { names: string[] }) {
  if (names.length <= MAX_NAMED) return null;

  return (
    <ol className="mt-3 grid gap-x-6 gap-y-1 text-xs text-gray-500 sm:grid-cols-2 lg:grid-cols-3">
      {names.map((name, index) => (
        <li key={`${index}-${name}`} className="truncate" title={name}>
          <span className="mr-1.5 font-semibold text-gray-700">{index + 1}.</span>
          {name}
        </li>
      ))}
    </ol>
  );
}

export function PerformanceCharts() {
  const charts = useInsight<Charts>("/ai/charts");
  const perf = useInsight<Perf[]>("/ai/performance");
  const rows = (perf.data ?? []).filter((p) => p.score !== null);
  const short = (s: string) => (s.length > 10 ? `${s.slice(0, 9)}…` : s);

  // Peu de projets : noms courts. Beaucoup de projets : numéros (1, 2, 3…) + légende, pour que rien ne se chevauche.
  const crowded = rows.length > MAX_NAMED;
  const labelOf = (name: string, index: number) => (crowded ? String(index + 1) : short(name));
  const step = Math.max(1, Math.ceil(rows.length / 12));

  return (
    <section className="space-y-5">
      <h2 className="text-lg font-bold text-gray-900">Graphiques de performance</h2>
      <State loading={charts.loading || perf.loading} error={charts.error || perf.error}>
        <div className="grid gap-5 lg:grid-cols-2">
          <ChartCard title="Histogramme des scores" subtitle="Nombre de projets par tranche de score (0–100)">
            <BarChart data={binsToBars(charts.data?.performance.histogram ?? [])} xLabel="Score" yLabel="Projets" color={PALETTE.teal} />
          </ChartCard>
          <ChartCard title="Répartition par niveau">
            <Donut data={(charts.data?.performance.levels ?? []).map((l) => ({ label: LEVEL_LABEL[l.level] ?? l.level, value: l.count, color: SEVERITY_COLOR[l.level] }))} />
          </ChartCard>
        </div>

        <ChartCard title="Composantes du score par projet" subtitle="Jalons, activités terminées et évaluations (0–100)">
          <GroupedBars
            max={100}
            categories={rows.map((r, i) => labelOf(r.name, i))}
            series={[
              { name: "Jalons", color: PALETTE.blue, values: rows.map((r) => r.factors.milestoneProgress ?? 0) },
              { name: "Activités", color: PALETTE.green, values: rows.map((r) => r.factors.activityCompletion ?? 0) },
              { name: "Évaluations", color: PALETTE.purple, values: rows.map((r) => r.factors.evaluationAverage ?? 0) },
              { name: "Score", color: PALETTE.amber, values: rows.map((r) => r.score ?? 0) },
            ]}
          />
          <Legend items={[{ label: "Jalons", color: PALETTE.blue }, { label: "Activités", color: PALETTE.green }, { label: "Évaluations", color: PALETTE.purple }, { label: "Score global", color: PALETTE.amber }]} />
          <ProjectKey names={rows.map((r) => r.name)} />
        </ChartCard>

        <ChartCard title="Courbe : avancement réel vs temps écoulé" subtitle="Un projet au-dessus de la courbe « temps » est en avance sur son calendrier">
          <LineChart
            yDomain={[0, 100]}
            xTicks={rows.map((r, i) => ({
              value: i + 1,
              // Étiquettes espacées : on n'en affiche qu'une sur `step` pour qu'elles ne se superposent jamais
              label: i % step === 0 || i === rows.length - 1 ? labelOf(r.name, i) : "",
            }))}
            series={[
              { name: "Avancement des jalons", color: PALETTE.blue, points: rows.map((r, i) => ({ x: i + 1, y: r.factors.milestoneProgress ?? 0 })), area: true },
              { name: "Temps écoulé", color: PALETTE.red, dashed: true, points: rows.map((r, i) => ({ x: i + 1, y: r.factors.timeElapsed })) },
              { name: "Score global", color: PALETTE.amber, points: rows.map((r, i) => ({ x: i + 1, y: r.score ?? 0 })) },
            ]}
          />
          <Legend items={[{ label: "Avancement des jalons", color: PALETTE.blue }, { label: "Temps écoulé", color: PALETTE.red, dashed: true }, { label: "Score global", color: PALETTE.amber }]} />
          <ProjectKey names={rows.map((r) => r.name)} />
        </ChartCard>
      </State>
    </section>
  );
}

/* ------------------------------ risque d'abandon ------------------------------ */

interface Risk { riskScore: number; riskLevel: string }

export function DropoutCharts() {
  const charts = useInsight<Charts>("/ai/charts");
  const risks = useInsight<Risk[]>("/ai/dropout-risk");
  const scores = (risks.data ?? []).map((r) => r.riskScore);
  const thresholds = Array.from({ length: 11 }, (_, i) => i * 10);

  return (
    <section className="space-y-5">
      <h2 className="text-lg font-bold text-gray-900">Graphiques du risque d&apos;abandon</h2>
      <State loading={charts.loading || risks.loading} error={charts.error || risks.error}>
        <div className="grid gap-5 lg:grid-cols-2">
          <ChartCard title="Histogramme du risque" subtitle="Nombre de bénéficiaires par tranche de risque">
            <BarChart data={binsToBars(charts.data?.dropout.histogram ?? [])} xLabel="Score de risque" yLabel="Bénéficiaires" color={PALETTE.red} histogram />
          </ChartCard>
          <ChartCard title="Répartition par niveau">
            <Donut data={(charts.data?.dropout.levels ?? []).map((l) => ({ label: LEVEL_LABEL[l.level] ?? l.level, value: l.count, color: SEVERITY_COLOR[l.level] }))} />
          </ChartCard>
        </div>

        <ChartCard title="Courbe de couverture" subtitle="Combien de bénéficiaires ont un risque ≥ au seuil : aide à choisir le seuil d'accompagnement">
          <LineChart
            xDomain={[0, 100]}
            xLabel="Seuil de risque"
            yLabel="Bénéficiaires"
            format={(v) => String(Math.round(v))}
            series={[{ name: "Risque ≥ seuil", color: PALETTE.red, area: true, points: thresholds.map((t) => ({ x: t, y: scores.filter((s) => s >= t).length })) }]}
          />
        </ChartCard>

        {(charts.data?.dropout.byProject.length ?? 0) > 0 && (
          <ChartCard title="Risque moyen par projet" subtitle="Moyenne des scores de risque (0–100)">
            <BarChart data={(charts.data?.dropout.byProject ?? []).map((p) => ({ label: p.project, value: p.average }))} color={PALETTE.amber} max={100} />
          </ChartCard>
        )}
      </State>
    </section>
  );
}

/* -------------------------------- vulnérabilité -------------------------------- */

export function VulnerabilityCharts() {
  const { data, loading, error } = useInsight<Charts>("/ai/charts");
  const v = data?.vulnerability;

  return (
    <section className="space-y-5">
      <h2 className="text-lg font-bold text-gray-900">Graphiques de vulnérabilité</h2>
      <State loading={loading} error={error}>
        {v && (
          <>
            <div className="grid gap-5 lg:grid-cols-2">
              <ChartCard title="Histogramme des scores" subtitle="Bleu : ménages non signalés · Rouge : déjà signalés vulnérables (empilé)">
                <BarChart data={binsToBars(v.histogramOthers, v.histogramFlagged)} color={PALETTE.blue} color2={PALETTE.red} xLabel="Score de vulnérabilité" yLabel="Ménages" histogram />
              </ChartCard>
              <ChartCard title="Signalés vs non signalés">
                <Donut data={[{ label: "Signalés vulnérables", value: v.flagged, color: PALETTE.red }, { label: "Autres ménages", value: v.total - v.flagged, color: PALETTE.blue }]} />
                <p className="mt-2 text-xs text-gray-500">Méthode : {v.method === "ML" ? "modèles entraînés (SGD + MLP)" : "heuristique de repli"}</p>
              </ChartCard>
            </div>

            <ChartCard title="Courbe des scores classés" subtitle="Chaque point = un ménage classé du plus au moins vulnérable ; comparaison SGD / MLP / moyenne">
              <LineChart
                yDomain={[0, 100]}
                xLabel="Rang du ménage"
                yLabel="Score"
                format={(x) => String(Math.round(x))}
                series={[
                  ...(v.method === "ML"
                    ? [
                        { name: "SGD", color: PALETTE.blue, dashed: true, points: v.curve.filter((c) => c.sgd !== null).map((c) => ({ x: c.rank, y: c.sgd as number })) },
                        { name: "MLP", color: PALETTE.purple, dashed: true, points: v.curve.filter((c) => c.mlp !== null).map((c) => ({ x: c.rank, y: c.mlp as number })) },
                      ]
                    : []),
                  { name: "Score final", color: PALETTE.red, width: 3, points: v.curve.map((c) => ({ x: c.rank, y: c.score })) },
                ]}
              />
              <Legend items={[...(v.method === "ML" ? [{ label: "SGD", color: PALETTE.blue, dashed: true }, { label: "MLP", color: PALETTE.purple, dashed: true }] : []), { label: "Score final", color: PALETTE.red }]} />
            </ChartCard>
          </>
        )}
      </State>
    </section>
  );
}

/* ----------------------------------- hub ----------------------------------- */

export function HubCharts() {
  const { data, loading, error } = useInsight<Charts>("/ai/charts");

  return (
    <section className="space-y-5">
      <h2 className="text-lg font-bold text-gray-900">Vue d&apos;ensemble en graphiques</h2>
      <State loading={loading} error={error}>
        {data && (
          <div className="grid gap-5 lg:grid-cols-3">
            <ChartCard title="Scores de performance" subtitle="Projets par tranche">
              <BarChart data={binsToBars(data.performance.histogram)} color={PALETTE.teal} height={200} histogram />
            </ChartCard>
            <ChartCard title="Risque d'abandon" subtitle="Bénéficiaires par tranche">
              <BarChart data={binsToBars(data.dropout.histogram)} color={PALETTE.red} height={200} histogram />
            </ChartCard>
            <ChartCard title="Vulnérabilité" subtitle="Ménages par tranche">
              <BarChart data={binsToBars(data.vulnerability.histogramOthers, data.vulnerability.histogramFlagged)} color={PALETTE.blue} color2={PALETTE.red} height={200} histogram />
            </ChartCard>
          </div>
        )}
      </State>
    </section>
  );
}
