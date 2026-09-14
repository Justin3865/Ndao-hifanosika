// src/components/ai/AnomalyCard.tsx
"use client";

import {
  AlertCircle,
  CheckCircle,
  Info,
  Eye,
  XCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export type AnomalySeverity = "low" | "medium" | "high";
export type AnomalyStatus = "ouvert" | "en_cours" | "resolu" | "ignore";

interface AnomalyCardProps {
  title: string;
  description: string;
  severity?: AnomalySeverity;
  status?: AnomalyStatus;
  detectedAt?: string;
  entity?: string;
  entityType?: string;
  onView?: () => void;
  onResolve?: () => void;
  onIgnore?: () => void;
  expanded?: boolean;
  onToggle?: () => void;
  resolution?: string;
  className?: string;
}

const statusLabels = {
  ouvert: "Ouvert",
  en_cours: "En cours",
  resolu: "Résolu",
  ignore: "Ignoré",
};

const statusColors = {
  ouvert: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  en_cours: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  resolu: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  ignore: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const statusIcons = {
  ouvert: AlertCircle,
  en_cours: Clock,
  resolu: CheckCircle,
  ignore: XCircle,
};

export default function AnomalyCard({
  title,
  description,
  severity = "medium",
  status = "ouvert",
  detectedAt,
  entity,
  entityType,
  onView,
  onResolve,
  onIgnore,
  expanded = false,
  onToggle,
  resolution,
  className,
}: AnomalyCardProps) {
  const severityConfig = {
    low: {
      label: "Faible",
      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      icon: Info,
    },
    medium: {
      label: "Moyenne",
      className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
      icon: AlertCircle,
    },
    high: {
      label: "Élevée",
      className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
      icon: AlertCircle,
    },
  };

  const config = severityConfig[severity];
  const Icon = config.icon;
  const StatusIcon = statusIcons[status];

  // Ampiasaina rehefa misy fikandrana (click) ilay karatra
  const handleCardClick = () => {
    if (onToggle) {
      onToggle();
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border transition-all cursor-pointer",
        severity === "high" && "border-red-300 dark:border-red-800",
        severity === "medium" && "border-orange-300 dark:border-orange-800",
        severity === "low" && "border-blue-300 dark:border-blue-800",
        expanded && "border-primary/50",
        className
      )}
      onClick={handleCardClick}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              config.className
            )}
          >
            <Icon className="h-5 w-5" />
          </div>

          {/* Contenu principal */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </h3>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={config.className}>
                  {config.label}
                </Badge>
                <Badge variant="outline" className={statusColors[status]}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusLabels[status]}
                </Badge>
              </div>
            </div>

            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
              {description}
            </p>

            {/* Informations supplémentaires */}
            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
              {entityType && (
                <span className="flex items-center gap-1">
                  <span className="text-gray-400">Type:</span>
                  {entityType}
                </span>
              )}
              {entity && (
                <span className="flex items-center gap-1">
                  <span className="text-gray-400">Entité:</span>
                  {entity}
                </span>
              )}
              {detectedAt && (
                <span className="flex items-center gap-1">
                  <span className="text-gray-400">Détectée:</span>
                  {new Date(detectedAt).toLocaleDateString("fr-FR")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-border/50">
          {(status === "ouvert" || status === "en_cours") && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onResolve?.();
                }}
                className="h-8 text-xs text-green-600 hover:text-green-700"
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                Résoudre
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onIgnore?.();
                }}
                className="h-8 text-xs text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Ignorer
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onView?.();
            }}
            className="h-8 text-xs text-primary hover:text-primary/80"
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            Voir
          </Button>
        </div>

        {/* Détails étendus (Résolution) */}
        {expanded && resolution && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <p className="text-xs text-green-700 dark:text-green-300">
                <CheckCircle className="h-3 w-3 inline mr-1" />
                Résolution: {resolution}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}