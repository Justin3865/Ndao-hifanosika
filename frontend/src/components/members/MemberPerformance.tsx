// src/components/members/MemberPerformance.tsx
"use client";

import { TrendingUp, TrendingDown, Minus, Award, BarChart3, AlertTriangle, Calendar, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { cn } from "@/lib/utils";

export interface Evaluation {
  date: string;
  score: number;
  type: string;
  comment?: string;
  evaluator?: string;
}

export interface MemberPerformanceProps {
  name: string;
  position: string;
  evaluations: Evaluation[];
  className?: string;
  showAverage?: boolean;
  showTrend?: boolean;
  showHistory?: boolean;
  // Nouveaux champs
  aiPerformanceScore?: number;
  aiRiskScore?: number;
  aiRecommendations?: string[];
  objectives?: string[];
  skills?: string[];
  department?: string;
}

const getTrend = (evaluations: Evaluation[]) => {
  if (evaluations.length < 2) return "stable";
  const last = evaluations[evaluations.length - 1].score;
  const prev = evaluations[evaluations.length - 2].score;
  if (last > prev) return "up";
  if (last < prev) return "down";
  return "stable";
};

const getAverageScore = (evaluations: Evaluation[]) => {
  if (evaluations.length === 0) return 0;
  return evaluations.reduce((acc, e) => acc + e.score, 0) / evaluations.length;
};

export function MemberPerformance({
  name,
  position,
  evaluations,
  className,
  showAverage = true,
  showTrend = true,
  showHistory = true,
  aiPerformanceScore,
  aiRiskScore,
  aiRecommendations = [],
  objectives = [],
  skills = [],
  department,
}: MemberPerformanceProps) {
  const average = getAverageScore(evaluations);
  const trend = getTrend(evaluations);
  const isHighRisk = aiRiskScore && aiRiskScore > 70;
  const isTopPerformer = aiPerformanceScore && aiPerformanceScore > 80;

  const trendColors = {
    up: "text-green-600",
    down: "text-red-600",
    stable: "text-yellow-600",
  };

  const trendIcons = {
    up: TrendingUp,
    down: TrendingDown,
    stable: Minus,
  };

  const TrendIcon = trendIcons[trend];

  return (
    <Card className={cn(
      className,
      isHighRisk && "border-red-300 dark:border-red-800",
      isTopPerformer && "border-green-300 dark:border-green-800"
    )}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span>Performance</span>
            {isTopPerformer && (
              <Badge variant="outline" className="bg-green-100 text-green-700">
                <Award className="h-3 w-3 mr-1" />
                Top performer
              </Badge>
            )}
            {isHighRisk && (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Risque élevé
              </Badge>
            )}
          </div>
          {showAverage && (
            <span className="text-lg font-bold text-primary flex items-center gap-2">
              <Award className="h-5 w-5" />
              {average.toFixed(1)}/5
            </span>
          )}
        </CardTitle>
        <div className="flex items-center gap-3 text-sm flex-wrap">
          <span className="font-medium">{name}</span>
          <span className="text-muted-foreground">{position}</span>
          {department && (
            <span className="text-muted-foreground">• {department}</span>
          )}
          {showTrend && evaluations.length >= 2 && (
            <Badge variant="outline" className={cn("gap-1", trendColors[trend])}>
              <TrendIcon className="h-3 w-3" />
              {trend === "up" ? "En progression" : trend === "down" ? "En baisse" : "Stable"}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* IA Scores */}
        {(aiPerformanceScore || aiRiskScore) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {aiPerformanceScore && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    Score IA Performance
                  </span>
                  <span className="font-medium text-green-600">{aiPerformanceScore}%</span>
                </div>
                <Progress value={aiPerformanceScore} className="h-1.5" />
              </div>
            )}
            {aiRiskScore && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Score IA Risque
                  </span>
                  <span className={cn(
                    "font-medium",
                    aiRiskScore > 70 ? "text-red-600" :
                    aiRiskScore > 40 ? "text-yellow-600" :
                    "text-green-600"
                  )}>{aiRiskScore}%</span>
                </div>
                <Progress value={aiRiskScore} className="h-1.5" />
              </div>
            )}
          </div>
        )}

        {/* AI Recommendations */}
        {aiRecommendations.length > 0 && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              Recommandations IA
            </h4>
            <ul className="space-y-1">
              {aiRecommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-blue-500">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Objectifs */}
        {objectives.length > 0 && (
          <div>
            <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
              <Target className="h-4 w-4" />
              Objectifs
            </h4>
            <div className="flex flex-wrap gap-2">
              {objectives.map((objective, index) => (
                <Badge key={index} variant="outline" className="bg-muted/30">
                  {objective}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div>
            <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
              <Award className="h-4 w-4" />
              Compétences
            </h4>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, index) => (
                <Badge key={index} variant="outline" className="bg-primary/10 text-primary">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Evaluations */}
        {evaluations.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">Aucune évaluation disponible</p>
          </div>
        ) : (
          <div>
            {showHistory && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Historique des évaluations
                </h4>
                {evaluations.map((evaluation, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">{evaluation.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(evaluation.date).toLocaleDateString("fr-FR")}
                        {evaluation.evaluator && ` • Évalué par ${evaluation.evaluator}`}
                      </p>
                      {evaluation.comment && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          "{evaluation.comment}"
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            evaluation.score >= 4 ? "bg-green-500" :
                            evaluation.score >= 3 ? "bg-yellow-500" :
                            "bg-red-500"
                          )}
                          style={{ width: `${(evaluation.score / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium min-w-[32px]">
                        {evaluation.score.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!showHistory && (
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Score moyen</span>
                    <span className="font-medium">{average.toFixed(1)}/5</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(average / 5) * 100}%` }}
                    />
                  </div>
                </div>
                {showTrend && evaluations.length >= 2 && (
                  <div className={cn("flex items-center gap-1 text-sm font-medium", trendColors[trend])}>
                    <TrendIcon className="h-4 w-4" />
                    {trend === "up" ? "+" : trend === "down" ? "-" : ""}
                    {(Math.abs(evaluations[evaluations.length - 1].score - evaluations[evaluations.length - 2].score)).toFixed(1)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}