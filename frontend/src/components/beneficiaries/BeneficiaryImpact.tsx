// src/components/beneficiaries/BeneficiaryImpact.tsx
"use client";

import { 
  Award, TrendingUp, TrendingDown, Users, 
  Calendar, Target, BarChart3, CheckCircle2,
  Activity, Heart, Briefcase, GraduationCap,
  DollarSign, Building2, Star, Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { cn } from "@/lib/utils";

export interface ImpactMetric {
  label: string;
  value: number | string;
  change?: number;
  icon?: any;
  color?: string;
  description?: string;
}

export interface BeneficiaryImpactProps {
  // Indicateurs d'impact
  insertionProfessionnelle: number; // Taux d'insertion professionnelle
  creationActivite: number; // Taux de création d'activité
  satisfaction: number; // Taux de satisfaction
  revenuMoyen: number; // Revenu moyen généré (en Ar)
  // Suivi post-programme
  suivi3Mois: number;
  suivi6Mois: number;
  suivi12Mois: number;
  // Compétences acquises
  competencesAcquises: number;
  competencesTotales: number;
  // Impact social
  impactSocial?: string;
  temoignages?: string[];
  // Programmes
  programmesReussis: number;
  programmesTotal: number;
  // Métriques additionnelles
  certifications?: number;
  entreprisesCrees?: number;
  emploisCrees?: number;
  // Tendances
  trend?: "up" | "down" | "stable";
  trendPercentage?: number;
  className?: string;
}

export function BeneficiaryImpact({
  insertionProfessionnelle,
  creationActivite,
  satisfaction,
  revenuMoyen,
  suivi3Mois,
  suivi6Mois,
  suivi12Mois,
  competencesAcquises,
  competencesTotales,
  impactSocial,
  temoignages = [],
  programmesReussis,
  programmesTotal,
  certifications = 0,
  entreprisesCrees = 0,
  emploisCrees = 0,
  trend = "up",
  trendPercentage = 0,
  className,
}: BeneficiaryImpactProps) {
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

  const metrics: ImpactMetric[] = [
    {
      label: "Insertion professionnelle",
      value: `${insertionProfessionnelle}%`,
      change: trendPercentage,
      icon: Briefcase,
      color: "bg-blue-500",
      description: "Taux d'insertion professionnelle des bénéficiaires"
    },
    {
      label: "Création d'activité",
      value: `${creationActivite}%`,
      change: trendPercentage - 2,
      icon: Building2,
      color: "bg-green-500",
      description: "Taux de création d'activité/entreprise"
    },
    {
      label: "Satisfaction",
      value: `${satisfaction}%`,
      change: trendPercentage + 1,
      icon: Star,
      color: "bg-yellow-500",
      description: "Taux de satisfaction des bénéficiaires"
    },
    {
      label: "Revenu moyen",
      value: `${revenuMoyen.toLocaleString()} Ar`,
      change: trendPercentage + 3,
      icon: DollarSign,
      color: "bg-purple-500",
      description: "Revenu moyen généré par bénéficiaire"
    }
  ];

  const suiviData = [
    { label: "3 mois", value: suivi3Mois, color: "bg-blue-500" },
    { label: "6 mois", value: suivi6Mois, color: "bg-green-500" },
    { label: "12 mois", value: suivi12Mois, color: "bg-purple-500" },
  ];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Impact et Résultats
          </h3>
          <p className="text-sm text-muted-foreground">
            Mesure de l'impact des programmes sur les bénéficiaires
          </p>
        </div>
        <Badge variant="outline" className={cn("gap-1", trendColors[trend])}>
          <TrendIcon className="h-3 w-3" />
          {trend === "up" ? "En progression" : trend === "down" ? "En baisse" : "Stable"}
          {trendPercentage !== 0 && ` (${trendPercentage > 0 ? "+" : ""}${trendPercentage}%)`}
        </Badge>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          const isPositive = metric.change && metric.change > 0;
          
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
                {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                {metric.change !== undefined && metric.change !== 0 && (
                  <div className={cn(
                    "text-xs flex items-center gap-1",
                    isPositive ? "text-green-600" : "text-red-600"
                  )}>
                    {isPositive ? "↑" : "↓"} {Math.abs(metric.change)}%
                    <span className="text-muted-foreground">vs mois dernier</span>
                  </div>
                )}
                {metric.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {metric.description}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Suivi post-programme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Suivi post-programme
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {suiviData.map((item) => (
              <div key={item.label} className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">À {item.label}</p>
                <p className="text-2xl font-bold mt-1">{item.value}%</p>
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full", item.color)}
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Compétences acquises */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Compétences acquises
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {competencesAcquises}/{competencesTotales}
            </div>
            <div className="mt-2">
              <Progress value={(competencesAcquises / competencesTotales) * 100} className="h-2" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {Math.round((competencesAcquises / competencesTotales) * 100)}% des compétences cibles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4" />
              Programmes réussis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {programmesReussis}/{programmesTotal}
            </div>
            <div className="mt-2">
              <Progress value={(programmesReussis / programmesTotal) * 100} className="h-2" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Taux de réussite des programmes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Impact économique
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {certifications > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Certifications</span>
                  <span className="font-medium">{certifications}</span>
                </div>
              )}
              {entreprisesCrees > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Entreprises créées</span>
                  <span className="font-medium">{entreprisesCrees}</span>
                </div>
              )}
              {emploisCrees > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Emplois créés</span>
                  <span className="font-medium">{emploisCrees}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Impact social et témoignages */}
      {impactSocial && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              Impact social
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{impactSocial}</p>
          </CardContent>
        </Card>
      )}

      {temoignages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Témoignages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {temoignages.map((temoignage, index) => (
                <div key={index} className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm italic text-muted-foreground">
                    "{temoignage}"
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}