"use client";

import { ReactNode, useState } from "react";

/**
 * Graphiques SVG sans dépendance (courbes, histogrammes, barres, anneau).
 * Les couleurs sont des teintes vives lisibles en mode clair comme en mode sombre.
 */

export const PALETTE = {
  blue: "#3b82f6",
  purple: "#a855f7",
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
  teal: "#14b8a6",
  slate: "#94a3b8",
};

export const SEVERITY_COLOR: Record<string, string> = {
  HIGH: PALETTE.red,
  MEDIUM: PALETTE.amber,
  LOW: PALETTE.green,
  GOOD: PALETTE.green,
  WATCH: PALETTE.amber,
  CRITICAL: PALETTE.red,
  UNKNOWN: PALETTE.slate,
};

/** Couleur de texte lisible (sombre ou blanche) selon la teinte du fond. */
const textOn = (hex: string) => {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  if (Number.isNaN(n)) return "#ffffff";
  const luma = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return luma > 150 ? "#0f172a" : "#ffffff";
};

/** Tronque un libellé pour qu'il tienne dans `px` pixels à la taille de police `fs`. */
const fit = (s: string, px: number, fs: number) => {
  const max = Math.max(2, Math.floor(px / (fs * 0.58)));
  return s.length > max ? `${s.slice(0, Math.max(1, max - 1))}…` : s;
};

