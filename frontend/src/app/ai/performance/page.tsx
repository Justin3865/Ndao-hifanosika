"use client";

import Link from "next/link";
import { PerformanceCharts } from "@/components/ai-charts/InsightCharts";
import { AppLayout } from "@/components/layout";
import { InsightHeader, LevelBadge, METHOD_NOTE, State, useInsight } from "@/components/insights/parts";

interface Row {
  projectId: number;
  name: string;
  code: string;
  score: number | null;
  level: string;
  factors: {
    milestoneProgress: number | null;
    activityCompletion: number | null;
    evaluationAverage: number | null;
    timeElapsed: number;
    scheduleGap: number | null;
  };
}

const pct = (value: number | null) => (value === null ? "—" : `${value}%`);

export default function AiPerformancePage() {
  const { data, loading, error } = useInsight<Row[]>("/ai/performance");
  const rows = [...(data ?? [])].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

  return (
    <AppLayout>
      <div className="space-y-6">
        <InsightHeader title="Performance des projets" subtitle="Score pondéré : jalons 35 %, activités 25 %, évaluations 25 %, respect du calendrier 15 %." />

        <State loading={loading} error={error}>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  {["Projet", "Score", "Jalons", "Activités", "Évaluations", "Écart calendrier", "Niveau"].map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr key={row.projectId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/projects/${row.projectId}`} className="font-medium text-blue-800 hover:underline">{row.name}</Link>
                      <p className="text-xs text-gray-400">{row.code}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-400" style={{ width: `${row.score ?? 0}%` }} />
                        </div>
                        <span className="font-semibold">{row.score ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{pct(row.factors.milestoneProgress)}</td>
                    <td className="px-4 py-3">{pct(row.factors.activityCompletion)}</td>
                    <td className="px-4 py-3">{row.factors.evaluationAverage ?? "—"}</td>
                    <td className="px-4 py-3">
                      {row.factors.scheduleGap === null ? "—" : (
                        <span className={row.factors.scheduleGap < 0 ? "text-red-600" : "text-green-600"}>
                          {row.factors.scheduleGap > 0 ? "+" : ""}{row.factors.scheduleGap} pts
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3"><LevelBadge level={row.level} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </State>

        <PerformanceCharts />

        <p className="text-xs text-gray-400">{METHOD_NOTE}</p>
      </div>
    </AppLayout>
  );
}
