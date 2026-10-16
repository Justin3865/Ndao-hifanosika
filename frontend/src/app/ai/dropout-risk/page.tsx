"use client";

import Link from "next/link";
import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { InsightHeader, LevelBadge, METHOD_NOTE, State, useInsight } from "@/components/insights/parts";

interface Row {
  beneficiaryId: number;
  name: string;
  age: number | null;
  projectName: string;
  riskScore: number;
  riskLevel: string;
  factors: string[];
}

export default function AiDropoutRiskPage() {
  const { data, loading, error } = useInsight<Row[]>("/ai/dropout-risk");
  const [level, setLevel] = useState("");

  const rows = (data ?? []).filter((r) => !level || r.riskLevel === level);

  return (
    <AppLayout>
      <div className="space-y-6">
        <InsightHeader title="Risque d'abandon" subtitle="Bénéficiaires à accompagner en priorité (statut du projet, jalons en retard, évaluations, vulnérabilité)." />

        <State loading={loading} error={error}>
          <div className="flex flex-wrap items-center gap-2">
            {[["", "Tous"], ["HIGH", "Élevé"], ["MEDIUM", "Moyen"], ["LOW", "Faible"]].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setLevel(value)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  level === value ? "bg-blue-800 text-white" : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  {["Bénéficiaire", "Projet", "Score de risque", "Niveau", "Facteurs"].map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.slice(0, 100).map((row) => (
                  <tr key={row.beneficiaryId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/beneficiaries/${row.beneficiaryId}`} className="font-medium text-blue-800 hover:underline">{row.name}</Link>
                      <p className="text-xs text-gray-400">{row.age !== null ? `${row.age} ans` : ""}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{row.projectName}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-red-600" style={{ width: `${row.riskScore}%` }} />
                        </div>
                        <span className="font-semibold">{row.riskScore}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><LevelBadge level={row.riskLevel} /></td>
                    <td className="px-4 py-3 text-xs text-gray-600">{row.factors.join(" · ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </State>

        <p className="text-xs text-gray-400">{METHOD_NOTE}</p>
      </div>
    </AppLayout>
  );
}
