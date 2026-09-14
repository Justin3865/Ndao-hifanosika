"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  ClipboardCheck,
  Award,
  User,
  Calendar,
  Target,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  Evaluation,
  formatDate,
  getEvaluationById,
  getEvaluationMention,
} from "@/lib/evaluations";

export default function EvaluationDetailPage() {
  const params = useParams();

  const id = String(params.id);

  const [evaluation, setEvaluation] =
    useState<Evaluation | null>(null);

  useEffect(() => {
    const data =
      getEvaluationById(id);

    if (data) {
      setEvaluation(data);
    }
  }, [id]);

  if (!evaluation) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-3xl rounded-xl border bg-white p-10 text-center">
          <h1 className="text-xl font-bold">
            Évaluation introuvable
          </h1>

          <Link
            href="/evaluations"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white"
          >
            <ArrowLeft size={18} />
            Retour
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-6xl">

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div className="flex items-center gap-3">

            <Link
              href="/evaluations"
              className="rounded-lg border bg-white p-2"
            >
              <ArrowLeft size={20} />
            </Link>

            <div>
              <p className="text-sm text-gray-500">
                {evaluation.code}
              </p>

              <h1 className="text-2xl font-bold">
                Évaluation
              </h1>
            </div>

          </div>

          <Link
            href={`/evaluations/${evaluation.id}/edit`}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-white"
          >
            <Pencil size={18} />
            Modifier
          </Link>

        </div>

        {/* SCORE */}

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">

          <Stat
            icon={<Award />}
            label="Score"
            value={`${evaluation.percentage}%`}
          />

          <Stat
            icon={<Target />}
            label="Mention"
            value={getEvaluationMention(
              evaluation.percentage
            )}
          />

          <Stat
            icon={<User />}
            label="Cible"
            value={evaluation.target}
          />

          <Stat
            icon={<Calendar />}
            label="Date"
            value={formatDate(
              evaluation.dateEvaluation
            )}
          />

        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* PERSONNE */}

          <section className="rounded-xl border bg-white p-5 shadow-sm">

            <h2 className="mb-4 font-semibold">
              Personne évaluée
            </h2>

            <p className="text-lg font-bold">
              {evaluation.subjectName}
            </p>

            <p className="mt-1 text-sm text-gray-500">
              {evaluation.subjectId}
            </p>

            <div className="mt-4 space-y-2 text-sm">

              <p>
                <strong>Type :</strong>{" "}
                {evaluation.type}
              </p>

              <p>
                <strong>Évaluateur :</strong>{" "}
                {evaluation.evaluatorName}
              </p>

              <p>
                <strong>Rôle :</strong>{" "}
                {evaluation.evaluatorRole}
              </p>

            </div>

          </section>

          {/* CAMPAGNE */}

          <section className="rounded-xl border bg-white p-5 shadow-sm">

            <h2 className="mb-4 font-semibold">
              Campagne
            </h2>

            <p className="font-medium">
              {evaluation.campaignName}
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Grille :
            </p>

            <p className="font-medium">
              {evaluation.gridName}
            </p>

            <div className="mt-4">
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs text-green-700">
                {evaluation.status}
              </span>
            </div>

          </section>

          {/* SCORE GLOBAL */}

          <section className="rounded-xl border bg-white p-5 shadow-sm">

            <h2 className="mb-4 font-semibold">
              Résultat global
            </h2>

            <div className="text-center">

              <p className="text-5xl font-bold text-indigo-600">
                {evaluation.percentage}%
              </p>

              <p className="mt-2 text-gray-500">
                {evaluation.totalScore} /{" "}
                {evaluation.maxScore}
              </p>

            </div>

            <div className="mt-5 h-3 rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{
                  width: `${evaluation.percentage}%`,
                }}
              />
            </div>

          </section>

        </div>

        {/* CRITERES */}

        <section className="mt-6 rounded-xl border bg-white p-5 shadow-sm">

          <div className="mb-5 flex items-center gap-2">
            <ClipboardCheck
              className="text-indigo-600"
            />

            <h2 className="text-lg font-semibold">
              Détail des critères
            </h2>
          </div>

          <div className="space-y-4">

            {evaluation.scores.map(
              (score) => {

                const percentage =
                  score.maxScore > 0
                    ? Math.round(
                        (score.score /
                          score.maxScore) *
                          100
                      )
                    : 0;

                return (
                  <div
                    key={
                      score.criterionId
                    }
                    className="rounded-lg border p-4"
                  >

                    <div className="flex justify-between">

                      <div>
                        <p className="font-semibold">
                          {
                            score.criterionLabel
                          }
                        </p>

                        {score.comment && (
                          <p className="mt-1 text-sm text-gray-500">
                            {score.comment}
                          </p>
                        )}
                      </div>

                      <p className="font-bold">
                        {score.score}/
                        {score.maxScore}
                      </p>

                    </div>

                    <div className="mt-3 h-2 rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{
                          width: `${percentage}%`,
                        }}
                      />
                    </div>

                  </div>
                );
              }
            )}

          </div>

        </section>

        {/* APPRECIATION */}

        <section className="mt-6 rounded-xl border bg-white p-5 shadow-sm">

          <h2 className="mb-3 text-lg font-semibold">
            Appréciation générale
          </h2>

          <p className="whitespace-pre-wrap text-gray-600">
            {evaluation.appreciation ||
              "Aucune appréciation renseignée."}
          </p>

        </section>

        {/* VALIDATION */}

        {evaluation.validatedBy && (
          <section className="mt-6 rounded-xl border bg-green-50 p-5">

            <h2 className="font-semibold text-green-800">
              Évaluation validée
            </h2>

            <p className="mt-1 text-sm text-green-700">
              Validée par{" "}
              {evaluation.validatedBy}
              {evaluation.validatedAt &&
                ` le ${formatDate(
                  evaluation.validatedAt
                )}`}
            </p>

          </section>
        )}

      </div>
    </main>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-indigo-600">
          {icon}
        </span>

        <span className="text-xl font-bold">
          {value}
        </span>
      </div>

      <p className="mt-2 text-sm text-gray-500">
        {label}
      </p>
    </div>
  );
}