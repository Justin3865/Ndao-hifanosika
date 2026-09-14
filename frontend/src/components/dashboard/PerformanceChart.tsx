"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export interface PerformanceData {
  label: string;
  score: number;
}

interface PerformanceChartProps {
  data?: PerformanceData[];
  className?: string;
}

const defaultData: PerformanceData[] = [
  { label: "Jan", score: 68 },
  { label: "Fév", score: 72 },
  { label: "Mar", score: 75 },
  { label: "Avr", score: 78 },
  { label: "Mai", score: 82 },
  { label: "Juin", score: 86 },
];

export default function PerformanceChart({
  data = defaultData,
  className,
}: PerformanceChartProps) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle>Performance</CardTitle>
        <p className="text-xs text-muted-foreground">
          Score moyen des équipes
        </p>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {data.map((item) => (
            <div key={item.label}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium">
                  {item.label}
                </span>

                <span className="text-xs font-semibold">
                  {item.score}%
                </span>
              </div>

              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(Math.max(item.score, 0), 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl bg-muted/40 p-4">
          <p className="text-xs text-muted-foreground">
            Score moyen actuel
          </p>

          <p className="mt-1 text-2xl font-bold">
            {Math.round(
              data.reduce((sum, item) => sum + item.score, 0) /
                Math.max(data.length, 1)
            )}
            %
          </p>
        </div>
      </CardContent>
    </Card>
  );
}