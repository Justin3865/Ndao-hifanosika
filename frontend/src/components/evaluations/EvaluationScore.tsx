"use client";

interface EvaluationScoreProps {
  score: number;
  max?: number;
  label?: string;
}

export default function EvaluationScore({
  score,
  max = 100,
  label = "Score global",
}: EvaluationScoreProps) {
  const percentage = Math.min(
    100,
    Math.max(0, (score / max) * 100)
  );

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600">
          {label}
        </span>

        <span className="text-2xl font-bold text-gray-900">
          {score}/{max}
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-gray-500">
        {percentage.toFixed(1)}% de performance
      </p>
    </div>
  );
}