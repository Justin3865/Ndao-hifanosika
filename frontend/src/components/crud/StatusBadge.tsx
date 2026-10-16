import { STATUS_COLORS, STATUS_LABELS } from "@/lib/crud";

export function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return <span>—</span>;

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
        STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
