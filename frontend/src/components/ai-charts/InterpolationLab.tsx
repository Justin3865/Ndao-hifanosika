"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, GraduationCap, FolderKanban, TrendingUp, Trash2 } from "lucide-react";
import { errorMessage } from "@/lib/crud";
import { CurveKind, CurveMethod, CurvePayload, RemovalImpact, fetchCurve, fetchRemovalImpact } from "@/lib/curves";
import { ChartCard, Empty, PALETTE } from "./charts";

/**
 * « Courbes d'optimisation » : interpolation de Lagrange et d'Hermite sur les notes de l'ÉVALUATION FINALE.
 * Deux panneaux indépendants : PROJETS et STAGIAIRES (12 personnes), chacun en cohorte ou en courbe individuelle.
 * Les données viennent de /api/integration/curves/* (même source que Suivi & Évaluation et Évaluation finale).
 */

type MethodChoice = "both" | CurveMethod;

const COLOR: Record<CurveMethod, string> = { lagrange: PALETTE.purple, hermite: PALETTE.blue };
const NAME: Record<CurveMethod, string> = { lagrange: "Lagrange", hermite: "Hermite (PCHIP)" };
const fmt = (v: number | null | undefined, unit = "") => (v === null || v === undefined ? "—" : `${Math.round(v * 100) / 100}${unit}`);

function CurveSvg({ data, show }: { data: CurvePayload; show: CurveMethod[] }) {
  const W = 640;
  const H = 300;
  const m = { l: 44, r: 16, t: 14, b: 40 };

  const [lo, hi] = data.bounds;
  const [x0, x1] = data.domain;
  const flat = x1 === x0;
  const sx = (v: number) => (flat ? (m.l + W - m.r) / 2 : m.l + ((v - x0) / (x1 - x0)) * (W - m.l - m.r));
  const sy = (v: number) => H - m.b - ((v - lo) / (hi - lo || 1)) * (H - m.t - m.b);
  const yTicks = Array.from({ length: 5 }, (_, i) => lo + ((hi - lo) * i) / 4);
  const path = (pts: Array<{ x: number; y: number }>) => pts.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");
  const [hover, setHover] = useState<number | null>(null);

  const visible = data.curves.filter((c) => show.includes(c.method));
  const node = hover === null ? null : data.nodes[hover];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={data.title}>
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={m.l} x2={W - m.r} y1={sy(t)} y2={sy(t)} stroke="#94a3b8" strokeOpacity={0.25} />
            <text x={m.l - 6} y={sy(t) + 4} textAnchor="end" fontSize={10} className="fill-gray-500">{Math.round(t * 10) / 10}</text>
          </g>
        ))}
        {data.mode === "cohort" &&
          data.nodes.map((n) => (
            <text key={n.x} x={sx(n.x)} y={H - m.b + 14} textAnchor="middle" fontSize={10} className="fill-gray-500">{n.x}</text>
          ))}
        <text x={(W + m.l) / 2} y={H - 6} textAnchor="middle" fontSize={11} className="fill-gray-500">{data.xLabel}</text>
        <text transform={`translate(12 ${H / 2}) rotate(-90)`} textAnchor="middle" fontSize={11} className="fill-gray-500">{data.yLabel}</text>

        {data.reference && data.reference.points.length > 1 && (
          <path d={path(data.reference.points)} fill="none" stroke={PALETTE.slate} strokeWidth={1.5} strokeDasharray="4 4" />
        )}

        {visible.map((c) => (
          <g key={c.method}>
            <path d={path(c.samples)} fill="none" stroke={COLOR[c.method]} strokeWidth={data.best === c.method ? 3 : 2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={c.method === "lagrange" ? "6 3" : undefined} />
            {/* optimum (maximum) */}
            <g>
              <circle cx={sx(c.optimum.max.x)} cy={sy(c.optimum.max.y)} r={6} fill="none" stroke={COLOR[c.method]} strokeWidth={2} />
              <text x={sx(c.optimum.max.x)} y={sy(c.optimum.max.y) - 10} textAnchor="middle" fontSize={10} fontWeight={700} fill={COLOR[c.method]}>max {fmt(c.optimum.max.y)}</text>
            </g>
          </g>
        ))}

        {data.nodes.map((n, i) => (
          <circle key={`${n.x}-${i}`} cx={sx(n.x)} cy={sy(n.y)} r={hover === i ? 6 : 4.5} fill={PALETTE.red} stroke="#fff" strokeWidth={1.5} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }} />
        ))}
      </svg>
      {node && (
        <div className="pointer-events-none absolute right-2 top-2 rounded-lg border border-gray-200 bg-white/95 px-3 py-1.5 text-xs shadow">
          <p className="font-semibold text-gray-900">{node.label || `Point ${node.x}`}</p>
          <p className="text-gray-600">{fmt(node.y, data.unit === "%" ? " %" : "/20")}</p>
        </div>
      )}
    </div>
  );
}

