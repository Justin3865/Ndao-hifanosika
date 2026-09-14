interface Statistic {
  label: string;
  value: number;
  target?: number;
  unit?: string;
}

interface ReportStatisticsProps {
  statistics: Statistic[];
}

export default function ReportStatistics({
  statistics,
}: ReportStatisticsProps) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <h3 className="mb-5 text-lg font-semibold">
        Statistiques
      </h3>

      <div className="space-y-5">
        {statistics.map((item) => {
          const percentage =
            item.target && item.target > 0
              ? Math.min((item.value / item.target) * 100, 100)
              : 0;

          return (
            <div key={item.label}>
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-medium">{item.label}</span>

                <span className="text-gray-500">
                  {item.value}
                  {item.unit ? ` ${item.unit}` : ""}
                  {item.target
                    ? ` / ${item.target}${
                        item.unit ? ` ${item.unit}` : ""
                      }`
                    : ""}
                </span>
              </div>

              {item.target && (
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}