"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  className?: string;
}

export default function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendLabel = "vs mois dernier",
  className,
}: StatCardProps) {
  const positive = trend !== undefined && trend >= 0;

  return (
    <Card className={cn("h-full", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              {title}
            </p>

            <p className="mt-2 text-3xl font-bold tracking-tight">
              {value}
            </p>

            {description && (
              <p className="mt-1 text-xs text-muted-foreground">
                {description}
              </p>
            )}

            {trend !== undefined && (
              <div className="mt-3 flex items-center gap-1 text-xs">
                {positive ? (
                  <ArrowUpRight className="h-4 w-4 text-green-600" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-600" />
                )}

                <span
                  className={cn(
                    "font-semibold",
                    positive ? "text-green-600" : "text-red-600"
                  )}
                >
                  {positive ? "+" : ""}
                  {trend}%
                </span>

                <span className="text-muted-foreground">
                  {trendLabel}
                </span>
              </div>
            )}
          </div>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}