"use client";

export interface EvaluationCriterion {
  id: string;
  code: string;
  name: string;
  description: string;
  weight: number;
}

interface EvaluationCriteriaProps {
  criteria: EvaluationCriterion[];
}

export default function EvaluationCriteria({
  criteria,
}: EvaluationCriteriaProps) {
  return (
    <div className="space-y-3">
      {criteria.map((criterion) => (
        <div
          key={criterion.id}
          className="rounded-lg border bg-white p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-blue-600">
                {criterion.code}
              </span>

              <h3 className="font-medium text-gray-900">
                {criterion.name}
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                {criterion.description}
              </p>
            </div>

            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs">
              Poids: {criterion.weight}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}