"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export interface BeneficiaryData {
  label: string;
  value: number;
}

interface BeneficiaryChartProps {
  data?: BeneficiaryData[];
  className?: string;
}

const defaultData: BeneficiaryData[] = [
  { label: "Maison Digitale", value: 245 },
  { label: "Kids Preneur", value: 180 },
  { label: "Ankizy Innov", value: 135 },
  { label: "Otrikasa", value: 210 },
];

export default function BeneficiaryChart({
  data = defaultData,
  className,
}: BeneficiaryChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle>Bénéficiaires</CardTitle>
        <p className="text-xs text-muted-foreground">
          Répartition par programme
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="text-3xl font-bold">{total}</div>
        <p className="text-xs text-muted-foreground">
          bénéficiaires suivis au total
        </p>

        <div className="space-y-4">
          {data.map((item) => {
            const percentage = (item.value / total) * 100;

            return (
              <div key={item.label}>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="truncate text-sm">
                    {item.label}
                  </span>

                  <span className="shrink-0 text-xs font-semibold">
                    {item.value}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${Math.min(
                        (item.value / maxValue) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>

                <p className="mt-1 text-right text-[11px] text-muted-foreground">
                  {percentage.toFixed(1)}%
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}