// src/components/beneficiaries/BeneficiaryProgress.tsx
"use client";

import { 
  Target, TrendingUp, TrendingDown, Calendar,
  CheckCircle2, Clock, AlertCircle, Award,
  BarChart3, Activity, Users, BookOpen,
  Star, Heart, Brain, Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { cn } from "@/lib/utils";

export interface ProgressStage {
  id: string;
  label: string;
  status: "complete" | "in_progress" | "pending" | "blocked";
  date?: string;
  description?: string;
  score?: number;
}

export interface ProgressMetric {
  label: string;
  value: number;
  target: number;
  unit?: string;
  icon?: any;
  color?: string;
}

export interface BeneficiaryProgressProps {
  // Progression globale
  globalProgress: number;
  previousProgress?: number;
  // Étapes de progression
  stages: ProgressStage[];
  // Métriques par catégorie
  metrics: {
    techniques: ProgressMetric[];
    comportementales: ProgressMetric[];
    entrepreneuriales: ProgressMetric[];
  };
  // Compétences
  competences: {
    label: string;
    value: number;
    target: number;
    level: "debutant" | "intermediaire" | "avance" | "expert";
  }[];
  // Activités récentes
  recentActivities?: Array<{
    id: string;
    label: string;
    date: string;
    status: "complete" | "in_progress" | "pending";
  }>;
  // Prédictions IA
  aiPredictions?: {
    completionDate?: string;
    successProbability: number;
    riskFactors?: string[];
  };
  className?: string;
}

const statusColors = {
  complete: "bg-green-500",
  in_progress: "bg-yellow-500",
  pending: "bg-gray-300",
  blocked: "bg-red-500",
};

const statusIcons = {
  complete: CheckCircle2,
  in_progress: Clock,
  pending: Calendar,
  blocked: AlertCircle,
};

const levelColors = {
  debutant: "bg-blue-100 text-blue-700",
  intermediaire: "bg-yellow-100 text-yellow-700",
  avance: "bg-green-100 text-green-700",
  expert: "bg-purple-100 text-purple-700",
};

const levelLabels = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  avance: "Avancé",
  expert: "Expert",
};

