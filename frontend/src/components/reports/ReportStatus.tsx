import type { ReportStatus as Status } from "./ReportTable";

interface ReportStatusProps {
  status: Status;
}

const config = {
  draft: {
    label: "Brouillon",
    className: "bg-gray-100 text-gray-700",
  },
  generated: {
    label: "Généré",
    className: "bg-blue-100 text-blue-700",
  },
  validated: {
    label: "Validé",
    className: "bg-green-100 text-green-700",
  },
  archived: {
    label: "Archivé",
    className: "bg-purple-100 text-purple-700",
  },
};

export default function ReportStatus({
  status,
}: ReportStatusProps) {
  const item = config[status];

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${item.className}`}
    >
      {item.label}
    </span>
  );
}