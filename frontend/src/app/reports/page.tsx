"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { AppLayout } from "@/components/layout";
import { errorMessage } from "@/lib/crud";

interface DashboardData {
  totals: Record<string, number>;
  status: Record<string, number>;
}

interface EvaluationReport {
  total: number;
  averageScore: number | null;
  byStatus: { draft: number; submitted: number; validated: number };
}

const LABELS: Record<string, string> = {
  projects: "Projets",
  beneficiaries: "Bénéficiaires",
  users: "Utilisateurs",
  evaluations: "Évaluations",
  internships: "Stages",
  activities: "Activités",
  activeProjects: "Projets actifs",
  completedProjects: "Projets terminés",
  activeUsers: "Utilisateurs actifs",
  completedInternships: "Stages terminés",
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

export default function ReportsPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/reports/dashboard").then((res) => setDashboard(res.data?.data ?? null)),
      api.get("/reports/evaluations").then((res) => setEvaluation(res.data?.data ?? null)),
    ])
      .catch((err) => setError(errorMessage(err, "Impossible de charger les rapports.")))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapports</h1>
          <p className="text-sm text-gray-500">Données agrégées en temps réel</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/reports/bailleur" className="rounded-xl bg-blue-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-900">
            Rapport d&apos;impact (bailleurs)
          </Link>
          <Link href="/reports/export" className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Exports CSV
          </Link>
        </div>

        {loading && <p className="text-gray-500">Chargement...</p>}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {dashboard && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Vue d&apos;ensemble</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
              {(Object.entries({ ...dashboard.totals, ...dashboard.status }) as [string, number][]).map(([key, value]) => (
                <Stat key={key} label={LABELS[key] ?? key} value={value} />
              ))}
            </div>
          </section>
        )}

        {evaluation && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Évaluations</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <Stat label="Total" value={evaluation.total} />
              <Stat
                label="Score moyen"
                value={evaluation.averageScore !== null && evaluation.averageScore !== undefined ? evaluation.averageScore.toFixed(1) : "—"}
              />
              <Stat label="Brouillons" value={evaluation.byStatus?.draft ?? 0} />
              <Stat label="Soumises" value={evaluation.byStatus?.submitted ?? 0} />
              <Stat label="Validées" value={evaluation.byStatus?.validated ?? 0} />
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
}