function ImpactBox({ internshipId }: { internshipId: number }) {
  const [impact, setImpact] = useState<RemovalImpact | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setImpact(null);
    setError("");
  }, [internshipId]);

  const run = async () => {
    setBusy(true);
    try {
      setImpact(await fetchRemovalImpact(internshipId));
      setError("");
    } catch (err) {
      setError(errorMessage(err, "Simulation indisponible."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-gray-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-gray-900"><Trash2 className="h-4 w-4 text-red-500" /> Impact sur les analyses si ce stagiaire est supprimé</p>
        <button type="button" onClick={() => void run()} disabled={busy} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-60">
          {busy ? "Calcul…" : "Simuler"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {impact && (
        <div className="mt-3 overflow-x-auto">
          {impact.projects.length === 0 ? (
            <p className="text-xs text-gray-500">Aucun projet n&apos;est rattaché à {impact.name} : aucun impact sur les notes de projets.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="text-gray-500">
                <tr><th className="py-1 pr-3">Projet</th><th className="pr-3">Stagiaires</th><th className="pr-3">Moy. stagiaires</th><th className="pr-3">Note finale</th><th>Score IA</th></tr>
              </thead>
              <tbody>
                {impact.projects.map((p) => (
                  <tr key={p.projectId} className="border-t border-gray-100">
                    <td className="py-1.5 pr-3 font-medium text-gray-900">{p.name}</td>
                    <td className="pr-3">{p.internsBefore} → {p.internsAfter}</td>
                    <td className="pr-3">{fmt(p.internAvgBefore)} → {fmt(p.internAvgAfter)}</td>
                    <td className="pr-3">{fmt(p.finalBefore)} → {fmt(p.finalAfter)} <b className={(p.deltaFinal ?? 0) < 0 ? "text-red-600" : "text-green-600"}>{p.deltaFinal === null ? "" : `(${p.deltaFinal > 0 ? "+" : ""}${p.deltaFinal})`}</b></td>
                    <td>{fmt(p.integratedBefore)} → {fmt(p.integratedAfter)} <b className={(p.deltaIntegrated ?? 0) < 0 ? "text-red-600" : "text-green-600"}>{p.deltaIntegrated === null ? "" : `(${p.deltaIntegrated > 0 ? "+" : ""}${p.deltaIntegrated})`}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-2 text-[11px] text-gray-400">Simulation en lecture seule : rien n&apos;est modifié. Dès qu&apos;un stagiaire est réellement supprimé ou terminé, les analyses IA se recalculent seules.</p>
        </div>
      )}
    </div>
  );
}

function Panel({ kind }: { kind: CurveKind }) {
  const isIntern = kind === "interns";
  const [choice, setChoice] = useState<number | "">("");
  const [level, setLevel] = useState<"" | "L3" | "M2">("");
  const [method, setMethod] = useState<MethodChoice>("both");
  const [data, setData] = useState<CurvePayload | null>(null);
  const [choices, setChoices] = useState<CurvePayload["choices"]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const payload = await fetchCurve(kind, {
        id: choice === "" ? undefined : choice,
        level: isIntern && choice === "" && level ? level : undefined,
      });
      setData(payload);
      if (payload.choices.length) setChoices(payload.choices);
      setError("");
    } catch (err) {
      setError(errorMessage(err, "Courbes indisponibles."));
    } finally {
      setLoading(false);
    }
  }, [kind, choice, level, isIntern]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  // recalcul automatique quand les données changent (nouvel avancement, stagiaire supprimé…)
  useEffect(() => {
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  const show: CurveMethod[] = method === "both" ? ["hermite", "lagrange"] : [method];
  const Icon = isIntern ? GraduationCap : FolderKanban;
  const best = data?.curves.find((c) => c.method === data.best);
  const selected = useMemo(() => choices.find((c) => c.id === choice), [choices, choice]);

  return (
    <ChartCard
      title={isIntern ? "Stagiaires — courbe d'optimisation" : "Projets — courbe d'optimisation"}
      subtitle={isIntern ? "Évaluation finale /20 des stagiaires (une personne = un point)" : "Évaluation finale /20 des projets, ou avancement S&E d'un projet"}
      right={<Icon className="h-5 w-5 text-gray-400" />}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <select value={choice} onChange={(e) => setChoice(e.target.value === "" ? "" : Number(e.target.value))} className="max-w-[240px] rounded-lg border border-gray-300 bg-white px-2 py-1.5">
          <option value="">{isIntern ? "Tous les stagiaires (cohorte)" : "Tous les projets (cohorte)"}</option>
          {choices.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        {isIntern && choice === "" && (
          <select value={level} onChange={(e) => setLevel(e.target.value as "" | "L3" | "M2")} className="rounded-lg border border-gray-300 bg-white px-2 py-1.5">
            <option value="">L3 + M2</option>
            <option value="L3">L3</option>
            <option value="M2">M2</option>
          </select>
        )}
        <div className="inline-flex overflow-hidden rounded-lg border border-gray-300">
          {([["both", "Les deux"], ["hermite", "Hermite"], ["lagrange", "Lagrange"]] as Array<[MethodChoice, string]>).map(([value, label]) => (
            <button key={value} type="button" onClick={() => setMethod(value)} className={`px-2.5 py-1.5 font-semibold ${method === value ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>{label}</button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <p className="text-sm text-gray-500">Calcul des courbes…</p>
      ) : error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : !data || data.n < 2 ? (
        <>
          <Empty text={data?.warnings[0] ?? "Au moins 2 points sont nécessaires pour tracer une courbe."} />
        </>
      ) : (
        <>
          <p className="mb-1 text-sm font-semibold text-gray-800">{data.title}</p>
          <CurveSvg data={data} show={show} />

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
            <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: PALETTE.red }} /> Points réels ({data.n})</span>
            {show.map((m) => (
              <span key={m} className="inline-flex items-center gap-1.5"><span className="inline-block h-0.5 w-5" style={{ background: COLOR[m] }} /> {NAME[m]}{data.best === m ? " ★" : ""}</span>
            ))}
            {data.reference && <span className="inline-flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 border-t-2 border-dashed" style={{ borderColor: PALETTE.slate }} /> {data.reference.name}</span>}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {data.curves.map((c) => (
              <div key={c.method} className={`rounded-xl border p-3 text-xs ${data.best === c.method ? "border-blue-400 bg-blue-50/40" : "border-gray-200"}`}>
                <p className="font-semibold" style={{ color: COLOR[c.method] }}>{NAME[c.method]}{data.best === c.method ? " — meilleure méthode" : ""}</p>
                <p className="mt-1 text-gray-600">Optimum (max) : <b>{fmt(c.optimum.max.y, data.unit === "%" ? " %" : "/20")}</b> en x = {fmt(c.optimum.max.x)}</p>
                <p className="text-gray-600">Minimum : <b>{fmt(c.optimum.min.y, data.unit === "%" ? " %" : "/20")}</b> en x = {fmt(c.optimum.min.x)}</p>
                <p className="text-gray-600">Erreur LOO (RMSE) : <b>{c.loo.rmse === null ? "n/a (< 4 points)" : fmt(c.loo.rmse)}</b></p>
                <p className="text-gray-600">Prévision au point suivant : <b>{fmt(c.forecast?.y, data.unit === "%" ? " %" : "/20")}</b></p>
              </div>
            ))}
          </div>

          {best && (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-gray-50 p-2.5 text-xs text-gray-600">
              <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
              <span>
                {data.best === "hermite" ? "Hermite" : "Lagrange"} reproduit le mieux les points (erreur de validation la plus faible). Sommet de la courbe : {fmt(best.optimum.max.y, data.unit === "%" ? " %" : "/20")}.
              </span>
            </p>
          )}
          {data.warnings.map((w) => (
            <p key={w} className="mt-2 flex items-start gap-2 text-xs text-amber-600"><Activity className="mt-0.5 h-3.5 w-3.5 shrink-0" />{w}</p>
          ))}

          {isIntern && choice !== "" && selected && <ImpactBox internshipId={choice} />}
        </>
      )}
    </ChartCard>
  );
}

export function InterpolationLab() {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Courbes d&apos;optimisation — Lagrange &amp; Hermite</h2>
        <p className="text-sm text-gray-500">
          Tracées sur l&apos;évaluation finale (stagiaire → activités → Suivi &amp; Évaluation → évaluation finale → IA). Deux séries séparées : projets et stagiaires.
        </p>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel kind="projects" />
        <Panel kind="interns" />
      </div>
    </section>
  );
}
