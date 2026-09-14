import { CalendarDays } from "lucide-react";

interface ReportPeriodProps {
  startDate: string;
  endDate: string;
  label?: string;
}

export default function ReportPeriod({
  startDate,
  endDate,
  label = "Période du rapport",
}: ReportPeriodProps) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-blue-50 p-2">
          <CalendarDays className="h-5 w-5 text-blue-600" />
        </div>

        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="font-semibold text-gray-900">
            {startDate} — {endDate}
          </p>
        </div>
      </div>
    </div>
  );
}