export function ChartCard({ title, subtitle, children, right }: { title: string; subtitle?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

export function Legend({ items }: { items: Array<{ label: string; color: string; dashed?: boolean }> }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded" style={{ background: i.dashed ? "transparent" : i.color, borderTop: i.dashed ? `2px dashed ${i.color}` : undefined, height: i.dashed ? 0 : 3 }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

export function Empty({ text = "Pas encore de données à représenter." }: { text?: string }) {
  return <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">{text}</p>;
}

/* --------------------------------- courbes --------------------------------- */

export interface LineSeries {
  name: string;
  color: string;
  points: Array<{ x: number; y: number }>;
  width?: number;
  dashed?: boolean;
  /** Mise en avant (meilleur modèle) */
  highlight?: boolean;
  /** Surface sous la courbe */
  area?: boolean;
}

interface LineChartProps {
  series: LineSeries[];
  xLabel?: string;
  yLabel?: string;
  xDomain?: [number, number];
  yDomain?: [number, number];
  height?: number;
  diagonal?: boolean;
  xTicks?: Array<{ value: number; label: string }>;
  format?: (v: number) => string;
}

export function LineChart({ series, xLabel, yLabel, xDomain, yDomain, height = 280, diagonal, xTicks, format = (v) => String(Math.round(v * 100) / 100) }: LineChartProps) {
  const [hover, setHover] = useState<string | null>(null);
  const W = 560;
  const H = height;
  const m = { l: 44, r: 14, t: 12, b: 36 };

  const all = series.flatMap((s) => s.points);
  if (all.length === 0) return <Empty />;

  const [x0, x1] = xDomain ?? [Math.min(...all.map((p) => p.x)), Math.max(...all.map((p) => p.x))];
  const [y0, y1] = yDomain ?? [Math.min(0, ...all.map((p) => p.y)), Math.max(...all.map((p) => p.y)) || 1];
  // un seul point (ou tous au même x) : on le place au milieu et on trace une ligne de gauche à droite
  const flat = x1 === x0;
  const sx = (v: number) => (flat ? (m.l + W - m.r) / 2 : m.l + ((v - x0) / (x1 - x0)) * (W - m.l - m.r));
  const sy = (v: number) => H - m.b - ((v - y0) / (y1 - y0 || 1)) * (H - m.t - m.b);
  const yTicks = Array.from({ length: 5 }, (_, i) => y0 + ((y1 - y0) * i) / 4);
  const xt = xTicks ?? (flat ? [{ value: x0, label: format(x0) }] : Array.from({ length: 5 }, (_, i) => ({ value: x0 + ((x1 - x0) * i) / 4, label: format(x0 + ((x1 - x0) * i) / 4) })));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={m.l} x2={W - m.r} y1={sy(t)} y2={sy(t)} stroke="#94a3b8" strokeOpacity={0.25} />
          <text x={m.l - 6} y={sy(t) + 4} textAnchor="end" fontSize={10} className="fill-gray-500">{format(t)}</text>
        </g>
      ))}
      {xt.map((t, i) => (
        <text key={i} x={sx(t.value)} y={H - m.b + 15} textAnchor="middle" fontSize={10} className="fill-gray-500">{t.label}</text>
      ))}
      {diagonal && <line x1={sx(x0)} y1={sy(y0)} x2={sx(x1)} y2={sy(y1)} stroke="#94a3b8" strokeDasharray="4 4" />}
      {xLabel && <text x={(W + m.l) / 2} y={H - 4} textAnchor="middle" fontSize={11} className="fill-gray-500">{xLabel}</text>}
      {yLabel && <text transform={`translate(12 ${H / 2}) rotate(-90)`} textAnchor="middle" fontSize={11} className="fill-gray-500">{yLabel}</text>}

      {series.map((s) => {
        const d = s.points.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");
        const faded = hover && hover !== s.name;

        return (
          <g key={s.name} opacity={faded ? 0.2 : 1} onMouseEnter={() => setHover(s.name)} onMouseLeave={() => setHover(null)}>
            {s.area && <path d={`${d} L${sx(s.points[s.points.length - 1].x)},${sy(y0)} L${sx(s.points[0].x)},${sy(y0)} Z`} fill={s.color} fillOpacity={0.12} />}
            <path d={d} fill="none" stroke={s.color} strokeWidth={s.highlight ? 3.5 : s.width ?? 2} strokeDasharray={s.dashed ? "5 4" : undefined} strokeLinejoin="round" strokeLinecap="round" />
            {s.points.length === 1 && (
              <line x1={m.l} x2={W - m.r} y1={sy(s.points[0].y)} y2={sy(s.points[0].y)} stroke={s.color} strokeWidth={s.highlight ? 3.5 : s.width ?? 2} strokeDasharray="6 4" strokeLinecap="round" />
            )}
            {s.points.length <= 12 && s.points.map((p, i) => (
              <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={s.highlight ? 4 : 3} fill={s.color}><title>{`${s.name} — ${format(p.x)} ; ${format(p.y)}`}</title></circle>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------ histogramme / barres ------------------------------ */

export interface BarDatum {
  label: string;
  value: number;
  /** Deuxième série (empilée) */
  value2?: number;
  color?: string;
}

interface BarChartProps {
  data: BarDatum[];
  color?: string;
  color2?: string;
  height?: number;
  yLabel?: string;
  xLabel?: string;
  /** histogramme : barres jointes */
  histogram?: boolean;
  format?: (v: number) => string;
  max?: number;
  /** Écrit le libellé de chaque barre À L'INTÉRIEUR de la barre (à la verticale) au lieu de l'axe du bas */
  labelsInside?: boolean;
  /** Affiche la valeur au-dessus de chaque barre */
  valueLabels?: boolean;
  /** Graduations entières (effectifs) */
  integerTicks?: boolean;
  /** Largeur logique du dessin (560 par défaut). Une valeur plus petite agrandit les textes dans une carte étroite. */
  width?: number;
  /** Nombre maximal d'étiquettes affichées sous l'axe X (les autres sont sautées) */
  maxXLabels?: number;
}

export function BarChart({ data, color = PALETTE.blue, color2 = PALETTE.red, height = 240, yLabel, xLabel, histogram, format = (v) => String(Math.round(v * 100) / 100), max, labelsInside, valueLabels, integerTicks, width = 560, maxXLabels = 12 }: BarChartProps) {
  const W = width;
  const H = height;
  const m = { l: yLabel ? 54 : 40, r: 10, t: valueLabels ? 20 : 14, b: labelsInside ? (xLabel ? 38 : 18) : xLabel ? 44 : 34 };

  if (data.length === 0 || data.every((d) => !d.value && !d.value2)) return <Empty />;

  const rawTop = max ?? Math.max(1, ...data.map((d) => d.value + (d.value2 ?? 0)));
  const top = integerTicks ? Math.max(1, Math.ceil(rawTop)) : rawTop;
  const slot = (W - m.l - m.r) / data.length;
  const gap = histogram ? 1 : Math.min(14, slot * 0.25);
  const sy = (v: number) => H - m.b - (v / top) * (H - m.t - m.b);
  const step = Math.ceil(top / 4);
  const ticks = integerTicks ? Array.from({ length: Math.floor(top / step) + 1 }, (_, i) => i * step) : Array.from({ length: 5 }, (_, i) => (top * i) / 4);
  const skip = Math.ceil(data.length / Math.max(1, maxXLabels));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={m.l} x2={W - m.r} y1={sy(t)} y2={sy(t)} stroke="#94a3b8" strokeOpacity={0.25} />
          <text x={m.l - 6} y={sy(t) + 4} textAnchor="end" fontSize={10} className="fill-gray-500">{format(t)}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const x = m.l + i * slot + gap / 2;
        const w = slot - gap;
        const h1 = H - m.b - sy(d.value);
        const h2 = d.value2 ? H - m.b - sy(d.value2) : 0;

        return (
          <g key={`${d.label}-${i}`}>
            <rect x={x} y={sy(d.value)} width={w} height={Math.max(0, h1)} rx={histogram ? 0 : 3} fill={d.color ?? color}><title>{`${d.label} : ${format(d.value)}`}</title></rect>
            {d.value2 ? <rect x={x} y={sy(d.value) - h2} width={w} height={h2} rx={histogram ? 0 : 3} fill={color2}><title>{`${d.label} : ${format(d.value2)}`}</title></rect> : null}
            {valueLabels && d.value > 0 && (
              <text x={x + w / 2} y={sy(d.value + (d.value2 ?? 0)) - 4} textAnchor="middle" fontSize={10} fontWeight={600} className="fill-gray-700">{format(d.value + (d.value2 ?? 0))}</text>
            )}
            {labelsInside ? (
              (() => {
                const fs = Math.max(8, Math.min(11, w * 0.55));
                const fits = h1 >= 30 && w >= 12;
                const room = fits ? h1 - 12 : sy(d.value) - m.t - (valueLabels ? 18 : 8);
                if (!fits && room < 18) return null;
                return (
                  <text
                    transform={`translate(${x + w / 2 + fs * 0.35} ${fits ? H - m.b - 6 : sy(d.value) - (valueLabels ? 18 : 6)}) rotate(-90)`}
                    textAnchor="start"
                    fontSize={fs}
                    fontWeight={600}
                    fill={fits ? textOn(d.color ?? color) : undefined}
                    className={fits ? undefined : "fill-slate-700 dark:fill-slate-200"}
                  >
                    {fit(d.label, room, fs)}
                  </text>
                );
              })()
            ) : (
              i % skip === 0 && <text x={x + w / 2} y={H - m.b + 14} textAnchor="middle" fontSize={10} className="fill-gray-500">{d.label.length > 12 ? `${d.label.slice(0, 11)}…` : d.label}</text>
            )}
          </g>
        );
      })}
      {xLabel && <text x={(W + m.l) / 2} y={H - 4} textAnchor="middle" fontSize={11} className="fill-gray-500">{xLabel}</text>}
      {yLabel && <text transform={`translate(12 ${H / 2}) rotate(-90)`} textAnchor="middle" fontSize={11} className="fill-gray-500">{yLabel}</text>}
    </svg>
  );
}

/** Barres groupées : plusieurs séries par catégorie (comparaison des méthodes). */
export function GroupedBars({ categories, series, height = 260, format = (v) => String(Math.round(v * 100) / 100), max = 1, highlight, labelsInside, valueLabels, yLabel, xLabel }: {
  categories: string[];
  series: Array<{ name: string; color: string; values: number[] }>;
  height?: number;
  format?: (v: number) => string;
  max?: number;
  highlight?: string;
  /** Écrit le nom de chaque catégorie à l'intérieur de sa barre (à la verticale) au lieu de l'axe du bas */
  labelsInside?: boolean;
  /** Affiche la valeur au-dessus de chaque barre */
  valueLabels?: boolean;
  yLabel?: string;
  xLabel?: string;
}) {
  const W = 560;
  const H = height;
  const m = { l: yLabel ? 54 : 40, r: 10, t: valueLabels ? 20 : 14, b: labelsInside ? (xLabel ? 38 : 18) : xLabel ? 50 : 36 };
  const slot = (W - m.l - m.r) / categories.length;
  const bar = Math.min(labelsInside ? 34 : 26, (slot * 0.8) / series.length);
  const sy = (v: number) => H - m.b - (v / max) * (H - m.t - m.b);

  if (categories.length === 0) return <Empty />;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line x1={m.l} x2={W - m.r} y1={sy(max * t)} y2={sy(max * t)} stroke="#94a3b8" strokeOpacity={0.25} />
          <text x={m.l - 6} y={sy(max * t) + 4} textAnchor="end" fontSize={10} className="fill-gray-500">{format(max * t)}</text>
        </g>
      ))}
      {categories.map((c, ci) => {
        const start = m.l + ci * slot + (slot - bar * series.length) / 2;

        return (
          <g key={c}>
            {series.map((s, si) => (
              <rect key={s.name} x={start + si * bar} y={sy(s.values[ci] ?? 0)} width={bar - 2} height={Math.max(0, H - m.b - sy(s.values[ci] ?? 0))} rx={3} fill={s.color} opacity={highlight && highlight !== s.name ? 0.55 : 1} stroke={highlight === s.name ? "#facc15" : "none"} strokeWidth={2}>
                <title>{`${s.name} — ${c} : ${format(s.values[ci] ?? 0)}`}</title>
              </rect>
            ))}
            {valueLabels && series.map((s, si) => (
              <text key={`v-${s.name}`} x={start + si * bar + (bar - 2) / 2} y={sy(s.values[ci] ?? 0) - 4} textAnchor="middle" fontSize={10} fontWeight={600} className="fill-gray-700">{format(s.values[ci] ?? 0)}</text>
            ))}
            {labelsInside ? (
              (() => {
                // le nom est écrit dans la plus haute des barres de la catégorie
                const vals = series.map((s) => s.values[ci] ?? 0);
                const si = vals.indexOf(Math.max(...vals));
                const h = Math.max(0, H - m.b - sy(vals[si]));
                const fs = Math.max(8, Math.min(11, (bar - 2) * 0.55));
                const fits = h >= 30 && bar >= 14;
                const room = fits ? h - 12 : sy(vals[si]) - m.t - (valueLabels ? 18 : 8);
                if (!fits && room < 18) return null;
                return (
                  <text
                    transform={`translate(${start + si * bar + (bar - 2) / 2 + fs * 0.35} ${fits ? H - m.b - 6 : sy(vals[si]) - (valueLabels ? 18 : 6)}) rotate(-90)`}
                    textAnchor="start"
                    fontSize={fs}
                    fontWeight={600}
                    fill={fits ? textOn(series[si].color) : undefined}
                    className={fits ? undefined : "fill-slate-700 dark:fill-slate-200"}
                  >
                    {fit(c, room, fs)}
                  </text>
                );
              })()
            ) : (
              <text x={m.l + ci * slot + slot / 2} y={H - m.b + 14} textAnchor="middle" fontSize={10} className="fill-gray-500">{c}</text>
            )}
          </g>
        );
      })}
      {xLabel && <text x={(W + m.l) / 2} y={H - 4} textAnchor="middle" fontSize={11} className="fill-gray-500">{xLabel}</text>}
      {yLabel && <text transform={`translate(12 ${H / 2}) rotate(-90)`} textAnchor="middle" fontSize={11} className="fill-gray-500">{yLabel}</text>}
    </svg>
  );
}

