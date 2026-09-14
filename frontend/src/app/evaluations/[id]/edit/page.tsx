"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Save,
} from "lucide-react";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useParams } from "next/navigation";

import {
  Evaluation,
  EvaluationScore,
  getEvaluationById,
  updateEvaluation,
} from "@/lib/evaluations";

export default function EditEvaluationPage() {
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
            className="mt-5 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-white"
          >
            Retour
          </Link>
        </div>
      </main>
    );
  }

  function updateField(
    field: keyof Evaluation,
    value: unknown
  ) {
    setEvaluation({
      ...evaluation,
      [field]: value,
    });
  }

  function updateScore(
    criterionId: string,
    value: number
  ) {
    const scores =
      evaluation.scores.map(
        (score) =>
          score.criterionId ===
          criterionId
            ? {
                ...score,
                score: value,
              }
            : score
      );

    const total =
      scores.reduce(
        (sum, score) =>
          sum + score.score,
        0
      );

    const max =
      scores.reduce(
        (sum, score) =>
          sum + score.maxScore,
        0
      );

    const percentage =
      max > 0
        ? Math.round(
            (total / max) *
              100
          )
        : 0;

    setEvaluation({
      ...evaluation,
      scores,
      totalScore: total,
      maxScore: max,
      percentage,
    });
  }

  function handleSubmit(
    event: FormEvent
  ) {
    event.preventDefault();

    updateEvaluation(
      evaluation.id,
      evaluation
    );

    window.location.href =
      `/evaluations/${evaluation.id}`;
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-5xl">

        <div className="mb-6 flex items-center gap-3">

          <Link
            href={`/evaluations/${evaluation.id}`}
            className="rounded-lg border bg-white p-2"
          >
            <ArrowLeft size={20} />
          </Link>

          <div>
            <h1 className="text-2xl font-bold">
              Modifier l'évaluation
            </h1>

            <p className="text-sm text-gray-500">
              {evaluation.code}
            </p>
          </div>

        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >

          <section className="rounded-xl border bg-white p-5 shadow-sm">

            <h2 className="mb-5 text-lg font-semibold">
              Informations
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              <Field label="Personne évaluée">
                <input
                  value={
                    evaluation.subjectName
                  }
                  onChange={(e) =>
                    updateField(
                      "subjectName",
                      e.target.value
                    )
                  }
                  className="input"
                />
              </Field>

              <Field label="Évaluateur">
                <input
                  value={
                    evaluation.evaluatorName
                  }
                  onChange={(e) =>
                    updateField(
                      "evaluatorName",
                      e.target.value
                    )
                  }
                  className="input"
                />
              </Field>

              <Field label="Date">
                <input
                  type="date"
                  value={
                    evaluation.dateEvaluation
                  }
                  onChange={(e) =>
                    updateField(
                      "dateEvaluation",
                      e.target.value
                    )
                  }
                  className="input"
                />
              </Field>

              <Field label="Statut">
                <select
                  value={
                    evaluation.status
                  }
                  onChange={(e) =>
                    updateField(
                      "status",
                      e.target.value
                    )
                  }
                  className="input"
                >
                  <option>
                    Non évalué
                  </option>

                  <option>
                    En cours
                  </option>

                  <option>
                    Évalué
                  </option>

                  <option>
                    Validé
                  </option>
                </select>
              </Field>

            </div>

          </section>

          <section className="rounded-xl border bg-white p-5 shadow-sm">

            <h2 className="mb-5 text-lg font-semibold">
              Notes
            </h2>

            <div className="space-y-4">

              {evaluation.scores.map(
                (score) => (
                  <div
                    key={
                      score.criterionId
                    }
                    className="rounded-lg border p-4"
                  >

                    <div className="flex items-center justify-between">

                      <p className="font-medium">
                        {
                          score.criterionLabel
                        }
                      </p>

                      <div className="flex items-center gap-2">

                        <input
                          type="number"
                          min="0"
                          max={
                            score.maxScore
                          }
                          step="0.5"
                          value={
                            score.score
                          }
                          onChange={(
                            e
                          ) =>
                            updateScore(
                              score.criterionId,
                              Number(
                                e.target
                                  .value
                              )
                            )
                          }
                          className="w-24 rounded-lg border px-3 py-2"
                        />

                        <span>
                          /{" "}
                          {
                            score.maxScore
                          }
                        </span>

                      </div>

                    </div>

                  </div>
                )
              )}

            </div>

          </section>

          <section className="rounded-xl border bg-white p-5 shadow-sm">

            <label className="mb-2 block font-medium">
              Appréciation
            </label>

            <textarea
              value={
                evaluation.appreciation
              }
              onChange={(e) =>
                updateField(
                  "appreciation",
                  e.target.value
                )
              }
              rows={5}
              className="w-full rounded-lg border px-3 py-2"
            />

          </section>

          <div className="flex justify-end gap-3">

            <Link
              href={`/evaluations/${evaluation.id}`}
              className="rounded-lg border bg-white px-5 py-2.5"
            >
              Annuler
            </Link>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-white"
            >
              <Save size={18} />
              Enregistrer
            </button>

          </div>

        </form>

      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">
        {label}
      </label>

      {children}
    </div>
  );
}