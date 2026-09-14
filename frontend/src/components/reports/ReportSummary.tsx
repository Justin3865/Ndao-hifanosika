"use client";

import {
  FileText,
  Users,
  Target,
  TrendingUp,
} from "lucide-react";

interface ReportSummaryProps {
  totalReports: number;
  beneficiaries: number;
  objectives: number;
  completionRate: number;
}

export default function ReportSummary({
  totalReports,
  beneficiaries,
  objectives,
  completionRate,
}: ReportSummaryProps) {
  const cards = [
    {
      label: "Rapports",
      value: totalReports,
      icon: FileText,
    },
    {
      label: "Bénéficiaires",
      value: beneficiaries,
      icon: Users,
    },
    {
      label: "Objectifs",
      value: objectives,
      icon: Target,
    },
    {
      label: "Réalisation",
      value: `${completionRate}%`,
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.label}
            className="rounded-xl border bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  {card.label}
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {card.value}
                </p>
              </div>

              <div className="rounded-lg bg-blue-50 p-3">
                <Icon className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}