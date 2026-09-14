"use client";

interface InternshipSummaryProps {
  total: number;
  active: number;
  completed: number;
  pending: number;
}

export default function InternshipSummary({
  total,
  active,
  completed,
  pending,
}: InternshipSummaryProps) {
  const items = [
    {
      label: "Total stagiaires",
      value: total,
    },
    {
      label: "Stages en cours",
      value: active,
    },
    {
      label: "Stages terminés",
      value: completed,
    },
    {
      label: "En attente",
      value: pending,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border bg-white p-5 shadow-sm"
        >
          <p className="text-sm text-gray-500">
            {item.label}
          </p>

          <p className="mt-2 text-2xl font-bold">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}