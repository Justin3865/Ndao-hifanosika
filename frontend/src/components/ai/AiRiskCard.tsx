// src/components/ai/AiRiskCard.tsx
"use client";

import { useState } from "react";
import { AlertTriangle, TrendingUp, TrendingDown, Users, Calendar, Clock, Eye, Download, Target, Sparkles, Shield, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface RiskFactor {
  label: string;
  severity: "critique" | "eleve" | "modere" | "faible";
}

export interface AiRiskCardProps {
  name: string;
  program: string;
  riskScore: number;
  status: "critique" | "eleve" | "modere" | "faible";
  factors: RiskFactor[];
  recommendations: string[];
  lastUpdate: string;
  onView?: () => void;
  onTrack?: () => void;
  className?: string;
  compact?: boolean;
}

const statusColors = {
  critique: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  eleve: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  modere: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  faible: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

const statusLabels = {
  critique: "Critique",
  eleve: "Élevé",
  modere: "Modéré",
  faible: "Faible",
};

const statusIcons = {
  critique: AlertTriangle,
  eleve: AlertCircle,
  modere: AlertCircle,
  faible: Shield,
};

const severityColors = {
  critique: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  eleve: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  modere: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  faible: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

export function AiRiskCard({
  name,
  program,
  riskScore,
  status,
  factors,
  recommendations,
  lastUpdate,
  onView,
  onTrack,
  className,
  compact = false,
}: AiRiskCardProps) {
  const StatusIcon = statusIcons[status];

  return (
    <Card className={cn(
      "hover:shadow-md transition-all",
      status === "critique" && "border-red-300 dark:border-red-800",
      status === "eleve" && "border-orange-300 dark:border-orange-800",
      className
    )}>
      <CardHeader className={compact ? "pb-2" : ""}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              statusColors[status]
            )}>
              <StatusIcon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className={compact ? "text-base" : ""}>{name}</CardTitle>
              <CardDescription>{program}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={statusColors[status]}>
              {statusLabels[status]}
            </Badge>
            <Badge variant="outline" className="bg-primary/10 text-primary">
              {riskScore}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className={compact ? "pt-0" : ""}>
        <div className="space-y-3">
          {/* Barre de risque */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Niveau de risque</span>
              <span className="font-medium">{riskScore}%</span>
            </div>
            <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-1000",
                  riskScore >= 80 ? "bg-red-500" :
                  riskScore >= 60 ? "bg-orange-500" :
                  riskScore >= 40 ? "bg-yellow-500" :
                  "bg-green-500"
                )}
                style={{ width: `${riskScore}%` }}
              />
            </div>
          </div>

          {/* Facteurs de risque */}
          {!compact && factors.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1.5">Facteurs de risque:</p>
              <div className="flex flex-wrap gap-1.5">
                {factors.map((factor, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className={severityColors[factor.severity]}
                  >
                    {factor.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Recommandations */}
          {!compact && recommendations.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1.5">Recommandations:</p>
              <div className="flex flex-wrap gap-1.5">
                {recommendations.map((rec, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="bg-primary/10 text-primary gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    {rec}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className={cn(
            "flex items-center justify-between pt-2",
            !compact && "border-t border-border/50"
          )}>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Mis à jour le {new Date(lastUpdate).toLocaleDateString("fr-FR")}
            </span>
            <div className="flex items-center gap-1">
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
                onClick={onTrack}
                className="h-7 text-xs text-primary"
              >
                <Target className="h-3.5 w-3.5 mr-1" />
                Suivre
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}