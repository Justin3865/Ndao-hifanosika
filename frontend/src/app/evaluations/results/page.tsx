"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/axios";
import { AppLayout } from "@/components/layout";
import { errorMessage } from "@/lib/crud";

interface Evaluation {
  id: number;
  projectId: number;
  score: number | null;
  status: string;
  project?: { name: string } | null;
}

export default function EvaluationResultsPage() {
  const [items, setItems] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/evaluations")
      .then((res) => setItems(res.data?.data ?? []))
      .catch((err) => setError(errorMessage(err, "Résultats indisponibles.")))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    type Row = { name: string; scores: number[]; validated: number; total: number };
    const map = new Map<number, Row>();

    items.forEach((item) => {
      const row: Row = map.get(item.projectId) ?? {
        name: item.project?.name ?? `Projet #${item.projectId}`,
        scores: [],
        validated: 0,
        total: 0,
      };

      row.total += 1;
      if (item.status === "VALIDATED") row.validated += 1;
      if (item.score !== null && item.score !== undefined) row.scores.push(Number(item.score));
      map.set(item.projectId, row);
    });

    return Array.from(map.values())
      .map((row) => ({
        ...row,
        average: row.scores.length ? row.scores.reduce((a, b) => a + b, 0) / row.scores.length : null,
      }))
      .sort((a, b) => (b.average ?? -1) - (a.average ?? -1));
  }, [items]);

  const all = items.filter((i) => i.score !== null).map((i) => Number(i.score));
  const globalAverage = all.length ? (all.reduce((a, b) => a + b, 0) / all.length).toFixed(1) : "—";

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Résultats des évaluations</h1>
          <p className="text-sm text-gray-500">Score moyen par projet — {items.length} évaluation(s), moyenne globale {globalAverage}/100.</p>
        </div>

        {loading && <p className="text-gray-500">Chargement...</p>}
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.name} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="font-semibold text-gray-900">{row.name}</p>
                <p className="text-sm text-gray-500">{row.validated}/{row.total} validée(s)</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-400" style={{ width: `${row.average ?? 0}%` }} />
                </div>
                <span className="w-16 text-right font-bold text-blue-900">{row.average !== null ? row.average.toFixed(1) : "—"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
