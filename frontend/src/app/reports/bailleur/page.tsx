"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import api from "@/lib/axios";
import { AppLayout } from "@/components/layout";
import { Logo } from "@/components/brand/Logo";

interface Dashboard { totals: Record<string, number>; status: Record<string, number> }
interface EvalReport { total: number; averageScore: number | null; byStatus: { draft: number; submitted: number; validated: number } }
interface Zone { city: string; activities: number; projects: number; beneficiaries: number }

export default function DonorReportPage() {
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [ev, setEv] = useState<EvalReport | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);

  useEffect(() => {
    api.get("/reports/dashboard").then((r) => setDash(r.data?.data ?? null)).catch(() => undefined);
    api.get("/reports/evaluations").then((r) => setEv(r.data?.data ?? null)).catch(() => undefined);
    api.get("/tracking/zones").then((r) => setZones(r.data?.data ?? [])).catch(() => undefined);
  }, []);

  const totals = dash?.totals ?? {};

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex justify-end print:hidden">
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-blue-800 px-5 py-2.5 text-sm font-medium text-white">
            <Printer className="h-4 w-4" /> Imprimer / PDF
          </button>
        </div>

        <article className="space-y-8 rounded-3xl border border-gray-200 bg-white p-10 shadow-sm print:border-0 print:shadow-none">
          <header className="flex items-center justify-between border-b border-gray-200 pb-6">
            <Logo size={56} />
            <div className="text-right">
              <h1 className="text-2xl font-bold text-blue-900">Rapport d&apos;impact</h1>
              <p className="text-sm text-gray-500">Édité le {new Date().toLocaleDateString("fr-FR")}</p>
            </div>
          </header>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Chiffres clés</h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                ["Projets", totals.projects],
                ["Activités", totals.activities],
                ["Bénéficiaires", totals.beneficiaries],
                ["Évaluations", totals.evaluations],
                ["Stages", totals.internships],
                ["Projets terminés", dash?.status?.completedProjects],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-2xl bg-blue-50 p-4">
                  <p className="text-3xl font-bold text-blue-900">{value ?? 0}</p>
                  <p className="text-sm text-gray-600">{label}</p>
                </div>
              ))}
            </div>
          </section>

          {ev && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Qualité et évaluation</h2>
              <p className="text-gray-700">
                {ev.total} évaluation(s) réalisée(s), score moyen{" "}
                <strong>{ev.averageScore !== null ? ev.averageScore.toFixed(1) : "—"}/100</strong> ({ev.byStatus.validated} validée(s), {ev.byStatus.submitted} soumise(s), {ev.byStatus.draft} brouillon(s)).
              </p>
            </section>
          )}

          {zones.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Zones d&apos;intervention</h2>
              <table className="w-full text-sm">
                <thead className="border-b text-left text-gray-500">
                  <tr><th className="py-2">Ville</th><th>Projets</th><th>Activités</th><th>Bénéficiaires</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {zones.map((z) => (
                    <tr key={z.city}><td className="py-2 font-medium">{z.city}</td><td>{z.projects}</td><td>{z.activities}</td><td>{z.beneficiaries}</td></tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </article>
      </div>
    </AppLayout>
  );
}
