// src/components/activities/ActivityCard.tsx
"use client";

import Link from "next/link";
import { Calendar, Clock, Users, Building2, Eye, Edit, Trash2, MoreVertical, CheckCircle2, AlertCircle, Activity as ActivityIcon, AlertTriangle, FileText, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { cn } from "@/lib/utils";

export interface ActivityCardProps {
  id: string;
  title: string;
  description: string;
  project: string;
  projectId: string;
  date: string;
  time: string;
  endTime: string;
  location?: string;
  status: "planifie" | "en_cours" | "termine" | "annule";
  participants: number;
  type: "formation" | "atelier" | "reunion" | "suivi" | "autre" | "stage";
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  className?: string;
  showActions?: boolean;
  variant?: "default" | "compact";
  // Nouveaux champs pour le cahier des charges
  progress?: number;
  aiRiskScore?: number;
  deliverablesCount?: number;
  internshipLevel?: "L3" | "M2";
  hasReport?: boolean;
  budgetIndicatif?: number;
  budgetSpent?: number;
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

export function ActivityCard({
  id,
  title,
  description,
  project,
  projectId,
  date,
  time,
  endTime,
  location,
  status,
  participants,
  type,
  onEdit,
  onDelete,
  onView,
  className,
  showActions = true,
  variant = "default",
  progress = 0,
  aiRiskScore,
  deliverablesCount = 0,
  internshipLevel,
  hasReport = false,
  budgetIndicatif,
  budgetSpent,
}: ActivityCardProps) {
  const StatusIcon = statusIcons[status];
  const isHighRisk = aiRiskScore && aiRiskScore > 70;

  return (
    <Card className={cn(
      "hover:shadow-md transition-all group",
      variant === "compact" && "p-3",
      isHighRisk && "border-red-300 dark:border-red-800",
      className
    )}>
      <CardHeader className={cn(
        "flex flex-row items-start justify-between",
        variant === "compact" && "p-3"
      )}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className={cn(
              "hover:text-primary transition-colors",
              variant === "compact" ? "text-base" : "text-lg"
            )}>
              <Link href={`/activities/${id}`}>{title}</Link>
            </CardTitle>
            <Badge variant="outline" className={statusColors[status]}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusLabels[status]}
            </Badge>
            <Badge variant="outline" className={typeColors[type]}>
              {typeLabels[type]}
            </Badge>
            {isHighRisk && (
              <Badge variant="destructive" className="animate-pulse">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Risque élevé
              </Badge>
            )}
            {internshipLevel && (
              <Badge variant="outline" className="bg-indigo-100 text-indigo-700">
                {internshipLevel}
              </Badge>
            )}
          </div>
          {variant !== "compact" && (
            <CardDescription className="mt-1 line-clamp-2">
              {description}
            </CardDescription>
          )}
        </div>
        {showActions && (
          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              onClick={onView}
              className="h-8 w-8"
              title="Voir"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              className="h-8 w-8"
              title="Modifier"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
              title="Supprimer"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className={cn(
        variant === "compact" ? "p-3 pt-0" : ""
      )}>
        <div className={cn(
          "grid gap-2",
          variant === "compact" ? "grid-cols-2 text-xs" : "grid-cols-2 md:grid-cols-4 text-sm"
        )}>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className={cn(variant === "compact" ? "h-3 w-3" : "h-4 w-4")} />
            <Link
              href={`/projects/${projectId}`}
              className="hover:text-primary transition-colors truncate"
            >
              {project}
            </Link>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className={cn(variant === "compact" ? "h-3 w-3" : "h-4 w-4")} />
            <span>{new Date(date).toLocaleDateString("fr-FR")}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className={cn(variant === "compact" ? "h-3 w-3" : "h-4 w-4")} />
            <span>{time} - {endTime}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className={cn(variant === "compact" ? "h-3 w-3" : "h-4 w-4")} />
            <span>{participants} participants</span>
          </div>
        </div>

        {variant !== "compact" && (
          <>
            {/* Progression */}
            {progress > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Progression</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            )}

            {/* Budget */}
            {budgetIndicatif && (
              <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                <span>💰 Budget: {budgetIndicatif.toLocaleString()} Ar</span>
                {budgetSpent !== undefined && (
                  <span>Dépensé: {budgetSpent.toLocaleString()} Ar</span>
                )}
              </div>
            )}

            {/* Deliverables & Report */}
            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
              {deliverablesCount > 0 && (
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {deliverablesCount} livrable{deliverablesCount > 1 ? 's' : ''}
                </span>
              )}
              {hasReport && (
                <span className="flex items-center gap-1 text-green-600">
                  <BarChart3 className="h-3 w-3" />
                  Rapport disponible
                </span>
              )}
              {aiRiskScore && (
                <span className={cn(
                  "flex items-center gap-1",
                  aiRiskScore > 70 ? "text-red-600" : 
                  aiRiskScore > 40 ? "text-yellow-600" : 
                  "text-green-600"
                )}>
                  <AlertTriangle className="h-3 w-3" />
                  Score IA: {aiRiskScore}%
                </span>
              )}
            </div>

            {location && (
              <div className="mt-2 text-sm text-muted-foreground">
                📍 {location}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}