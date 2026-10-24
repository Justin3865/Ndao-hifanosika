"use client";

import { ReactNode } from "react";
import { TAU, donutArc, niceMax, percent, smoothPath, ticks } from "./chartMath";

/* Palette commune */
export const SEVERITY_COLORS: Record<string, string> = { HIGH: "#ef4444", MEDIUM: "#f59e0b", LOW: "#3b82f6" };
export const LEVEL_COLORS: Record<string, string> = { GOOD: "#10b981", WATCH: "#f59e0b", CRITICAL: "#ef4444", UNKNOWN: "#94a3b8" };
export const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#10b981", DRAFT: "#94a3b8", SUSPENDED: "#f59e0b", COMPLETED: "#3b82f6", CANCELLED: "#ef4444",
};
export const PALETTE = ["#6366f1", "#06b6d4", "#f97316", "#ec4899", "#84cc16", "#a855f7", "#14b8a6", "#eab308"];

/** Rouge sous 50, orange de 50 à 74, vert à partir de 75 (classes de 10 points). */
export const scoreBinColor = (index: number) => (index < 5 ? "#ef4444" : index < 7.5 ? "#f59e0b" : "#10b981");
/** Inverse pour le risque : vert sous 30, orange de 30 à 59, rouge à partir de 60. */
export const riskBinColor = (index: number) => (index < 3 ? "#10b981" : index < 6 ? "#f59e0b" : "#ef4444");

export function ChartCard({
  title,
  subtitle,
  children,
  className = "",
  empty,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  empty?: string | false;
}) {
  return (
    <section className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}>
      <h3 className="font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="mb-3 text-xs text-gray-500">{subtitle}</p>}
      {empty ? <p className="py-10 text-center text-sm text-gray-400">{empty}</p> : <div className={subtitle ? "" : "mt-3"}>{children}</div>}
    </section>
  );
}

