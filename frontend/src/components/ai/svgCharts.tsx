"use client";

/**
 * Petits graphiques SVG sans dépendance (courbes, histogrammes, barres).
 * Couleurs neutres : lisibles en thème clair comme en thème sombre.
 */
import { ReactNode } from "react";

export interface Point {
  x: number;
  y: number;
}

export interface Series {
  name: string;
  color: string;
  points: Point[];
  dashed?: boolean;
}

const AXIS = "#94a3b8";
const GRID = "rgba(148,163,184,0.25)";
const TEXT = "#94a3b8";

const W = 360;
const H = 260;
const PAD = { l: 42, r: 12, t: 12, b: 36 };

function scale(domain: [number, number], range: [number, number]) {
  const span = domain[1] - domain[0] || 1;
  return (v: number) => range[0] + ((v - domain[0]) / span) * (range[1] - range[0]);
}

function Frame({ children, title, legend }: { children: ReactNode; title: string; legend?: Array<{ name: string; color: string }> }) {
  return (
    <div className="rounded-xl border border-gray-200 p-3">
      <p className="mb-1 text-sm font-semibold text-gray-900">{title}</p>
      {children}
      {legend && (
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          {legend.map((item) => (
            <span key={item.name} className="inline-flex items-center gap-1.5">
              <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} />
              {item.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Axes({ xLabel, yLabel, xTicks, yTicks, fx, fy }: {
  xLabel: string; yLabel: string; xTicks: number[]; yTicks: number[];
  fx: (v: number) => number; fy: (v: number) => number;
}) {
  return (
    <g fontSize="10" fill={TEXT}>
      {yTicks.map((t) => (
        <g key={`y${t}`}>
          <line x1={PAD.l} x2={W - PAD.r} y1={fy(t)} y2={fy(t)} stroke={GRID} />
          <text x={PAD.l - 6} y={fy(t) + 3} textAnchor="end">{Number.isInteger(t) ? t : t.toFixed(1)}</text>
        </g>
      ))}
      {xTicks.map((t) => (
        <text key={`x${t}`} x={fx(t)} y={H - PAD.b + 14} textAnchor="middle">{Number.isInteger(t) ? t : t.toFixed(1)}</text>
      ))}
      <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} stroke={AXIS} />
      <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={H - PAD.b} stroke={AXIS} />
      <text x={(PAD.l + W - PAD.r) / 2} y={H - 6} textAnchor="middle">{xLabel}</text>
      <text transform={`translate(10 ${(PAD.t + H - PAD.b) / 2}) rotate(-90)`} textAnchor="middle">{yLabel}</text>
    </g>
  );
}

/** Courbe(s) : ROC, précision-rappel, perte... */
export function LineChart({
  title, series, xLabel, yLabel, xDomain = [0, 1], yDomain = [0, 1], diagonal = false, empty = "Pas de données",
}: {
  title: string; series: Series[]; xLabel: string; yLabel: string;
  xDomain?: [number, number]; yDomain?: [number, number]; diagonal?: boolean; empty?: string;
}) {
  const usable = series.filter((s) => s.points.length > 1);
  const fx = scale(xDomain, [PAD.l, W - PAD.r]);
  const fy = scale(yDomain, [H - PAD.b, PAD.t]);
  const ticks = (d: [number, number]) => Array.from({ length: 5 }, (_, i) => d[0] + ((d[1] - d[0]) * i) / 4);

  return (
    <Frame title={title} legend={usable.map((s) => ({ name: s.name, color: s.color }))}>
      {usable.length === 0 ? (
        <p className="py-16 text-center text-sm text-gray-500">{empty}</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title}>
          <Axes xLabel={xLabel} yLabel={yLabel} xTicks={ticks(xDomain)} yTicks={ticks(yDomain)} fx={fx} fy={fy} />
          {diagonal && <line x1={fx(0)} y1={fy(0)} x2={fx(1)} y2={fy(1)} stroke={AXIS} strokeDasharray="4 4" />}
          {usable.map((s) => (
            <polyline
              key={s.name}
              fill="none"
              stroke={s.color}
              strokeWidth="2.2"
              strokeDasharray={s.dashed ? "5 4" : undefined}
              strokeLinejoin="round"
              points={s.points.map((p) => `${fx(p.x).toFixed(1)},${fy(p.y).toFixed(1)}`).join(" ")}
            />
          ))}
        </svg>
      )}
    </Frame>
  );
}

export interface BarGroup {
  label: string;
  values: Array<{ name: string; color: string; value: number }>;
}

/** Histogramme / barres groupées (une couleur par série). */
export function BarChart({
  title, groups, xLabel, yLabel, yMax, format, empty = "Pas de données",
}: {
  title: string; groups: BarGroup[]; xLabel: string; yLabel: string; yMax?: number;
  format?: (v: number) => string; empty?: string;
}) {
  const names = Array.from(new Map(groups.flatMap((g) => g.values).map((v) => [v.name, v.color])).entries());
  const max = yMax ?? Math.max(1, ...groups.flatMap((g) => g.values.map((v) => v.value)));
  const fy = scale([0, max], [H - PAD.b, PAD.t]);
  const slot = (W - PAD.l - PAD.r) / Math.max(1, groups.length);
  const barW = Math.max(3, (slot * 0.8) / Math.max(1, names.length));
  const fmt = format ?? ((v: number) => String(Math.round(v)));

  return (
    <Frame title={title} legend={names.map(([name, color]) => ({ name, color }))}>
      {groups.length === 0 || max === 0 ? (
        <p className="py-16 text-center text-sm text-gray-500">{empty}</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title}>
          <g fontSize="10" fill={TEXT}>
            {Array.from({ length: 5 }, (_, i) => (max * i) / 4).map((t) => (
              <g key={t}>
                <line x1={PAD.l} x2={W - PAD.r} y1={fy(t)} y2={fy(t)} stroke={GRID} />
                <text x={PAD.l - 6} y={fy(t) + 3} textAnchor="end">{fmt(t)}</text>
              </g>
            ))}
            <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} stroke={AXIS} />
            <text x={(PAD.l + W - PAD.r) / 2} y={H - 4} textAnchor="middle">{xLabel}</text>
            <text transform={`translate(10 ${(PAD.t + H - PAD.b) / 2}) rotate(-90)`} textAnchor="middle">{yLabel}</text>
          </g>

          {groups.map((group, gi) => {
            const x0 = PAD.l + gi * slot + (slot - barW * group.values.length) / 2;

            return (
              <g key={group.label}>
                {group.values.map((v, vi) => (
                  <rect key={v.name} x={x0 + vi * barW} y={fy(v.value)} width={barW - 1} height={Math.max(0, H - PAD.b - fy(v.value))} fill={v.color} rx="1.5">
                    <title>{`${group.label} · ${v.name} : ${fmt(v.value)}`}</title>
                  </rect>
                ))}
                <text x={PAD.l + gi * slot + slot / 2} y={H - PAD.b + 13} textAnchor="middle" fontSize={groups.length > 6 ? 8 : 10} fill={TEXT}>{group.label}</text>
              </g>
            );
          })}
        </svg>
      )}
    </Frame>
  );
}
