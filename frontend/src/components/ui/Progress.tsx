"use client";

interface ProgressProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Progress({
  value,
  max = 100,
  label,
  showValue = true,
  size = "md",
  className = "",
}: ProgressProps) {
  const safeMax = max > 0 ? max : 100;

  const percentage = Math.min(
    Math.max((value / safeMax) * 100, 0),
    100
  );

  const roundedPercentage = Math.round(percentage);

  const sizeClass = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  }[size];

  return (
    <div className={`w-full ${className}`}>
      {(label || showValue) && (
        <div className="mb-2 flex items-center justify-between gap-3">
          {label && (
            <span className="text-sm font-medium text-gray-700">
              {label}
            </span>
          )}

          {showValue && (
            <span className="text-sm font-semibold text-gray-700">
              {roundedPercentage}%
            </span>
          )}
        </div>
      )}

      <div
        className={`w-full overflow-hidden rounded-full bg-gray-200 ${sizeClass}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={safeMax}
      >
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-500"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}

export default Progress;