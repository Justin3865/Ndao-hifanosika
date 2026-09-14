"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export interface EvaluationData {
  label: string;
  completed: number;
  pending: number;
  overdue: number;
}

interface EvaluationChartProps {
  data?: EvaluationData[];
  className?: string;
}

const defaultData: EvaluationData[] = [
  { label: "Jan", completed: 32, pending: 8, overdue: 3 },
  { label: "Fév", completed: 41, pending: 11, overdue: 4 },
  { label: "Mar", completed: 48, pending: 7, overdue: 2 },
  { label: "Avr", completed: 55, pending: 9, overdue: 3 },
  { label: "Mai", completed: 61, pending: 6, overdue: 2 },
  { label: "Juin", completed: 68, pending: 8, overdue: 1 },
];

export default function EvaluationChart({
  data = defaultData,
  className,
}: EvaluationChartProps) {
  const maxValue = Math.max(
    ...data.map((item) => item.completed + item.pending + item.overdue),
    1
  );

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Évaluations</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Évolution des évaluations
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-xs">
            <Legend label="Terminées" />
            <Legend label="En cours" />
            <Legend label="En retard" />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex h-64 items-end gap-3 border-b border-border px-2 pb-2">
          {data.map((item) => {
            const completedHeight =
              (item.completed / maxValue) * 100;
            const pendingHeight =
              (item.pending / maxValue) * 100;
            const overdueHeight =
              (item.overdue / maxValue) * 100;

            return (
              <div
                key={item.label}
                className="flex h-full flex-1 flex-col justify-end"
              >
                <div className="flex h-full items-end justify-center gap-1">
                  <div
                    title={`Terminées: ${item.completed}`}
                    className="w-2.5 rounded-t bg-green-500"
                    style={{ height: `${completedHeight}%` }}
                  />

                  <div
                    title={`En cours: ${item.pending}`}
                    className="w-2.5 rounded-t bg-yellow-500"
                    style={{ height: `${pendingHeight}%` }}
                  />

                  <div
                    title={`En retard: ${item.overdue}`}
                    className="w-2.5 rounded-t bg-red-500"
                    style={{ height: `${overdueHeight}%` }}
                  />
                </div>

                <span className="mt-2 text-center text-xs text-muted-foreground">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function Legend({ label }: { label: string }) {
  const className =
    label === "Terminées"
      ? "bg-green-500"
      : label === "En cours"
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <span className={cn("h-2 w-2 rounded-full", className)} />
      {label}
    </span>
  );
}