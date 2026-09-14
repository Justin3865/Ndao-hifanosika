"use client";

interface EvaluationSummaryProps {
  total: number;
  completed: number;
  pending: number;
  averageScore: number;
}

export default function EvaluationSummary({
  total,
  completed,
  pending,
  averageScore,
}: EvaluationSummaryProps) {
  const cards = [
    {
      label: "Total évaluations",
      value: total,
    },
    {
      label: "Terminées",
      value: completed,
    },
    {
      label: "En attente",
      value: pending,
    },
    {
      label: "Score moyen",
      value: `${averageScore}/100`,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border bg-white p-5 shadow-sm"
        >
          <p className="text-sm text-gray-500">
            {card.label}
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}