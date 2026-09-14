"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Award,
  Users,
  UserCheck,
  GraduationCap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  Evaluation,
  getEvaluations,
} from "@/lib/evaluations";

export default function ResultsPage() {
  const [evaluations, setEvaluations] =
    useState<Evaluation[]>([]);

  useEffect(() => {
    setEvaluations(
      getEvaluations()
    );
  }, []);

  const average =
    useMemo(() => {
      if (!evaluations.length) {
        return 0;
      }

      return Math.round(
        evaluations.reduce(
          (sum, e) =>
            sum + e.percentage,
          0
        ) / evaluations.length
      );
    }, [evaluations]);

  const members =
    evaluations.filter(
      (e) => e.target === "Membre"
    );

  const beneficiaries =
    evaluations.filter(
      (e) =>
        e.target ===
        "Bénéficiaire"
    );

  const trainees =
    evaluations.filter(
      (e) =>
        e.target ===
        "Stagiaire"
    );

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">

        <div className="mb-6 flex items-center gap-3">

          <Link
            href="/evaluations"
            className="rounded-lg border bg-white p-2"
          >
            <ArrowLeft size={20} />
          </Link>

          <div>
            <h1 className="text-2xl font-bold">
              Résultats des évaluations
            </h1>

            <p className="text-sm text-gray-500">
              Analyse consolidée des performances.
            </p>
          </div>

        </div>

        {/* KPI */}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <Kpi
            icon={<BarChart3 />}
            label="Score moyen"
            value={`${average}%`}
          />

          <Kpi
            icon={<Users />}
            label="Membres"
            value={String(
              members.length
            )}
          />

          <Kpi
            icon={<UserCheck />}
            label="Bénéficiaires"
            value={String(
              beneficiaries.length
            )}
          />

          <Kpi
            icon={<GraduationCap />}
            label="Stagiaires"
            value={String(
              trainees.length
            )}
          />

        </div>

        {/* PERFORMANCE */}

        <section className="rounded-xl border bg-white p-5 shadow-sm">

          <div className="mb-5 flex items-center gap-2">
            <TrendingUp
              className="text-indigo-600"
            />

            <h2 className="text-lg font-semibold">
              Performance individuelle
            </h2>
          </div>

          <div className="space-y-4">

            {evaluations.map(
              (evaluation) => (
                <div
                  key={evaluation.id}
                  className="rounded-lg border p-4"
                >

                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

                    <div>
                      <Link
                        href={`/evaluations/${evaluation.id}`}
                        className="font-semibold hover:text-indigo-600"
                      >
                        {evaluation.subjectName}
                      </Link>

                      <p className="text-xs text-gray-500">
                        {evaluation.target} ·{" "}
                        {evaluation.gridName}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">

                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Award size={16} />
                        {evaluation.status}
                      </div>

                      <p className="text-xl font-bold text-indigo-600">
                        {evaluation.percentage}%
                      </p>

                    </div>

                  </div>

                  <div className="mt-3 h-2 rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{
                        width: `${evaluation.percentage}%`,
                      }}
                    />
                  </div>

                </div>
              )
            )}

          </div>

          {!evaluations.length && (
            <div className="py-10 text-center text-gray-500">
              Aucun résultat disponible.
            </div>
          )}

        </section>

      </div>
    </main>
  );
}

function Kpi({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-indigo-600">
          {icon}
        </span>

        <span className="text-2xl font-bold">
          {value}
        </span>
      </div>

      <p className="mt-2 text-sm text-gray-500">
        {label}
      </p>
    </div>
  );
}