// src/components/activities/ActivityTable.tsx
"use client";

import Link from "next/link";
import { Eye, Edit, Trash2, Calendar, Users, Clock, CheckCircle2, AlertCircle, Activity as ActivityIcon, AlertTriangle, FileText, BarChart3 } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { cn } from "@/lib/utils";

export interface Activity {
  id: string;
  title: string;
  description: string;
  project: string;
  projectId: string;
  date: string;
  status: "planifie" | "en_cours" | "termine" | "annule";
  participants: number;
  type: "formation" | "atelier" | "reunion" | "suivi" | "autre" | "stage";
  report?: string;
  // Nouveaux champs
  progress?: number;
  aiRiskScore?: number;
  deliverablesCount?: number;
  internshipLevel?: "L3" | "M2";
  hasReport?: boolean;
  budgetIndicatif?: number;
  budgetSpent?: number;
}

export interface ActivityTableProps {
  activities: Activity[];
  onEdit?: (activity: Activity) => void;
  onDelete?: (activity: Activity) => void;
  onView?: (activity: Activity) => void;
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
  annule: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const statusLabels = {
  planifie: "Planifié",
  en_cours: "En cours",
  termine: "Terminé",
  annule: "Annulé",
};

const statusIcons = {
  planifie: Clock,
  en_cours: ActivityIcon,
  termine: CheckCircle2,
  annule: AlertCircle,
};

const typeLabels = {
  formation: "Formation",
  atelier: "Atelier",
  reunion: "Réunion",
  suivi: "Suivi",
  autre: "Autre",
  stage: "Stage",
};

const typeColors = {
  formation: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  atelier: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  reunion: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  suivi: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  autre: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  stage: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
};

export function ActivityTable({
  activities,
  onEdit,
  onDelete,
  onView,
  className,
  showActions = true,
  loading = false,
  compact = false,
  showAIInsights = true,
}: ActivityTableProps) {
  const getDateStatus = (date: string) => {
    const today = new Date();
    const activityDate = new Date(date);
    if (activityDate < today) return "past";
    if (activityDate.toDateString() === today.toDateString()) return "today";
    return "future";
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
            <TableHead>Activité</TableHead>
            <TableHead className="hidden md:table-cell">Projet</TableHead>
            <TableHead className="hidden lg:table-cell">Type</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="hidden sm:table-cell">Participants</TableHead>
            <TableHead>Statut</TableHead>
            {showAIInsights && <TableHead className="hidden xl:table-cell">Score IA</TableHead>}
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
          ) : activities.length === 0 ? (
            <TableEmpty colSpan={showActions ? (showAIInsights ? 9 : 8) : (showAIInsights ? 8 : 7)}>
              <p className="text-sm text-muted-foreground">Aucune activité trouvée</p>
            </TableEmpty>
          ) : (
            activities.map((activity) => {
              const StatusIcon = statusIcons[activity.status];
              const dateStatus = getDateStatus(activity.date);
              const isHighRisk = activity.aiRiskScore && activity.aiRiskScore > 70;
              const riskInfo = activity.aiRiskScore ? getRiskLabel(activity.aiRiskScore) : null;

              return (
                <TableRow key={activity.id} className={isHighRisk ? "bg-red-50/50 dark:bg-red-900/10" : ""}>
                  <TableCell>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/activities/${activity.id}`}
                          className="font-medium hover:text-primary transition-colors"
                        >
                          {activity.title}
                        </Link>
                        {activity.internshipLevel && (
                          <Badge variant="outline" className="bg-indigo-100 text-indigo-700 text-[10px]">
                            {activity.internshipLevel}
                          </Badge>
                        )}
                        {isHighRisk && (
                          <Badge variant="destructive" className="text-[10px]">
                            <AlertTriangle className="h-2 w-2 mr-1" />
                            Risque
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{activity.description}</p>
                      {activity.progress !== undefined && activity.progress > 0 && (
                        <div className="mt-1 flex items-center gap-2">
                          <Progress value={activity.progress} className="h-1 w-20" />
                          <span className="text-xs text-muted-foreground">{activity.progress}%</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Link
                      href={`/projects/${activity.projectId}`}
                      className="text-sm hover:text-primary transition-colors"
                    >
                      {activity.project}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Badge variant="outline" className={typeColors[activity.type]}>
                      {typeLabels[activity.type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">
                        {new Date(activity.date).toLocaleDateString("fr-FR")}
                      </span>
                      {dateStatus === "today" && (
                        <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-[10px]">
                          Aujourd'hui
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {activity.participants}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[activity.status]}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusLabels[activity.status]}
                    </Badge>
                    {activity.hasReport && (
                      <Badge variant="outline" className="bg-green-100 text-green-700 text-[10px] ml-1">
                        Rapport
                      </Badge>
                    )}
                  </TableCell>
                  {showAIInsights && (
                    <TableCell className="hidden xl:table-cell">
                      {activity.aiRiskScore ? (
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "flex items-center gap-1",
                            riskInfo?.color
                          )}>
                            <AlertTriangle className="h-3 w-3" />
                            <span className="text-xs font-medium">{activity.aiRiskScore}%</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{riskInfo?.label}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  )}
                  {showActions && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onView?.(activity)}
                          className="h-8 w-8"
                          title="Voir"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit?.(activity)}
                          className="h-8 w-8"
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete?.(activity)}
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