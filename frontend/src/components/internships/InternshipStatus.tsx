"use client";

export type InternshipStatusType =
  | "pending"
  | "active"
  | "completed"
  | "cancelled";

interface InternshipStatusProps {
  status: InternshipStatusType;
}

const statusConfig = {
  pending: {
    label: "En attente",
    className: "bg-yellow-100 text-yellow-700",
  },
  active: {
    label: "En cours",
    className: "bg-green-100 text-green-700",
  },
  completed: {
    label: "Terminé",
    className: "bg-blue-100 text-blue-700",
  },
  cancelled: {
    label: "Annulé",
    className: "bg-red-100 text-red-700",
  },
};

export default function InternshipStatus({
  status,
}: InternshipStatusProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}