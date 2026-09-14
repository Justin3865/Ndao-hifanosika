"use client";

import { useState } from "react";

interface Criterion {
  id: string;
  label: string;
  description: string;
}

const criteria: Criterion[] = [
  {
    id: "technical",
    label: "Compétences techniques",
    description: "Maîtrise des outils et méthodes utilisés.",
  },
  {
    id: "quality",
    label: "Qualité du travail",
    description: "Qualité et précision des travaux réalisés.",
  },
  {
    id: "autonomy",
    label: "Autonomie",
    description: "Capacité à travailler de manière autonome.",
  },
  {
    id: "communication",
    label: "Communication",
    description: "Communication avec l'équipe et l'encadrant.",
  },
  {
    id: "discipline",
    label: "Discipline",
    description: "Respect des horaires et des consignes.",
  },
];

interface InternshipEvaluationProps {
  onSubmit?: (scores: Record<string, number>) => void;
}

export default function InternshipEvaluation({
  onSubmit,
}: InternshipEvaluationProps) {
  const [scores, setScores] = useState<Record<string, number>>(
    {}
  );

  const updateScore = (id: string, value: number) => {
    const updated = {
      ...scores,
      [id]: value,
    };

    setScores(updated);
  };

  const total = Object.values(scores).reduce(
    (sum, value) => sum + value,
    0
  );

  const average =
    Object.keys(scores).length > 0
      ? total / Object.keys(scores).length
      : 0;

  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="border-b p-5">
        <h2 className="text-lg font-semibold">
          Évaluation du stagiaire
        </h2>

        <p className="text-sm text-gray-500">
          Évaluation par l'encadrant.
        </p>
      </div>

      <div className="divide-y">
        {criteria.map((criterion) => (
          <div
            key={criterion.id}
            className="grid gap-4 p-5 md:grid-cols-[1fr_180px]"
          >
            <div>
              <h3 className="font-medium">
                {criterion.label}
              </h3>

              <p className="text-sm text-gray-500">
                {criterion.description}
              </p>
            </div>

            <select
              value={scores[criterion.id] ?? ""}
              onChange={(event) =>
                updateScore(
                  criterion.id,
                  Number(event.target.value)
                )
              }
              className="rounded-lg border px-3 py-2"
            >
              <option value="">Note</option>
              <option value="20">20 - Excellent</option>
              <option value="16">16 - Très bien</option>
              <option value="14">14 - Bien</option>
              <option value="12">12 - Satisfaisant</option>
              <option value="10">10 - Moyen</option>
              <option value="8">8 - À améliorer</option>
              <option value="5">5 - Insuffisant</option>
            </select>
          </div>
        ))}
      </div>

      <div className="border-t bg-gray-50 p-5">
        <div className="flex items-center justify-between">
          <span className="font-medium">
            Moyenne
          </span>

          <span className="text-2xl font-bold">
            {average.toFixed(2)}/20
          </span>
        </div>

        <button
          onClick={() => onSubmit?.(scores)}
          className="mt-4 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Enregistrer l'évaluation
        </button>
      </div>
    </div>
  );
}