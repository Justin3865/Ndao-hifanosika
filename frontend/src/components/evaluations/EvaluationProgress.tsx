// src/components/evaluations/EvaluationProgress.tsx
"use client";

import { TrendingUp, TrendingDown, Minus, Calendar, Users, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export interface EvaluationProgressProps {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  className?: string;
  showLabels?: boolean;
  compact?: boolean;
}

export function EvaluationProgress({
  total,
  completed,
  inProgress,
  pending,
  className,
  showLabels = true,
  compact = false,
}: EvaluationProgressProps) {
  const completionRate = total > 0 ? (completed / total) * 100 : 0;

  return (
    <Card className={cn(className)}>
      <CardHeader className={compact ? "pb-2" : ""}>
        <CardTitle className={cn("flex items-center justify-between", compact ? "text-base" : "")}>
          <span>Progression des évaluations</span>
          <span className="text-lg font-bold text-primary">
            {completionRate.toFixed(0)}%
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className={compact ? "pt-0" : ""}>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Progression</span>
              <span className="font-medium">{completed}/{total}</span>
            </div>
            <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-1000"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>

          <div className={cn(
            "grid gap-2",
            compact ? "grid-cols-3 text-xs" : "grid-cols-3 text-sm"
          )}>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-950/20">
              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
              <div>
                <p className={cn("font-medium", compact ? "text-xs" : "")}>{completed}</p>
                {showLabels && <p className="text-muted-foreground">Terminées</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
              <Clock className="h-4 w-4 text-yellow-500 flex-shrink-0" />
              <div>
                <p className={cn("font-medium", compact ? "text-xs" : "")}>{inProgress}</p>
                {showLabels && <p className="text-muted-foreground">En cours</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <Calendar className="h-4 w-4 text-blue-500 flex-shrink-0" />
              <div>
                <p className={cn("font-medium", compact ? "text-xs" : "")}>{pending}</p>
                {showLabels && <p className="text-muted-foreground">Planifiées</p>}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
            <span>Total: {total} évaluations</span>
            <span>Taux de complétion: {completionRate.toFixed(0)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}