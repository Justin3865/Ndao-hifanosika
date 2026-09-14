"use client";

import { useState } from "react";
import type { EvaluationCriterion } from "./EvaluationCriteria";

interface EvaluationGridProps {
  criteria: EvaluationCriterion[];
  onChange?: (scores: Record<string, number>) => void;
}

export default function EvaluationGrid({
  criteria,
  onChange,
}: EvaluationGridProps) {
  const [scores, setScores] = useState<Record<string, number>>({});

  const handleScoreChange = (
    criterionId: string,
    score: number
  ) => {
    const updated = {
      ...scores,
      [criterionId]: score,
    };

    setScores(updated);
    onChange?.(updated);
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <div className="border-b p-5">
        <h2 className="font-semibold">
          Grille d'évaluation
        </h2>

        <p className="text-sm text-gray-500">
          Attribuez une note à chaque critère.
        </p>
      </div>

      <div className="divide-y">
        {criteria.map((criterion) => (
          <div
            key={criterion.id}
            className="grid gap-4 p-5 md:grid-cols-[1fr_180px]"
          >
            <div>
              <span className="text-xs font-semibold text-blue-600">
                {criterion.code}
              </span>

              <h3 className="font-medium">
                {criterion.name}
              </h3>

              <p className="text-sm text-gray-500">
                {criterion.description}
              </p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-gray-500">
                Note / 100
              </label>

              <input
                type="number"
                min="0"
                max="100"
                value={scores[criterion.id] ?? ""}
                onChange={(e) =>
                  handleScoreChange(
                    criterion.id,
                    Number(e.target.value)
                  )
                }
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}