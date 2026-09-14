"use client";

interface CampaignStatusProps {
  status: "draft" | "active" | "completed" | "archived";
}

const statusConfig = {
  draft: {
    label: "Brouillon",
    className: "bg-gray-100 text-gray-700",
  },
  active: {
    label: "Active",
    className: "bg-green-100 text-green-700",
  },
  completed: {
    label: "Terminée",
    className: "bg-blue-100 text-blue-700",
  },
  archived: {
    label: "Archivée",
    className: "bg-red-100 text-red-700",
  },
};

export default function CampaignStatus({
  status,
}: CampaignStatusProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}