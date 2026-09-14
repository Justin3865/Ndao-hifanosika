// src/components/beneficiaries/BeneficiaryDetails.tsx
"use client";

import { useState } from "react";
import {
  User, Mail, Phone, Calendar, MapPin, Heart,
  Award, BookOpen, Target, Users, BarChart3,
  AlertTriangle, CheckCircle2, Clock, AlertCircle,
  Edit, Download, Share2, FileText, Activity,
  GraduationCap, Building2, TrendingUp, TrendingDown,
  Star, MessageSquare
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { cn } from "@/lib/utils";

export interface BeneficiaryDetailsProps {
  beneficiary: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    age?: number;
    gender: "homme" | "femme" | "enfant";
    location?: string;
    program: string;
    programId: string;
    status: "actif" | "en_cours" | "termine" | "en_attente" | "abandon";
    joinDate: string;
    vulnérabilité?: string;
    // Progression
    progress: number;
    performance: number;
    performanceTrend: "up" | "down" | "stable";
    // Évaluations
    evaluations: Array<{
      date: string;
      score: number;
      type: string;
      comment?: string;
      evaluator?: string;
    }>;
    objectives: string[];
    skills: string[];
    // Activités
    activities: Array<{
      id: string;
      title: string;
      date: string;
      status: string;
      type: string;
    }>;
    // Projets
    projects: Array<{
      id: string;
      name: string;
      status: string;
      role: string;
    }>;
    // IA
    aiRiskScore?: number;
    aiPerformanceScore?: number;
    aiRecommendations?: string[];
    aiLastUpdated?: string;
    // Famille (pour les enfants)
    parentName?: string;
    parentPhone?: string;
    // Métadonnées
    createdAt: string;
    updatedAt: string;
  };
  onEdit?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  onGenerateReport?: () => void;
  className?: string;
}

