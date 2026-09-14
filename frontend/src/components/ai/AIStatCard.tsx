"use client";

import {
  Activity,
  AlertTriangle,
  Brain,
  TrendingUp,
  Users,
} from "lucide-react";

interface AIStatCardProps {
  title: string;
  value: string | number;
  description?: string;
  type?: "default" | "success" | "warning" | "danger" | "info";
  icon?: "brain" | "users" | "trend" | "alert" | "activity";
}

const iconMap = {
  brain: Brain,
  users: Users,
  trend: TrendingUp,
  alert: AlertTriangle,
  activity: Activity,
};

const typeStyles = {
  default: "bg-gray-50 text-gray-700",
  success: "bg-green-50 text-green-700",
  warning: "bg-yellow-50 text-yellow-700",
  danger: "bg-red-50 text-red-700",
  info: "bg-blue-50 text-blue-700",
};

export default function AIStatCard({
  title,
  value,
  description,
  type = "default",
  icon = "brain",
}: AIStatCardProps) {
  const Icon = iconMap[icon];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {value}
          </p>

          {description && (
            <p className="mt-1 text-sm text-gray-500">
              {description}
            </p>
          )}
        </div>

        <div
          className={`rounded-lg p-3 ${typeStyles[type]}`}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}