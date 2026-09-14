// src/components/ai/AiSummary.tsx
"use client";

import { useState } from "react";
import { FileText, Calendar, Clock, Eye, Download, Sparkles, CheckCircle, AlertCircle, Building2, BarChart3, TrendingUp, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface SummaryMetric {
  label: string;
  value: string;
  trend: "up" | "down" | "stable";
}

export interface AiSummaryProps {
  title: string;
  project: string;
  projectId: string;
  period: string;
  generatedDate: string;
  status: "disponible" | "en_cours" | "erreur";
  wordCount: number;
  keyPoints: string[];
  metrics: SummaryMetric[];
  onView?: () => void;
  onDownload?: () => void;
  onRegenerate?: () => void;
  className?: string;
  compact?: boolean;
}

const statusColors = {
  disponible: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  en_cours: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  erreur: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const statusLabels = {
  disponible: "Disponible",
  en_cours: "En cours",
  erreur: "Erreur",
};

const statusIcons = {
  disponible: CheckCircle,
  en_cours: Clock,
  erreur: AlertCircle,
};

const trendIcons = {
  up: TrendingUp,
  down: TrendingUp,
  stable: TrendingUp,
};

const trendColors = {
  up: "text-green-600",
  down: "text-red-600",
  stable: "text-yellow-600",
};

export function AiSummary({
  title,
  project,
  projectId,
  period,
  generatedDate,
  status,
  wordCount,
  keyPoints,
  metrics,
  onView,
  onDownload,
  onRegenerate,
  className,
  compact = false,
}: AiSummaryProps) {
  const StatusIcon = statusIcons[status];

  return (
    <Card className={cn(
      "hover:shadow-md transition-all",
      status === "erreur" && "border-red-300 dark:border-red-800",
      className
    )}>
      <CardHeader className={compact ? "pb-2" : ""}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className={compact ? "text-base" : ""}>{title}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5" />
                {project}
                <span className="w-0.5 h-3 bg-border" />
                <Calendar className="h-3.5 w-3.5" />
                {period}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className={statusColors[status]}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusLabels[status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className={compact ? "pt-0" : ""}>
        <div className="space-y-3">
          {/* Métriques */}
          {metrics.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {metrics.map((metric, index) => {
                const TrendIcon = trendIcons[metric.trend];
                return (
                  <div key={index} className="p-2 rounded-lg bg-muted/30 text-center">
                    <p className="text-xs text-muted-foreground">{metric.label}</p>
                    <p className="text-sm font-bold">{metric.value}</p>
                    <TrendIcon className={cn("h-3 w-3 mx-auto", trendColors[metric.trend])} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Points clés */}
          {status === "disponible" && keyPoints.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1.5">Points clés:</p>
              <ul className="space-y-1">
                {keyPoints.map((point, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {status === "erreur" && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              La génération de la synthèse a échoué. Veuillez réessayer.
            </div>
          )}

          {/* Footer */}
          <div className={cn(
            "flex items-center justify-between pt-2",
            !compact && "border-t border-border/50"
          )}>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Généré le {new Date(generatedDate).toLocaleDateString("fr-FR")}
              {wordCount > 0 && ` • ${wordCount} mots`}
            </span>
            <div className="flex items-center gap-1">
              {status === "disponible" && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onView}
                    className="h-7 text-xs"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    Voir
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDownload}
                    className="h-7 text-xs"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Télécharger
                  </Button>
                </>
              )}
              {status === "erreur" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRegenerate}
                  className="h-7 text-xs text-primary"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  Régénérer
                </Button>
              )}
              {status === "en_cours" && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="animate-spin h-3 w-3 border-2 border-primary/20 border-t-primary rounded-full" />
                  Génération en cours...
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}