export function BeneficiaryDetails({
  beneficiary,
  onEdit,
  onDelete,
  onExport,
  onGenerateReport,
  className,
}: BeneficiaryDetailsProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isGenerating, setIsGenerating] = useState(false);

  const statusConfig = {
    actif: { color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300", icon: CheckCircle2 },
    en_cours: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", icon: Clock },
    termine: { color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300", icon: Award },
    en_attente: { color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300", icon: Clock },
    abandon: { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300", icon: AlertCircle },
  };

  const genderConfig = {
    homme: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", icon: User },
    femme: { color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300", icon: User },
    enfant: { color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300", icon: Heart },
  };

  const StatusIcon = statusConfig[beneficiary.status]?.icon || CheckCircle2;
  const GenderIcon = genderConfig[beneficiary.gender]?.icon || User;
  const isEnfant = beneficiary.gender === "enfant";
  const isHighRisk = beneficiary.aiRiskScore && beneficiary.aiRiskScore > 70;
  const isTopPerformer = beneficiary.aiPerformanceScore && beneficiary.aiPerformanceScore > 80;
  const isVulnerable = beneficiary.vulnérabilité && beneficiary.vulnérabilité.length > 0;
  const averageScore = beneficiary.evaluations.length > 0 
    ? beneficiary.evaluations.reduce((acc, e) => acc + e.score, 0) / beneficiary.evaluations.length 
    : 0;

  const trendColors = {
    up: "text-green-600",
    down: "text-red-600",
    stable: "text-yellow-600",
  };

  const trendIcons = {
    up: TrendingUp,
    down: TrendingDown,
    stable: TrendingUp,
  };

  const TrendIcon = trendIcons[beneficiary.performanceTrend];

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    if (onGenerateReport) {
      await onGenerateReport();
    }
    setIsGenerating(false);
  };

  return (
    <Card className={cn("p-6", className)}>
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="flex items-start gap-4">
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold text-2xl flex-shrink-0",
            isHighRisk ? "bg-red-500" : isTopPerformer ? "bg-green-500" : isVulnerable ? "bg-yellow-500" : "bg-primary"
          )}>
            {beneficiary.name.split(" ").map(n => n[0]).join("")}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <CardTitle className="text-2xl">{beneficiary.name}</CardTitle>
              <Badge className={statusConfig[beneficiary.status]?.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {beneficiary.status}
              </Badge>
              <Badge variant="outline" className={genderConfig[beneficiary.gender]?.color}>
                <GenderIcon className="h-3 w-3 mr-1" />
                {beneficiary.gender}
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
            <p className="text-muted-foreground mt-1">
              {beneficiary.program} • Inscrit le {new Date(beneficiary.joinDate).toLocaleDateString("fr-FR")}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Aperçu</TabsTrigger>
            <TabsTrigger value="evaluations">Évaluations</TabsTrigger>
            <TabsTrigger value="activities">Activités</TabsTrigger>
            <TabsTrigger value="projects">Projets</TabsTrigger>
            {isEnfant && <TabsTrigger value="family">Famille</TabsTrigger>}
            <TabsTrigger value="ai-insights">Insights IA</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Informations de contact */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {beneficiary.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{beneficiary.email}</span>
                </div>
              )}
              {beneficiary.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{beneficiary.phone}</span>
                </div>
              )}
              {beneficiary.age && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{beneficiary.age} ans</span>
                </div>
              )}
              {beneficiary.location && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{beneficiary.location}</span>
                </div>
              )}
            </div>

            {/* Vulnérabilité */}
            {beneficiary.vulnérabilité && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  {beneficiary.vulnérabilité}
                </p>
              </div>
            )}

            {/* Progression et Performance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Progression
                  </span>
                  <span className="font-medium">{beneficiary.progress}%</span>
                </div>
                <Progress value={beneficiary.progress} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Performance
                  </span>
                  <span className="flex items-center gap-2">
                    <TrendIcon className={cn("h-4 w-4", trendColors[beneficiary.performanceTrend])} />
                    <span className="font-medium">{beneficiary.performance}%</span>
                  </span>
                </div>
                <Progress value={beneficiary.performance} className="h-2" />
              </div>
            </div>

            {/* Compétences */}
            {beneficiary.skills.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Compétences acquises
                </h4>
                <div className="flex flex-wrap gap-2">
                  {beneficiary.skills.map((skill, index) => (
                    <Badge key={index} variant="outline" className="bg-primary/10 text-primary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Objectifs */}
            {beneficiary.objectives.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Objectifs
                </h4>
                <div className="flex flex-wrap gap-2">
                  {beneficiary.objectives.map((objective, index) => (
                    <Badge key={index} variant="outline" className="bg-muted/30">
                      {objective}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Métadonnées */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
              <span>Créé le: {new Date(beneficiary.createdAt).toLocaleDateString("fr-FR")}</span>
              <span>Dernière modification: {new Date(beneficiary.updatedAt).toLocaleDateString("fr-FR")}</span>
            </div>
          </TabsContent>

          <TabsContent value="evaluations" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Historique des évaluations</h4>
                <Badge variant="outline" className="bg-primary/10">
                  {beneficiary.evaluations.length} évaluation{beneficiary.evaluations.length > 1 ? 's' : ''}
                </Badge>
              </div>

              {beneficiary.evaluations.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Aucune évaluation disponible</p>
              ) : (
                <div className="space-y-3">
                  {beneficiary.evaluations.map((evaluation, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium">{evaluation.type}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(evaluation.date).toLocaleDateString("fr-FR")}
                          {evaluation.evaluator && ` • Évalué par ${evaluation.evaluator}`}
                        </p>
                        {evaluation.comment && (
                          <p className="text-sm text-muted-foreground mt-1 italic">
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

                  {/* Score moyen */}
                  <div className="p-4 bg-primary/5 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Score moyen</span>
                      <span className="text-lg font-bold text-primary">
                        {averageScore.toFixed(1)}/5
                      </span>
                    </div>
                    <div className="mt-2">
                      <Progress value={(averageScore / 5) * 100} className="h-2" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="activities" className="mt-4">
            <div className="space-y-3">
              {beneficiary.activities.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Aucune activité</p>
              ) : (
                beneficiary.activities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="font-medium">{activity.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(activity.date).toLocaleDateString("fr-FR")} • {activity.type}
                      </p>
                    </div>
                    <Badge variant="outline" className={
                      activity.status === "termine" ? "bg-green-100 text-green-700" :
                      activity.status === "en_cours" ? "bg-yellow-100 text-yellow-700" :
                      "bg-blue-100 text-blue-700"
                    }>
                      {activity.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="projects" className="mt-4">
            <div className="space-y-3">
              {beneficiary.projects.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Aucun projet assigné</p>
              ) : (
                beneficiary.projects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="font-medium">{project.name}</p>
                      <p className="text-sm text-muted-foreground">Rôle: {project.role}</p>
                    </div>
                    <Badge variant="outline" className={
                      project.status === "actif" ? "bg-green-100 text-green-700" :
                      project.status === "termine" ? "bg-blue-100 text-blue-700" :
                      "bg-yellow-100 text-yellow-700"
                    }>
                      {project.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {isEnfant && (
            <TabsContent value="family" className="mt-4">
              <div className="space-y-4">
                <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                  <h4 className="font-medium flex items-center gap-2 mb-3">
                    <Heart className="h-4 w-4 text-orange-600" />
                    Informations parentales / Tutelle
                  </h4>
                  <div className="space-y-2">
                    {beneficiary.parentName && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Parent/Tuteur:</span>
                        <span>{beneficiary.parentName}</span>
                      </div>
                    )}
                    {beneficiary.parentPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Téléphone:</span>
                        <span>{beneficiary.parentPhone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Avertissement protection des données */}
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Données protégées - Accès restreint conformément aux exigences des bailleurs
                  </p>
                </div>
              </div>
            </TabsContent>
          )}

          <TabsContent value="ai-insights" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Insights Intelligence Artificielle</h4>
                <Button
                  size="sm"
                  onClick={handleGenerateReport}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white/20 border-t-white rounded-full mr-2" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Générer le rapport
                    </>
                  )}
                </Button>
              </div>

              {beneficiary.aiPerformanceScore && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-500" />
                    Score de performance: {beneficiary.aiPerformanceScore}%
                  </h4>
                  <div className="mt-2">
                    <Progress value={beneficiary.aiPerformanceScore} className="h-2" />
                  </div>
                </div>
              )}

              {beneficiary.aiRiskScore && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Score de risque d'abandon: {beneficiary.aiRiskScore}%
                  </h4>
                  <div className="mt-2">
                    <Progress value={beneficiary.aiRiskScore} className="h-2" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {beneficiary.aiRiskScore > 70 ? "⚠️ Risque élevé - Une attention particulière est recommandée" :
                     beneficiary.aiRiskScore > 40 ? "⚡ Risque modéré - Surveiller de près" :
                     "✅ Risque faible - Bonne progression"}
                  </p>
                </div>
              )}

              {beneficiary.aiRecommendations && beneficiary.aiRecommendations.length > 0 && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium mb-2">Recommandations</h4>
                  <ul className="space-y-2">
                    {beneficiary.aiRecommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-primary">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {beneficiary.aiLastUpdated && (
                <p className="text-xs text-muted-foreground text-right">
                  Dernière mise à jour: {new Date(beneficiary.aiLastUpdated).toLocaleString("fr-FR")}
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}