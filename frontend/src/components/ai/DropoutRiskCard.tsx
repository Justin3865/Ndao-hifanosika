"use client";

import { AlertTriangle, CheckCircle, UserRound } from "lucide-react";

interface DropoutRiskCardProps {
  beneficiaryName: string;
  riskScore: number;
  reason?: string;
}

export default function DropoutRiskCard({
  beneficiaryName,
  riskScore,
  reason,
}: DropoutRiskCardProps) {
  const score = Math.max(0, Math.min(100, riskScore));

  const getRisk = () => {
    if (score >= 70) {
      return {
        label: "Risque élevé",
        className: "bg-red-100 text-red-700",
        icon: AlertTriangle,
      };
    }

    if (score >= 40) {
      return {
        label: "Risque moyen",
        className: "bg-yellow-100 text-yellow-700",
        icon: AlertTriangle,
      };
    }

    return {
      label: "Risque faible",
      className: "bg-green-100 text-green-700",
      icon: CheckCircle,
    };
  };

  const risk = getRisk();
  const RiskIcon = risk.icon;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-blue-100 p-2 text-blue-600">
          <UserRound className="h-5 w-5" />
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">
            {beneficiaryName}
          </h3>

          <p className="text-sm text-gray-500">
            Analyse du risque d&apos;abandon
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">
            Score de risque
          </span>

          <span className="font-bold text-gray-900">
            {score}%
          </span>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${score}%`,
              backgroundColor:
                score >= 70
                  ? "#dc2626"
                  : score >= 40
                  ? "#ca8a04"
                  : "#16a34a",
            }}
          />
        </div>
      </div>

      <div
        className={`mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${risk.className}`}
      >
        <RiskIcon className="h-4 w-4" />
        {risk.label}
      </div>

      {reason && (
        <div className="mt-4 rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-semibold uppercase text-gray-500">
            Facteurs détectés
          </p>

          <p className="mt-1 text-sm text-gray-700">
            {reason}
          </p>
        </div>
      )}
    </div>
  );
}