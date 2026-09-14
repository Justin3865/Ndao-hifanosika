"use client";

import {
  CheckCircle2,
  Info,
  TriangleAlert,
  X,
  XCircle,
} from "lucide-react";

export type ToastType =
  | "success"
  | "error"
  | "warning"
  | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  title?: string;
  onClose?: () => void;
  className?: string;
}

export function Toast({
  message,
  type = "success",
  title,
  onClose,
  className = "",
}: ToastProps) {
  const config = {
    success: {
      icon: CheckCircle2,
      title: title || "Succès",
      container:
        "border-green-200 bg-green-50 text-green-800",
      iconClass: "text-green-600",
    },

    error: {
      icon: XCircle,
      title: title || "Erreur",
      container:
        "border-red-200 bg-red-50 text-red-800",
      iconClass: "text-red-600",
    },

    warning: {
      icon: TriangleAlert,
      title: title || "Attention",
      container:
        "border-yellow-200 bg-yellow-50 text-yellow-800",
      iconClass: "text-yellow-600",
    },

    info: {
      icon: Info,
      title: title || "Information",
      container:
        "border-blue-200 bg-blue-50 text-blue-800",
      iconClass: "text-blue-600",
    },
  }[type];

  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={`flex w-full max-w-md items-start gap-3 rounded-xl border p-4 shadow-lg ${config.container} ${className}`}
    >
      <Icon
        size={21}
        className={`mt-0.5 shrink-0 ${config.iconClass}`}
      />

      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {config.title}
        </p>

        <p className="mt-1 text-sm opacity-90">
          {message}
        </p>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="rounded-md p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}

export default Toast;