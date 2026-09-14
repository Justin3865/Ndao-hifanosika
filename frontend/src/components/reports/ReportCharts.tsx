"use client";

interface ChartItem {
  label: string;
  value: number;
}

interface ReportChartsProps {
  data: ChartItem[];
  title?: string;
}

export default function ReportCharts({
  data,
  title = "Évolution des indicateurs",
}: ReportChartsProps) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="rounded-xl border bg-white p-5">
      <h3 className="mb-5 text-lg font-semibold">{title}</h3>

      <div className="space-y-4">
        {data.map((item) => {
          const width = (item.value / max) * 100;

          return (
            <div key={item.label}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{item.label}</span>
                <span className="font-semibold">
                  {item.value}
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}