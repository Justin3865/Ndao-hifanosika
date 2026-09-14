// src/components/members/MemberCard.tsx
"use client";

import Link from "next/link";
import { Mail, Building2, Briefcase, Calendar, Eye, Edit, Trash2, CheckCircle2, Clock, AlertCircle, Award, BookOpen, Target, GraduationCap, Users, BarChart3, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { cn } from "@/lib/utils";

export interface MemberCardProps {
  id: string;
  name: string;
  email: string;
  position: string;
  department: string;
  departmentId: string;
  status: "actif" | "inactif" | "en_conge";
  type: "salarie" | "stagiaire" | "benevole";
  joinDate: string;
  evaluations: number;
  // Nouveaux champs pour le cahier des charges
  phone?: string;
  skills?: string[];
  objectives?: string[];
  performance?: number;
  performanceTrend?: "up" | "down" | "stable";
  aiPerformanceScore?: number;
  aiRiskScore?: number;
  // Pour les stagiaires
  internshipLevel?: "L3" | "M2";
  tutor?: string;
  establishment?: string;
  internshipSubject?: string;
  finalGrade?: number;
  // Métriques
  projectsCount?: number;
  activitiesCount?: number;
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  className?: string;
  showActions?: boolean;
  variant?: "default" | "compact";
}

const statusColors = {
  actif: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  inactif: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  en_conge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
};

const statusLabels = {
  actif: "Actif",
  inactif: "Inactif",
  en_conge: "En congé",
};

const statusIcons = {
  actif: CheckCircle2,
  inactif: AlertCircle,
  en_conge: Clock,
};

const typeLabels = {
  salarie: "Salarié",
  stagiaire: "Stagiaire",
  benevole: "Bénévole",
};

const typeColors = {
  salarie: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  stagiaire: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  benevole: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
};

const typeIcons = {
  salarie: Briefcase,
  stagiaire: GraduationCap,
  benevole: Users,
};

export function MemberCard({
  id,
  name,
  email,
  position,
  department,
  departmentId,
  status,
  type,
  joinDate,
  evaluations,
  phone,
  skills = [],
  objectives = [],
  performance = 0,
  performanceTrend = "stable",
  aiPerformanceScore,
  aiRiskScore,
  internshipLevel,
  tutor,
  establishment,
  internshipSubject,
  finalGrade,
  projectsCount = 0,
  activitiesCount = 0,
  onEdit,
  onDelete,
  onView,
  className,
  showActions = true,
  variant = "default",
}: MemberCardProps) {
  const StatusIcon = statusIcons[status];
  const TypeIcon = typeIcons[type];
  const isStagiaire = type === "stagiaire";
  const isHighRisk = aiRiskScore && aiRiskScore > 70;
  const isTopPerformer = aiPerformanceScore && aiPerformanceScore > 80;

  const trendColors = {
    up: "text-green-600",
    down: "text-red-600",
    stable: "text-yellow-600",
  };

  const trendIcons = {
    up: <span className="text-green-600">↑</span>,
    down: <span className="text-red-600">↓</span>,
    stable: <span className="text-yellow-600">→</span>,
  };

  return (
    <Card className={cn(
      "hover:shadow-lg transition-all group border",
      isHighRisk && "border-red-300 dark:border-red-800",
      isTopPerformer && "border-green-300 dark:border-green-800",
      variant === "compact" && "p-3",
      className
    )}>
      <CardHeader className={cn(
        "flex flex-row items-start justify-between",
        variant === "compact" && "p-3"
      )}>
        <div className="flex items-start gap-3">
          <div className={cn(
            "rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0",
            variant === "compact" ? "w-10 h-10 text-sm" : "w-14 h-14 text-xl",
            isHighRisk ? "bg-red-500" : isTopPerformer ? "bg-green-500" : "bg-primary"
          )}>
            {name.split(" ").map(n => n[0]).join("")}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className={cn(
                "hover:text-primary transition-colors",
                variant === "compact" ? "text-base" : "text-lg"
              )}>
                <Link href={`/members/${id}`}>{name}</Link>
              </CardTitle>
              <Badge variant="outline" className={statusColors[status]}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusLabels[status]}
              </Badge>
              <Badge variant="outline" className={typeColors[type]}>
                <TypeIcon className="h-3 w-3 mr-1" />
                {typeLabels[type]}
              </Badge>
              {isHighRisk && (
                <Badge variant="destructive" className="animate-pulse">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Risque élevé
                </Badge>
              )}
              {isTopPerformer && (
                <Badge variant="outline" className="bg-green-100 text-green-700">
                  <Award className="h-3 w-3 mr-1" />
                  Top performer
                </Badge>
              )}
              {internshipLevel && (
                <Badge variant="outline" className="bg-indigo-100 text-indigo-700">
                  {internshipLevel}
                </Badge>
              )}
            </div>
            {variant !== "compact" && (
              <CardDescription className="mt-1 flex items-center gap-2">
                <span>{position}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{department}</span>
              </CardDescription>
            )}
          </div>
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
          variant === "compact" ? "grid-cols-1 text-xs" : "grid-cols-2 md:grid-cols-4 text-sm"
        )}>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className={cn(variant === "compact" ? "h-3 w-3" : "h-4 w-4")} />
            <span className="truncate">{email}</span>
          </div>
          {phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className={cn(variant === "compact" ? "h-3 w-3" : "h-4 w-4")} />
              <span className="truncate">{phone}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className={cn(variant === "compact" ? "h-3 w-3" : "h-4 w-4")} />
            <Link
              href={`/departements/${departmentId}`}
              className="hover:text-primary transition-colors truncate"
            >
              {department}
            </Link>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className={cn(variant === "compact" ? "h-3 w-3" : "h-4 w-4")} />
            <span>Depuis {new Date(joinDate).toLocaleDateString("fr-FR")}</span>
          </div>
        </div>

        {/* Performance Section */}
        {variant !== "compact" && performance > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="flex items-center gap-1">
                <Award className="h-3 w-3" />
                Performance
              </span>
              <span className="flex items-center gap-2">
                {trendIcons[performanceTrend]}
                <span className="font-medium">{performance}%</span>
              </span>
            </div>
            <Progress value={performance} className="h-1.5" />
          </div>
        )}

        {/* Stats */}
        {variant !== "compact" && (
          <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="text-lg font-semibold text-primary">{evaluations}</p>
              <p className="text-xs text-muted-foreground">Évaluations</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-primary">{projectsCount}</p>
              <p className="text-xs text-muted-foreground">Projets</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-primary">{activitiesCount}</p>
              <p className="text-xs text-muted-foreground">Activités</p>
            </div>
          </div>
        )}

        {/* Stagiaire specific info */}
        {isStagiaire && variant !== "compact" && (
          <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
            <h4 className="text-xs font-medium text-purple-700 dark:text-purple-300 flex items-center gap-2">
              <GraduationCap className="h-3 w-3" />
              Détails du stage
            </h4>
            <div className="grid grid-cols-2 gap-1 mt-1 text-xs">
              {tutor && (
                <div>
                  <span className="text-muted-foreground">Tuteur:</span>
                  <span className="ml-1 font-medium">{tutor}</span>
                </div>
              )}
              {establishment && (
                <div>
                  <span className="text-muted-foreground">Établissement:</span>
                  <span className="ml-1 font-medium">{establishment}</span>
                </div>
              )}
              {internshipSubject && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Sujet:</span>
                  <span className="ml-1 font-medium">{internshipSubject}</span>
                </div>
              )}
              {finalGrade !== undefined && (
                <div>
                  <span className="text-muted-foreground">Note finale:</span>
                  <span className="ml-1 font-medium text-purple-700">{finalGrade}/20</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Skills */}
        {variant !== "compact" && skills.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {skills.slice(0, 3).map((skill, index) => (
              <Badge key={index} variant="outline" className="text-xs bg-muted/30">
                {skill}
              </Badge>
            ))}
            {skills.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{skills.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* IA Insights */}
        {variant !== "compact" && (aiPerformanceScore || aiRiskScore) && (
          <div className="mt-2 flex items-center gap-3 text-xs">
            {aiPerformanceScore && (
              <span className="flex items-center gap-1 text-green-600">
                <BarChart3 className="h-3 w-3" />
                IA: {aiPerformanceScore}%
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
                Risque: {aiRiskScore}%
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}