/* ----------------------------- Diagramme circulaire ----------------------------- */

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({ slices, centerValue, centerLabel }: { slices: DonutSlice[]; centerValue?: string | number; centerLabel?: string }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  let angle = -Math.PI / 2;

  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg viewBox="0 0 200 200" className="h-44 w-44 shrink-0" role="img" aria-label="Diagramme circulaire">
        {total === 0 ? (
          <path d={donutArc(100, 100, 90, 56, 0, TAU)} fill="#e5e7eb" opacity={0.5} />
        ) : (
          slices
            .filter((slice) => slice.value > 0)
            .map((slice) => {
              const start = angle;
              angle += (slice.value / total) * TAU;

              return (
                <path key={slice.label} d={donutArc(100, 100, 90, 56, start, angle)} fill={slice.color}>
                  <title>{`${slice.label} : ${slice.value} (${percent(slice.value, total)} %)`}</title>
                </path>
              );
            })
        )}

        <text x="100" y={centerLabel ? 98 : 108} textAnchor="middle" className="fill-current text-gray-900" fontSize="30" fontWeight="700">
          {centerValue ?? total}
        </text>
        {centerLabel && (
          <text x="100" y="120" textAnchor="middle" className="fill-current text-gray-500" fontSize="11">
            {centerLabel}
          </text>
        )}
      </svg>

      <ul className="min-w-[8rem] flex-1 space-y-1.5 text-sm">
        {slices.map((slice) => (
          <li key={slice.label} className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
            <span className="flex-1 truncate text-gray-700">{slice.label}</span>
            <span className="font-semibold text-gray-900">{slice.value}</span>
            <span className="w-9 text-right text-xs text-gray-400">{percent(slice.value, total)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ----------------------------- Barres horizontales ----------------------------- */

export function BarList({
  items,
  suffix = "",
  max,
}: {
  items: Array<{ label: string; value: number; color?: string }>;
  suffix?: string;
  max?: number;
}) {
  const top = max ?? Math.max(1, ...items.map((item) => item.value));

  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={`${item.label}-${index}`} className="text-sm">
          <div className="mb-0.5 flex items-center justify-between gap-3">
            <span className="truncate text-gray-700" title={item.label}>{item.label}</span>
            <span className="shrink-0 font-semibold text-gray-900">{item.value}{suffix}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.max(item.value > 0 ? 2 : 0, (item.value / top) * 100)}%`, backgroundColor: item.color ?? PALETTE[index % PALETTE.length] }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ----------------------------- Histogramme ----------------------------- */

export function Histogram({
  bins,
  binColor = () => "#6366f1",
  unit = "",
  height = 200,
}: {
  bins: Array<{ label: string; value: number }>;
  binColor?: (index: number) => string;
  unit?: string;
  height?: number;
}) {
  const width = 520;
  const pad = { top: 18, right: 10, bottom: 30, left: 34 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(1, ...bins.map((bin) => bin.value)));
  const slot = innerW / Math.max(1, bins.length);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Histogramme">
      {ticks(max).map((tick) => {
        const y = pad.top + innerH - (tick / max) * innerH;

        return (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="currentColor" className="text-gray-200" strokeDasharray="3 3" />
            <text x={pad.left - 6} y={y + 3} textAnchor="end" fontSize="10" className="fill-current text-gray-500">{tick}</text>
          </g>
        );
      })}

      {bins.map((bin, index) => {
        const barH = (bin.value / max) * innerH;
        const x = pad.left + index * slot + slot * 0.12;
        const w = slot * 0.76;
        const y = pad.top + innerH - barH;

        return (
          <g key={bin.label}>
            <rect x={x} y={y} width={w} height={Math.max(barH, 0)} rx={3} fill={binColor(index)}>
              <title>{`${bin.label}${unit} : ${bin.value}`}</title>
            </rect>
            {bin.value > 0 && (
              <text x={x + w / 2} y={y - 4} textAnchor="middle" fontSize="10" fontWeight="600" className="fill-current text-gray-700">{bin.value}</text>
            )}
            <text x={x + w / 2} y={height - 12} textAnchor="middle" fontSize="9" className="fill-current text-gray-500">{bin.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ----------------------------- Courbe ----------------------------- */

export interface LineSeries {
  name: string;
  color: string;
  values: number[];
}

export function LineChart({
  labels,
  series,
  height = 230,
  smooth = true,
  area = false,
  yMax,
  unit = "",
}: {
  labels: string[];
  series: LineSeries[];
  height?: number;
  smooth?: boolean;
  area?: boolean;
  yMax?: number;
  unit?: string;
}) {
  const width = 640;
  const pad = { top: 16, right: 16, bottom: 28, left: 36 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = yMax ?? niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const stepX = labels.length > 1 ? innerW / (labels.length - 1) : 0;
  const xAt = (index: number) => pad.left + (labels.length > 1 ? index * stepX : innerW / 2);
  const yAt = (value: number) => pad.top + innerH - (Math.min(value, max) / max) * innerH;
  const every = Math.max(1, Math.ceil(labels.length / 8));
  const dots = labels.length <= 16;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Courbe">
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.name} id={`area-${i}-${s.color.replace("#", "")}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {ticks(max).map((tick) => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={yAt(tick)} y2={yAt(tick)} stroke="currentColor" className="text-gray-200" strokeDasharray="3 3" />
            <text x={pad.left - 6} y={yAt(tick) + 3} textAnchor="end" fontSize="10" className="fill-current text-gray-500">{tick}</text>
          </g>
        ))}

        {labels.map((label, index) =>
          index % every === 0 || index === labels.length - 1 ? (
            <text key={`${label}-${index}`} x={xAt(index)} y={height - 8} textAnchor="middle" fontSize="10" className="fill-current text-gray-500">{label}</text>
          ) : null,
        )}

        {series.map((s, i) => {
          const points = s.values.map((value, index) => [xAt(index), yAt(value)] as [number, number]);
          const line = smooth ? smoothPath(points) : points.map(([x, y], k) => `${k === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
          const base = pad.top + innerH;

          return (
            <g key={s.name}>
              {area && points.length > 1 && (
                <path d={`${line} L ${points[points.length - 1][0]} ${base} L ${points[0][0]} ${base} Z`} fill={`url(#area-${i}-${s.color.replace("#", "")})`} />
              )}
              <path d={line} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              {points.map(([x, y], index) =>
                dots || index === points.length - 1 ? (
                  <circle key={index} cx={x} cy={y} r={3.5} fill={s.color} stroke="#fff" strokeWidth={1}>
                    <title>{`${s.name} — ${labels[index]} : ${s.values[index]}${unit}`}</title>
                  </circle>
                ) : null,
              )}
            </g>
          );
        })}
      </svg>

      <div className="mt-1 flex flex-wrap gap-4 text-xs text-gray-600">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5">
            <span className="h-0.5 w-5 rounded" style={{ backgroundColor: s.color, height: 3 }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}
