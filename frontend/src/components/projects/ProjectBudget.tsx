"use client";

import {
  TrendingUp,
  TrendingDown,
  Wallet,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

import { cn } from "@/lib/utils";

interface ProjectBudgetProps {
  total: number;
  spent: number;
  remaining: number;

  currency?: string;

  className?: string;

  showDetails?: boolean;
}

function formatCurrency(
  value: number,
  currency: string
) {
  return new Intl.NumberFormat("fr-MG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ProjectBudget({
  total,
  spent,
  remaining,
  currency = "MGA",
  className,
  showDetails = true,
}: ProjectBudgetProps) {
  const safeTotal = Math.max(0, total || 0);

  const safeSpent = Math.max(
    0,
    Math.min(spent || 0, safeTotal)
  );

  const safeRemaining = Math.max(
    0,
    remaining ?? safeTotal - safeSpent
  );

  const spentPercentage =
    safeTotal > 0
      ? (safeSpent / safeTotal) * 100
      : 0;

  const remainingPercentage =
    safeTotal > 0
      ? (safeRemaining / safeTotal) * 100
      : 0;

  let statusText = "Budget maîtrisé";
  let statusClass = "text-green-600";

  if (spentPercentage >= 80) {
    statusText = "Budget presque épuisé";
    statusClass = "text-red-600";
  } else if (spentPercentage >= 50) {
    statusText = "Surveillance du budget";
    statusClass = "text-orange-600";
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Budget du projet
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <p className="text-sm text-gray-500">
              Budget total
            </p>

            <p className="mt-1 text-lg font-bold">
              {formatCurrency(
                safeTotal,
                currency
              )}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Dépensé
            </p>

            <p className="mt-1 text-lg font-bold">
              {formatCurrency(
                safeSpent,
                currency
              )}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Restant
            </p>

            <p className="mt-1 text-lg font-bold">
              {formatCurrency(
                safeRemaining,
                currency
              )}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-gray-500">
              Consommation du budget
            </span>

            <span className="font-semibold">
              {spentPercentage.toFixed(1)}%
            </span>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-gray-200">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                "bg-blue-500"
              )}
              style={{
                width: `${spentPercentage}%`,
              }}
            />
          </div>
        </div>

        {showDetails && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />

                <span className="text-sm text-gray-500">
                  Dépensé
                </span>
              </div>

              <p className="mt-1 font-semibold">
                {spentPercentage.toFixed(1)}%
              </p>
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />

                <span className="text-sm text-gray-500">
                  Disponible
                </span>
              </div>

              <p className="mt-1 font-semibold">
                {remainingPercentage.toFixed(1)}%
              </p>
            </div>
          </div>
        )}

        <p
          className={cn(
            "mt-4 text-sm font-medium",
            statusClass
          )}
        >
          {statusText}
        </p>
      </CardContent>
    </Card>
  );
}