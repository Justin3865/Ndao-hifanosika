// src/components/ai/AiAnomalyList.tsx
"use client";

import { useState } from "react";
import { Activity, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import AnomalyCard, { AnomalySeverity } from "./AnomalyCard";

export interface Anomaly {
  id: string;
  type: "doublon" | "incoherent" | "manquant" | "suspect";
  description: string;
  entity: string;
  entityId: string;
  entityType: "beneficiary" | "member" | "project" | "activity" | "evaluation";
  severity: "critique" | "eleve" | "modere" | "faible";
  status: "ouvert" | "en_cours" | "resolu" | "ignore";
  detectedDate: string;
  resolution?: string;
}

export interface AiAnomalyListProps {
  anomalies: Anomaly[];
  onView?: (anomaly: Anomaly) => void;
  onResolve?: (anomaly: Anomaly) => void;
  onIgnore?: (anomaly: Anomaly) => void;
  onRefresh?: () => void;
  className?: string;
  loading?: boolean;
  compact?: boolean;
  maxItems?: number;
}

// Fonction de mapping pour convertir les sévérités
function mapSeverity(severity: Anomaly["severity"]): AnomalySeverity {
  const map = {
    critique: "high",
    eleve: "high",
    modere: "medium",
    faible: "low",
  };
  return map[severity];
}

// Labels pour les types d'entités
const entityTypeLabels = {
  beneficiary: "Bénéficiaire",
  member: "Membre",
  project: "Projet",
  activity: "Activité",
  evaluation: "Évaluation",
};

// Labels pour les types d'anomalies
const typeLabels = {
  doublon: "Doublon détecté",
  incoherent: "Incohérence",
  manquant: "Donnée manquante",
  suspect: "Donnée suspecte",
};

export function AiAnomalyList({
  anomalies,
  onView,
  onResolve,
  onIgnore,
  onRefresh,
  className,
  loading = false,
  compact = false,
  maxItems = 10,
}: AiAnomalyListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const displayedAnomalies = anomalies.slice(0, maxItems);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Détection d'anomalies</CardTitle>
          <CardDescription>
            {anomalies.length} anomalie{anomalies.length > 1 ? "s" : ""} détectée{anomalies.length > 1 ? "s" : ""}
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          disabled={loading}
          className="h-8 w-8"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-2 border-primary/20 border-t-primary rounded-full" />
            <p className="text-sm text-muted-foreground mt-3">Analyse en cours...</p>
          </div>
        ) : displayedAnomalies.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Aucune anomalie détectée</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayedAnomalies.map((anomaly) => {
              const isExpanded = expandedId === anomaly.id;

              return (
                <AnomalyCard
                  key={anomaly.id}
                  title={typeLabels[anomaly.type]}
                  description={anomaly.description}
                  severity={mapSeverity(anomaly.severity)}
                  status={anomaly.status}
                  detectedAt={anomaly.detectedDate}
                  entity={anomaly.entity}
                  entityType={entityTypeLabels[anomaly.entityType]}
                  expanded={isExpanded}
                  onToggle={() => toggleExpand(anomaly.id)}
                  onView={() => onView?.(anomaly)}
                  onResolve={() => onResolve?.(anomaly)}
                  onIgnore={() => onIgnore?.(anomaly)}
                  resolution={anomaly.resolution}
                  className={cn(
                    anomaly.severity === "critique" && "border-l-4 border-l-red-500"
                  )}
                />
              );
            })}

            {anomalies.length > maxItems && (
              <div className="text-center pt-2">
                <Button variant="ghost" size="sm" className="text-primary">
                  Voir les {anomalies.length - maxItems} autres anomalies
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}