/* ---------------------------------- anneau ---------------------------------- */

export function Donut({ data, size = 190, center }: { data: Array<{ label: string; value: number; color: string }>; size?: number; center?: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <Empty text="Aucune donnée à représenter." />;

  const r = size / 2 - 14;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {data.filter((d) => d.value > 0).map((d) => {
            const len = (d.value / total) * c;
            const el = <circle key={d.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeWidth={22} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset}><title>{`${d.label} : ${d.value}`}</title></circle>;
            offset += len;
            return el;
          })}
        </g>
        <text x="50%" y="50%" textAnchor="middle" dy="0.35em" fontSize={26} fontWeight={700} className="fill-gray-900">{center ?? total}</text>
      </svg>
      <ul className="space-y-1.5 text-sm text-gray-700">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: d.color }} />
            {d.label} <span className="font-semibold text-gray-900">{d.value}</span>
            <span className="text-xs text-gray-400">({Math.round((d.value / total) * 100)} %)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Histogramme à partir de bacs {from,to,count}. */
export function binsToBars(bins: Array<{ from: number; to: number; count: number }>, bins2?: Array<{ count: number }>): BarDatum[] {
  return bins.map((b, i) => ({ label: `${b.from}-${b.to}`, value: b.count, value2: bins2?.[i]?.count }));
}