export function BeneficiaryProgress({
  globalProgress,
  previousProgress = 0,
  stages,
  metrics,
  competences,
  recentActivities = [],
  aiPredictions,
  className,
}: BeneficiaryProgressProps) {
  const progressChange = globalProgress - previousProgress;
  const isImproving = progressChange >= 0;

  const allMetrics = [
    ...metrics.techniques,
    ...metrics.comportementales,
    ...metrics.entrepreneuriales,
  ];

  const averageMetricProgress = allMetrics.length > 0
    ? allMetrics.reduce((acc, m) => acc + (m.value / m.target) * 100, 0) / allMetrics.length
    : 0;

  const completedStages = stages.filter(s => s.status === "complete").length;
  const totalStages = stages.length;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Progression du bénéficiaire
          </h3>
          <p className="text-sm text-muted-foreground">
            Suivi de l'avancement et des compétences acquises
          </p>
        </div>
        <Badge variant="outline" className={cn(
          "gap-1",
          isImproving ? "text-green-600" : "text-red-600"
        )}>
          {isImproving ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {isImproving ? "+" : ""}{progressChange}%
        </Badge>
      </div>

      {/* Progression globale */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm text-muted-foreground">Progression globale</p>
              <p className="text-3xl font-bold">{globalProgress}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Étapes</p>
              <p className="text-lg font-medium">
                {completedStages}/{totalStages}
              </p>
            </div>
          </div>
          <Progress value={globalProgress} className="h-3" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Début</span>
            <span>{completedStages} étapes complétées</span>
            <span>Objectif</span>
          </div>
        </CardContent>
      </Card>

      {/* Étapes de progression */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Étapes de progression
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline */}
            <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-muted" />
            
            <div className="space-y-4">
              {stages.map((stage, index) => {
                const StatusIcon = statusIcons[stage.status];
                const isLast = index === stages.length - 1;
                
                return (
                  <div key={stage.id} className="relative pl-8">
                    {/* Point sur la timeline */}
                    <div className={cn(
                      "absolute left-2 -translate-x-1/2 w-3 h-3 rounded-full border-2 bg-background",
                      stage.status === "complete" && "border-green-500 bg-green-500",
                      stage.status === "in_progress" && "border-yellow-500 bg-yellow-500 animate-pulse",
                      stage.status === "pending" && "border-gray-300",
                      stage.status === "blocked" && "border-red-500 bg-red-500"
                    )} />
                    
                    <div className={cn(
                      "p-3 rounded-lg bg-muted/30",
                      stage.status === "complete" && "bg-green-50/30 dark:bg-green-950/10",
                      stage.status === "blocked" && "bg-red-50/30 dark:bg-red-950/10"
                    )}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">{stage.label}</p>
                            <Badge variant="outline" className={cn(
                              "text-[10px]",
                              stage.status === "complete" && "bg-green-100 text-green-700",
                              stage.status === "in_progress" && "bg-yellow-100 text-yellow-700",
                              stage.status === "pending" && "bg-gray-100 text-gray-700",
                              stage.status === "blocked" && "bg-red-100 text-red-700"
                            )}>
                              <StatusIcon className="h-2 w-2 mr-1" />
                              {stage.status === "complete" ? "Terminé" :
                               stage.status === "in_progress" ? "En cours" :
                               stage.status === "blocked" ? "Bloqué" : "En attente"}
                            </Badge>
                          </div>
                          {stage.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {stage.description}
                            </p>
                          )}
                        </div>
                        {stage.date && (
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {new Date(stage.date).toLocaleDateString("fr-FR")}
                          </span>
                        )}
                      </div>
                      {stage.score !== undefined && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Score</span>
                            <span>{stage.score}%</span>
                          </div>
                          <Progress value={stage.score} className="h-1" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métriques par catégorie */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCategoryCard
          title="Compétences techniques"
          icon={<Brain className="h-4 w-4 text-blue-500" />}
          metrics={metrics.techniques}
        />
        <MetricCategoryCard
          title="Compétences comportementales"
          icon={<Heart className="h-4 w-4 text-red-500" />}
          metrics={metrics.comportementales}
        />
        <MetricCategoryCard
          title="Compétences entrepreneuriales"
          icon={<Zap className="h-4 w-4 text-yellow-500" />}
          metrics={metrics.entrepreneuriales}
        />
      </div>

      {/* Compétences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Compétences acquises
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {competences.map((comp, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{comp.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{comp.value}%</span>
                    <Badge variant="outline" className={levelColors[comp.level]}>
                      {levelLabels[comp.level]}
                    </Badge>
                  </div>
                </div>
                <Progress value={comp.value} className="h-1.5" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activités récentes */}
      {recentActivities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activités récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    {activity.status === "complete" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : activity.status === "in_progress" ? (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <Calendar className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="text-sm">{activity.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(activity.date).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prédictions IA */}
      {aiPredictions && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Prédictions IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Probabilité de réussite</p>
                <p className="text-2xl font-bold text-primary">
                  {aiPredictions.successProbability}%
                </p>
                <div className="mt-2">
                  <Progress value={aiPredictions.successProbability} className="h-2" />
                </div>
              </div>
              {aiPredictions.completionDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Date de fin prévue</p>
                  <p className="text-lg font-medium">
                    {new Date(aiPredictions.completionDate).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              )}
            </div>
            {aiPredictions.riskFactors && aiPredictions.riskFactors.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <p className="text-sm font-medium text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Facteurs de risque
                </p>
                <ul className="mt-1 space-y-1">
                  {aiPredictions.riskFactors.map((risk, index) => (
                    <li key={index} className="text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                      <span className="text-red-400">•</span>
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Composant auxiliaire pour les métriques par catégorie
function MetricCategoryCard({
  title,
  icon,
  metrics,
}: {
  title: string;
  icon: React.ReactNode;
  metrics: ProgressMetric[];
}) {
  const average = metrics.length > 0
    ? metrics.reduce((acc, m) => acc + (m.value / m.target) * 100, 0) / metrics.length
    : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            const percentage = Math.round((metric.value / metric.target) * 100);
            
            return (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1">
                    {Icon && <Icon className="h-3 w-3 text-muted-foreground" />}
                    {metric.label}
                  </span>
                  <span className="font-medium">
                    {metric.value}/{metric.target}
                    {metric.unit && ` ${metric.unit}`}
                  </span>
                </div>
                <Progress value={percentage} className="h-1.5" />
              </div>
            );
          })}
          {metrics.length > 0 && (
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Moyenne</span>
                <span className="font-medium">{Math.round(average)}%</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}