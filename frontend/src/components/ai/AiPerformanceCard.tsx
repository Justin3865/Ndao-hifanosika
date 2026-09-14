"use client";

import { Award, TrendingDown, TrendingUp } from "lucide-react";

interface PerformanceCardProps {
  name: string;
  score: number;
  previousScore?: number;
  label?: string;
}

export default function PerformanceCard({
  name,
  score,
  previousScore,
  label = "Performance",
}: PerformanceCardProps) {
  const currentScore = Math.max(0, Math.min(100, score));

  const difference =
    previousScore !== undefined
      ? currentScore - previousScore
      : undefined;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>

          <h3 className="mt-1 font-semibold text-gray-900">
            {name}
          </h3>
        </div>

        <div className="rounded-lg bg-indigo-50 p-3 text-indigo-600">
          <Award className="h-6 w-6" />
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between">
        <div>
          <span className="text-4xl font-bold text-gray-900">
            {currentScore}
          </span>

          <span className="ml-1 text-gray-500">/100</span>
        </div>

        {difference !== undefined && (
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              difference >= 0
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {difference >= 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}

            {difference > 0 ? "+" : ""}
            {difference.toFixed(1)}
          </div>
        )}
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-indigo-600"
          style={{ width: `${currentScore}%` }}
        />
      </div>
    </div>
  );
}