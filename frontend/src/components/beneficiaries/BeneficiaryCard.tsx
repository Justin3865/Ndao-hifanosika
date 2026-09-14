// src/components/beneficiaries/BeneficiaryCard.tsx
"use client";

import Link from "next/link";
import { 
  User, Mail, Phone, Calendar, Eye, Edit, Trash2, 
  CheckCircle2, Clock, AlertCircle, Award, BookOpen, 
  Target, Users, BarChart3, AlertTriangle, MapPin,
  Heart, GraduationCap, Building2, TrendingUp, TrendingDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { cn } from "@/lib/utils";

export interface BeneficiaryCardProps {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  program: string;
  programId: string;
  status: "actif" | "en_cours" | "termine" | "en_attente" | "abandon";
  gender: "homme" | "femme" | "enfant";
  joinDate: string;
  progress: number;
  // Nouveaux champs
  age?: number;
  location?: string;
  vulnérabilité?: string;
  evaluations: number;
  activitiesCount: number;
  // Performance
  performance?: number;
  performanceTrend?: "up" | "down" | "stable";
  // IA
  aiRiskScore?: number;
  aiPerformanceScore?: number;
  // Projets
  projectsCount?: number;
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  className?: string;
  showActions?: boolean;
  variant?: "default" | "compact";
}

const statusColors = {
  actif: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  en_cours: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  termine: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  en_attente: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  abandon: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const statusLabels = {
  actif: "Actif",
  en_cours: "En cours",
  termine: "Terminé",
  en_attente: "En attente",
  abandon: "Abandon",
};

const statusIcons = {
  actif: CheckCircle2,
  en_cours: Clock,
  termine: Award,
  en_attente: Clock,
  abandon: AlertCircle,
};

const genderLabels = {
  homme: "Homme",
  femme: "Femme",
  enfant: "Enfant",
};

const genderColors = {
  homme: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  femme: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  enfant: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
};

const genderIcons = {
  homme: User,
  femme: User,
  enfant: GraduationCap,
};

export function BeneficiaryCard({
  id,
  name,
  email,
  phone,
  program,
  programId,
  status,
  gender,
  joinDate,
  progress,
  age,
  location,
  vulnérabilité,
  evaluations,
  activitiesCount,
  performance = 0,
  performanceTrend = "stable",
  aiRiskScore,
  aiPerformanceScore,
  projectsCount = 0,
  onEdit,
  onDelete,
  onView,
  className,
  showActions = true,
  variant = "default",
}: BeneficiaryCardProps) {
  const StatusIcon = statusIcons[status];
  const GenderIcon = genderIcons[gender];
  const isHighRisk = aiRiskScore && aiRiskScore > 70;
  const isTopPerformer = aiPerformanceScore && aiPerformanceScore > 80;
  const isVulnerable = vulnérabilité && vulnérabilité.length > 0;

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
      isVulnerable && "border-yellow-300 dark:border-yellow-800",
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
                <Link href={`/beneficiaries/${id}`}>{name}</Link>
              </CardTitle>
              <Badge variant="outline" className={statusColors[status]}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusLabels[status]}
              </Badge>
              <Badge variant="outline" className={genderColors[gender]}>
                <GenderIcon className="h-3 w-3 mr-1" />
                {genderLabels[gender]}
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
              {isVulnerable && (
                <Badge variant="outline" className="bg-yellow-100 text-yellow-700">
                  <Heart className="h-3 w-3 mr-1" />
                  Vulnérable
                </Badge>
              )}
            </div>
            {variant !== "compact" && (
              <CardDescription className="mt-1 flex items-center gap-2">
                <span>{program}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">
                  {new Date(joinDate).toLocaleDateString("fr-FR")}
                </span>
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
          {email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className={cn(variant === "compact" ? "h-3 w-3" : "h-4 w-4")} />
              <span className="truncate">{email}</span>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className={cn(variant === "compact" ? "h-3 w-3" : "h-4 w-4")} />
              <span className="truncate">{phone}</span>
            </div>
          )}
          {age && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className={cn(variant === "compact" ? "h-3 w-3" : "h-4 w-4")} />
              <span>{age} ans</span>
            </div>
          )}
          {location && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className={cn(variant === "compact" ? "h-3 w-3" : "h-4 w-4")} />
              <span className="truncate">{location}</span>
            </div>
          )}
        </div>

        {/* Progression */}
        {variant !== "compact" && progress > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                Progression
              </span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        {/* Performance */}
        {variant !== "compact" && performance > 0 && (
          <div className="mt-2">
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
              <p className="text-lg font-semibold text-primary">{activitiesCount}</p>
              <p className="text-xs text-muted-foreground">Activités</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-primary">{projectsCount}</p>
              <p className="text-xs text-muted-foreground">Projets</p>
            </div>
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

        {/* Vulnérabilité */}
        {isVulnerable && variant !== "compact" && (
          <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
            <p className="text-xs text-yellow-700 dark:text-yellow-300 flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {vulnérabilité}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}