"use client";

import EvaluationScore from "./EvaluationScore";

interface EvaluationResultProps {
  score: number;
  strengths?: string[];
  improvements?: string[];
  recommendation?: string;
}

export default function EvaluationResult({
  score,
  strengths = [],
  improvements = [],
  recommendation,
}: EvaluationResultProps) {
  return (
    <div className="space-y-5">
      <EvaluationScore score={score} />

      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-green-700">
            Points forts
          </h3>

          {strengths.length > 0 ? (
            <ul className="space-y-2 text-sm text-gray-600">
              {strengths.map((item, index) => (
                <li key={index}>✓ {item}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">
              Aucun point fort renseigné.
            </p>
          )}
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-orange-600">
            Axes d'amélioration
          </h3>

          {improvements.length > 0 ? (
            <ul className="space-y-2 text-sm text-gray-600">
              {improvements.map((item, index) => (
                <li key={index}>→ {item}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">
              Aucun axe d'amélioration renseigné.
            </p>
          )}
        </div>
      </div>

      {recommendation && (
        <div className="rounded-xl border bg-blue-50 p-5">
          <h3 className="mb-2 font-semibold text-blue-800">
            Recommandation
          </h3>

          <p className="text-sm text-blue-900">
            {recommendation}
          </p>
        </div>
      )}
    </div>
  );
}