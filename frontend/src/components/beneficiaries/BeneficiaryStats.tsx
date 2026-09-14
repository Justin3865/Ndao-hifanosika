// src/components/beneficiaries/BeneficiaryStats.tsx
"use client";

import { 
  Users, User, Heart, Calendar, Award, 
  TrendingUp, TrendingDown, Target, BarChart3,
  CheckCircle2, AlertCircle, Clock, Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export interface BeneficiaryStatsProps {
  total: number;
  actif: number;
  en_cours: number;
  termine: number;
  en_attente: number;
  abandon: number;
  // Statistiques par genre
  hommes: number;
  femmes: number;
  enfants: number;
  // Progression
  progressionMoyenne: number;
  performanceMoyenne: number;
  // Taux de réussite
  tauxReussite: number;
  tauxAbandon: number;
  // IA
  aiRiskScores?: {
    eleve: number;
    modere: number;
    faible: number;
  };
  // Tendances
  trend?: "up" | "down" | "stable";
  trendPercentage?: number;
  className?: string;
}

const statColors = {
  actif: "bg-green-500",
  en_cours: "bg-blue-500",
  termine: "bg-purple-500",
  en_attente: "bg-yellow-500",
  abandon: "bg-red-500",
};

export function BeneficiaryStats({
  total,
  actif,
  en_cours,
  termine,
  en_attente,
  abandon,
  hommes,
  femmes,
  enfants,
  progressionMoyenne,
  performanceMoyenne,
  tauxReussite,
  tauxAbandon,
  aiRiskScores,
  trend = "stable",
  trendPercentage = 0,
  className,
}: BeneficiaryStatsProps) {
  const trendColors = {
    up: "text-green-600",
    down: "text-red-600",
    stable: "text-yellow-600",
  };

  const trendIcons = {
    up: TrendingUp,
    down: TrendingDown,
    stable: Activity,
  };

  const TrendIcon = trendIcons[trend];
  const isPositive = trend === "up" || (trend === "stable" && trendPercentage >= 0);

  const statusData = [
    { label: "Actifs", value: actif, color: statColors.actif, icon: CheckCircle2 },
    { label: "En cours", value: en_cours, color: statColors.en_cours, icon: Clock },
    { label: "Terminés", value: termine, color: statColors.termine, icon: Award },
    { label: "En attente", value: en_attente, color: statColors.en_attente, icon: Clock },
    { label: "Abandons", value: abandon, color: statColors.abandon, icon: AlertCircle },
  ];

  const genderData = [
    { label: "Hommes", value: hommes, color: "bg-blue-500", icon: User },
    { label: "Femmes", value: femmes, color: "bg-pink-500", icon: User },
    { label: "Enfants", value: enfants, color: "bg-orange-500", icon: Heart },
  ];

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {/* Total */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total bénéficiaires</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{total}</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={cn("flex items-center gap-1", trendColors[trend])}>
              <TrendIcon className="h-3 w-3" />
              {isPositive ? "+" : ""}{trendPercentage}%
            </span>
            <span>par rapport au mois dernier</span>
          </div>
        </CardContent>
      </Card>

      {/* Progression moyenne */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Progression moyenne</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{progressionMoyenne}%</div>
          <div className="mt-2">
            <Progress value={progressionMoyenne} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Taux de réussite */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Taux de réussite</CardTitle>
          <Award className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{tauxReussite}%</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="text-red-600">Taux d'abandon: {tauxAbandon}%</span>
          </div>
          <div className="mt-2 flex gap-1">
            <div className="h-2 flex-1 bg-green-500 rounded-l-full" style={{ width: `${tauxReussite}%` }} />
            <div className="h-2 flex-1 bg-red-500 rounded-r-full" style={{ width: `${tauxAbandon}%` }} />
          </div>
        </CardContent>
      </Card>

      {/* Performance moyenne */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Performance moyenne</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{performanceMoyenne}%</div>
          <div className="mt-2">
            <Progress value={performanceMoyenne} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Répartition par statut */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Répartition par statut</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {statusData.map((item) => (
              <div key={item.label} className="text-center p-2 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <item.icon className="h-3 w-3" />
                  {item.label}
                </div>
                <p className="text-lg font-bold mt-1">{item.value}</p>
                <div className="mt-1 h-1 rounded-full bg-muted">
                  <div 
                    className={cn("h-full rounded-full", item.color)}
                    style={{ width: `${(item.value / total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Répartition par genre */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Répartition par genre</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {genderData.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm flex-1">{item.label}</span>
                <span className="text-sm font-medium">{item.value}</span>
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full", item.color)}
                    style={{ width: `${(item.value / total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* IA Risk Scores */}
      {aiRiskScores && (
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Risque IA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-red-600">Élevé</span>
                <span className="font-medium">{aiRiskScores.eleve}</span>
              </div>
              <Progress value={(aiRiskScores.eleve / total) * 100} className="h-1.5 bg-red-100" indicatorClassName="bg-red-500" />
              
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-yellow-600">Modéré</span>
                <span className="font-medium">{aiRiskScores.modere}</span>
              </div>
              <Progress value={(aiRiskScores.modere / total) * 100} className="h-1.5 bg-yellow-100" indicatorClassName="bg-yellow-500" />
              
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-green-600">Faible</span>
                <span className="font-medium">{aiRiskScores.faible}</span>
              </div>
              <Progress value={(aiRiskScores.faible / total) * 100} className="h-1.5 bg-green-100" indicatorClassName="bg-green-500" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}