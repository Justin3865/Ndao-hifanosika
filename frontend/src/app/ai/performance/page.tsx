"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Award,
  Brain,
  TrendingUp,
  Users,
} from "lucide-react";

interface Performance {
  id: string;
  name: string;
  project: string;
  score: number;
  activities: number;
  objectives: number;
}

const performances: Performance[] = [
  {
    id: "MEM-001",
    name: "Membre 001",
    project: "Maison Digitale",
    score: 91,
    activities: 18,
    objectives: 94,
  },
  {
    id: "MEM-002",
    name: "Membre 002",
    project: "Kids Preneur",
    score: 82,
    activities: 15,
    objectives: 85,
  },
  {
    id: "MEM-003",
    name: "Membre 003",
    project: "Ankizy Innov",
    score: 74,
    activities: 12,
    objectives: 76,
  },
  {
    id: "MEM-004",
    name: "Membre 004",
    project: "Otrikasa",
    score: 67,
    activities: 10,
    objectives: 70,
  },
];

function scoreClass(score: number) {
  if (score >= 85) return "text-green-600";
  if (score >= 70) return "text-yellow-600";
  return "text-red-600";
}

export default function PerformancePage() {
  const average =
    performances.reduce((sum, item) => sum + item.score, 0) /
    performances.length;

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link
          href="/ai"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={18} />
          Retour à l'IA
        </Link>

        <header className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-blue-100 p-4 text-blue-600">
              <Award size={30} />
            </div>

            <div>
              <h1 className="text-2xl font-bold">
                Évaluation de performance
              </h1>

              <p className="mt-1 text-gray-600">
                Analyse intelligente de la performance des équipes.
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-5 md:grid-cols-3">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <Users className="text-blue-600" />

            <p className="mt-3 text-sm text-gray-500">
              Personnes analysées
            </p>

            <p className="text-3xl font-bold">
              {performances.length}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <TrendingUp className="text-green-600" />

            <p className="mt-3 text-sm text-gray-500">
              Score moyen
            </p>

            <p className="text-3xl font-bold">
              {average.toFixed(1)}%
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <Brain className="text-purple-600" />

            <p className="mt-3 text-sm text-gray-500">
              Analyse
            </p>

            <p className="text-lg font-bold text-purple-600">
              Intelligence Artificielle
            </p>
          </div>
        </section>

        <section className="rounded-xl bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <h2 className="font-bold">Résultats de performance</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="text-left text-sm text-gray-600">
                  <th className="px-6 py-4">Membre</th>
                  <th className="px-6 py-4">Projet</th>
                  <th className="px-6 py-4">Activités</th>
                  <th className="px-6 py-4">Objectifs</th>
                  <th className="px-6 py-4">Score IA</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {performances.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.id}</p>
                    </td>

                    <td className="px-6 py-4">{item.project}</td>

                    <td className="px-6 py-4">
                      {item.activities}
                    </td>

                    <td className="px-6 py-4">
                      {item.objectives}%
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`text-lg font-bold ${scoreClass(
                          item.score
                        )}`}
                      >
                        {item.score}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}