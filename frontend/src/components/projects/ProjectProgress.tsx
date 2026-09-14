"use client";

import { cn } from "@/lib/utils";

import type {
  ProjectStatus,
} from "./ProjectTable";

interface ProjectProgressProps {
  progress: number;
  status?: ProjectStatus;

  label?: string;
  showPercentage?: boolean;

  className?: string;

  size?: "sm" | "md" | "lg";

  animated?: boolean;

  variant?: "bar" | "circle";
}

function getStatusColor(
  status?: ProjectStatus
) {
  switch (status) {
    case "planifie":
      return "text-blue-600";

    case "en_cours":
      return "text-blue-600";

    case "cloture":
      return "text-gray-600";

    default:
      return "text-blue-600";
  }
}

export default function ProjectProgress({
  progress,
  status,
  label = "Avancement",
  showPercentage = true,
  className,
  size = "md",
  animated = true,
  variant = "bar",
}: ProjectProgressProps) {
  const safeProgress = Math.min(
    100,
    Math.max(0, Number(progress) || 0)
  );

  if (variant === "circle") {
    const circleSizes = {
      sm: 64,
      md: 96,
      lg: 128,
    };

    const strokeSizes = {
      sm: 6,
      md: 8,
      lg: 10,
    };

    const dimension = circleSizes[size];
    const strokeWidth = strokeSizes[size];

    const radius =
      (dimension - strokeWidth) / 2;

    const circumference =
      2 * Math.PI * radius;

    const offset =
      circumference -
      (safeProgress / 100) *
        circumference;

    return (
      <div
        className={cn(
          "flex flex-col items-center",
          className
        )}
      >
        <div
          className="relative"
          style={{
            width: dimension,
            height: dimension,
          }}
        >
          <svg
            width={dimension}
            height={dimension}
            viewBox={`0 0 ${dimension} ${dimension}`}
            className="-rotate-90"
          >
            <circle
              cx={dimension / 2}
              cy={dimension / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              className="text-gray-200"
              strokeWidth={strokeWidth}
            />

            <circle
              cx={dimension / 2}
              cy={dimension / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              className={cn(
                getStatusColor(status),
                animated &&
                  "transition-all duration-700"
              )}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>

          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold">
              {Math.round(safeProgress)}%
            </span>
          </div>
        </div>

        {label && (
          <span className="mt-2 text-sm text-gray-500">
            {label}
          </span>
        )}
      </div>
    );
  }

  const heights = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  return (
    <div className={cn("w-full", className)}>
      {(label || showPercentage) && (
        <div className="mb-2 flex items-center justify-between gap-3">
          {label && (
            <span className="text-sm font-medium text-gray-700">
              {label}
            </span>
          )}

          {showPercentage && (
            <span className="text-sm font-semibold text-gray-700">
              {Math.round(safeProgress)}%
            </span>
          )}
        </div>
      )}

      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-gray-200",
          heights[size]
        )}
      >
        <div
          className={cn(
            "h-full rounded-full",
            status === "cloture"
              ? "bg-gray-500"
              : "bg-blue-500",
            animated &&
              "transition-all duration-700"
          )}
          style={{
            width: `${safeProgress}%`,
          }}
        />
      </div>
    </div>
  );
}