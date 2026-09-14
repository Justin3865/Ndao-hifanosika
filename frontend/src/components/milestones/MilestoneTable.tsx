// src/components/milestones/MilestoneTable.tsx
"use client";

import Link from "next/link";
import { Eye, Edit, Trash2, Calendar, Target, CheckCircle2, Clock, AlertCircle, Users, Building2, AlertTriangle, BarChart3 } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface Milestone {
  id: string;
  title: string;
  description: string;
  project: string;
  projectId: string;
  targetDate: string;
  actualDate?: string;
  status: "planifie" | "en_cours" | "termine" | "retard";
  progress: number;
  // Nouveaux champs
  responsibleTeam?: string;
  beneficiariesCount?: number;
  budgetIndicatif?: number;
  budgetSpent?: number;
  aiRiskScore?: number;
  hasDeliverables?: boolean;
  membersCount?: number;
}

export interface MilestoneTableProps {
  milestones: Milestone[];
  onEdit?: (milestone: Milestone) => void;
  onDelete?: (milestone: Milestone) => void;
  onView?: (milestone: Milestone) => void;
  className?: string;
  showActions?: boolean;
  loading?: boolean;
  compact?: boolean;
  showAIInsights?: boolean;
}

const statusColors = {
  planifie: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  en_cours: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  termine: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  retard: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const statusLabels = {
  planifie: "Planifié",
  en_cours: "En cours",
  termine: "Terminé",
  retard: "En retard",
};

const statusIcons = {
  planifie: Clock,
  en_cours: Target,
  termine: CheckCircle2,
  retard: AlertCircle,
};

export function MilestoneTable({
  milestones,
  onEdit,
  onDelete,
  onView,
  className,
  showActions = true,
  loading = false,
  compact = false,
  showAIInsights = true,
}: MilestoneTableProps) {
  const getDaysUntil = (date: string) => {
    const today = new Date();
    const target = new Date(date);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getRiskLabel = (score: number) => {
    if (score > 70) return { label: "Élevé", color: "text-red-600" };
    if (score > 40) return { label: "Modéré", color: "text-yellow-600" };
    return { label: "Faible", color: "text-green-600" };
  };

  return (
    <div className={cn("rounded-xl border border-border/50 overflow-hidden", className)}>
      <Table compact={compact}>
        <TableHeader>
          <TableRow>
            <TableHead>Jalon</TableHead>
            <TableHead className="hidden md:table-cell">Projet</TableHead>
            <TableHead className="hidden lg:table-cell">Progression</TableHead>
            <TableHead>Date cible</TableHead>
            <TableHead className="hidden sm:table-cell">Statut</TableHead>
            {showAIInsights && <TableHead className="hidden xl:table-cell">Score IA</TableHead>}
            <TableHead className="hidden md:table-cell text-center">Équipe</TableHead>
            {showActions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableEmpty colSpan={showActions ? (showAIInsights ? 9 : 8) : (showAIInsights ? 8 : 7)}>
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin h-6 w-6 border-2 border-primary/20 border-t-primary rounded-full" />
                <p className="text-sm text-muted-foreground">Chargement...</p>
              </div>
            </TableEmpty>
          ) : milestones.length === 0 ? (
            <TableEmpty colSpan={showActions ? (showAIInsights ? 9 : 8) : (showAIInsights ? 8 : 7)}>
              <p className="text-sm text-muted-foreground">Aucun jalon trouvé</p>
            </TableEmpty>
          ) : (
            milestones.map((milestone) => {
              const StatusIcon = statusIcons[milestone.status];
              const daysUntil = getDaysUntil(milestone.targetDate);
              const isOverdue = milestone.status === "retard";
              const isUpcoming = milestone.status === "planifie" && daysUntil <= 14 && daysUntil > 0;
              const isHighRisk = milestone.aiRiskScore && milestone.aiRiskScore > 70;
              const riskInfo = milestone.aiRiskScore ? getRiskLabel(milestone.aiRiskScore) : null;

              return (
                <TableRow key={milestone.id} className={isHighRisk ? "bg-red-50/50 dark:bg-red-900/10" : ""}>
                  <TableCell>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/milestones/${milestone.id}`}
                          className="font-medium hover:text-primary transition-colors"
                        >
                          {milestone.title}
                        </Link>
                        {isHighRisk && (
                          <Badge variant="destructive" className="text-[10px]">
                            <AlertTriangle className="h-2 w-2 mr-1" />
                            Risque
                          </Badge>
                        )}
                        {milestone.hasDeliverables && (
                          <Badge variant="outline" className="bg-purple-100 text-purple-700 text-[10px]">
                            Livrables
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{milestone.description}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Link
                      href={`/projects/${milestone.projectId}`}
                      className="text-sm hover:text-primary transition-colors"
                    >
                      {milestone.project}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-[40px]">
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              milestone.progress === 100
                                ? "bg-green-500"
                                : milestone.progress >= 50
                                ? "bg-yellow-500"
                                : "bg-primary"
                            )}
                            style={{ width: `${milestone.progress}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium min-w-[36px]">
                        {milestone.progress}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">
                        {new Date(milestone.targetDate).toLocaleDateString("fr-FR")}
                      </span>
                      {isOverdue && (
                        <Badge variant="outline" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-[10px]">
                          En retard
                        </Badge>
                      )}
                      {isUpcoming && (
                        <Badge variant="outline" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-[10px]">
                          Dans {daysUntil}j
                        </Badge>
                      )}
                    </div>
                    {milestone.actualDate && milestone.status === "termine" && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Réalisé: {new Date(milestone.actualDate).toLocaleDateString("fr-FR")}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline" className={statusColors[milestone.status]}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusLabels[milestone.status]}
                    </Badge>
                    {milestone.beneficiariesCount && milestone.beneficiariesCount > 0 && (
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {milestone.beneficiariesCount} bénéficiaires
                      </div>
                    )}
                  </TableCell>
                  {showAIInsights && (
                    <TableCell className="hidden xl:table-cell">
                      {milestone.aiRiskScore ? (
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "flex items-center gap-1",
                            riskInfo?.color
                          )}>
                            <AlertTriangle className="h-3 w-3" />
                            <span className="text-xs font-medium">{milestone.aiRiskScore}%</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{riskInfo?.label}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="hidden md:table-cell text-center">
                    {milestone.responsibleTeam ? (
                      <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {milestone.responsibleTeam}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onView?.(milestone)}
                          className="h-8 w-8"
                          title="Voir"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit?.(milestone)}
                          className="h-8 w-8"
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete?.(milestone)}
                          className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}