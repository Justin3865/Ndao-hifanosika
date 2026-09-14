// src/components/milestones/MilestoneTimeline.tsx
"use client";

import { CheckCircle2, Clock, AlertCircle, Circle, Calendar, Users, Target, FileText, AlertTriangle, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { cn } from "@/lib/utils";

export interface Milestone {
  id: string;
  title: string;
  date: string;
  status: "planifie" | "en_cours" | "termine" | "retard";
  description?: string;
  // Nouveaux champs
  progress?: number;
  deliverables?: string[];
  beneficiariesCount?: number;
  responsibleTeam?: string;
  aiRiskScore?: number;
  projectName?: string;
}

export interface MilestoneTimelineProps {
  milestones: Milestone[];
  className?: string;
  showDates?: boolean;
  compact?: boolean;
  showProgress?: boolean;
  showAIScores?: boolean;
}

const statusColors = {
  planifie: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  en_cours: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  termine: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  retard: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const statusIcons = {
  planifie: Circle,
  en_cours: Clock,
  termine: CheckCircle2,
  retard: AlertCircle,
};

const statusLabels = {
  planifie: "Planifié",
  en_cours: "En cours",
  termine: "Terminé",
  retard: "En retard",
};

export function MilestoneTimeline({
  milestones,
  className,
  showDates = true,
  compact = false,
  showProgress = true,
  showAIScores = true,
}: MilestoneTimelineProps) {
  const sortedMilestones = [...milestones].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const getRiskLabel = (score: number) => {
    if (score > 70) return { label: "Risque élevé", color: "text-red-600" };
    if (score > 40) return { label: "Risque modéré", color: "text-yellow-600" };
    return { label: "Risque faible", color: "text-green-600" };
  };

  return (
    <Card className={cn(className)}>
      <CardHeader className={compact ? "pb-2" : ""}>
        <CardTitle className={compact ? "text-base" : "flex items-center justify-between"}>
          <span>Chronologie des jalons</span>
          {!compact && (
            <span className="text-sm font-normal text-muted-foreground">
              {milestones.length} jalon{milestones.length > 1 ? 's' : ''}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className={compact ? "pt-0" : ""}>
        <div className="relative">
          {/* Ligne verticale */}
          <div className={cn(
            "absolute left-4 top-0 bottom-0 w-0.5 bg-muted",
            compact && "left-3"
          )} />

          <div className={cn(
            "space-y-4",
            compact && "space-y-3"
          )}>
            {sortedMilestones.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">Aucun jalon défini</p>
              </div>
            ) : (
              sortedMilestones.map((milestone, index) => {
                const StatusIcon = statusIcons[milestone.status];
                const isHighRisk = milestone.aiRiskScore && milestone.aiRiskScore > 70;
                const riskInfo = milestone.aiRiskScore ? getRiskLabel(milestone.aiRiskScore) : null;

                return (
                  <div key={milestone.id} className={cn(
                    "relative pl-10",
                    compact && "pl-8"
                  )}>
                    {/* Point sur la timeline */}
                    <div
                      className={cn(
                        "absolute left-3.5 -translate-x-1/2 rounded-full border-2 bg-background",
                        compact ? "w-2 h-2" : "w-2.5 h-2.5",
                        milestone.status === "termine" && "border-green-500 bg-green-500",
                        milestone.status === "en_cours" && "border-yellow-500 bg-yellow-500",
                        milestone.status === "planifie" && "border-blue-500",
                        milestone.status === "retard" && "border-red-500 bg-red-500",
                        isHighRisk && "ring-2 ring-red-300 dark:ring-red-700"
                      )}
                    />

                    <div className={cn(
                      "p-3 rounded-xl bg-muted/30 transition-colors hover:bg-muted/50",
                      compact && "p-2",
                      milestone.status === "termine" && "bg-green-50/30 dark:bg-green-950/10",
                      isHighRisk && "border-l-4 border-red-500"
                    )}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className={cn(
                              "font-medium",
                              compact ? "text-sm" : "text-base"
                            )}>
                              {milestone.title}
                            </h4>
                            <Badge variant="outline" className={statusColors[milestone.status]}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusLabels[milestone.status]}
                            </Badge>
                            {isHighRisk && showAIScores && (
                              <Badge variant="destructive" className="text-[10px]">
                                <AlertTriangle className="h-2 w-2 mr-1" />
                                {riskInfo?.label}
                              </Badge>
                            )}
                            {milestone.projectName && (
                              <Badge variant="outline" className="text-[10px]">
                                <Building2 className="h-2 w-2 mr-1" />
                                {milestone.projectName}
                              </Badge>
                            )}
                          </div>
                          
                          {milestone.description && !compact && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {milestone.description}
                            </p>
                          )}

                          {/* Progression */}
                          {showProgress && milestone.progress !== undefined && milestone.progress > 0 && (
                            <div className="mt-2">
                              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>Progression</span>
                                <span>{milestone.progress}%</span>
                              </div>
                              <Progress value={milestone.progress} className="h-1.5" />
                            </div>
                          )}

                          {/* Détails supplémentaires */}
                          {!compact && (
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                              {milestone.responsibleTeam && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {milestone.responsibleTeam}
                                </span>
                              )}
                              {milestone.beneficiariesCount && milestone.beneficiariesCount > 0 && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {milestone.beneficiariesCount} bénéficiaires
                                </span>
                              )}
                              {milestone.deliverables && milestone.deliverables.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  {milestone.deliverables.length} livrable{milestone.deliverables.length > 1 ? 's' : ''}
                                </span>
                              )}
                              {milestone.aiRiskScore && showAIScores && (
                                <span className={cn(
                                  "flex items-center gap-1",
                                  riskInfo?.color
                                )}>
                                  <AlertTriangle className="h-3 w-3" />
                                  IA: {milestone.aiRiskScore}%
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {showDates && (
                          <div className="flex flex-col items-end flex-shrink-0">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(milestone.date).toLocaleDateString("fr-FR")}
                            </div>
                            {milestone.status === "retard" && (
                              <span className="text-xs text-red-600 mt-1">⚠️ En retard</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}