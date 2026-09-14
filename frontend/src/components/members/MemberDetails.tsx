// src/components/members/MemberDetails.tsx
"use client";

import { useState } from "react";
import {
  User, Mail, Phone, Building2, Briefcase, Calendar, 
  Award, BookOpen, Target, GraduationCap, Users,
  BarChart3, AlertTriangle, CheckCircle2, Clock,
  AlertCircle, Edit, Download, Share2, FileText,
  Activity, MapPin, Star, TrendingUp, TrendingDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { cn } from "@/lib/utils";

export interface MemberDetailsProps {
  member: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    position: string;
    department: string;
    departmentId: string;
    status: "actif" | "inactif" | "en_conge";
    type: "salarie" | "stagiaire" | "benevole";
    joinDate: string;
    evaluations: Array<{
      date: string;
      score: number;
      type: string;
      comment?: string;
      evaluator?: string;
    }>;
    skills: string[];
    objectives: string[];
    // Pour les stagiaires
    internship?: {
      level: "L3" | "M2";
      tutor: string;
      establishment: string;
      subject: string;
      startDate: string;
      endDate: string;
      finalGrade?: number;
      evaluationGrid?: string;
      reportSubmitted?: boolean;
      defenseDate?: string;
    };
    // Projets
    projects: Array<{
      id: string;
      name: string;
      role: string;
      status: string;
    }>;
    // IA
    aiPerformanceScore?: number;
    aiRiskScore?: number;
    aiRecommendations?: string[];
    aiLastUpdated?: string;
    // Métriques
    performance: number;
    performanceTrend: "up" | "down" | "stable";
    createdAt: string;
    updatedAt: string;
  };
  onEdit?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  onGenerateReport?: () => void;
  className?: string;
}

export function MemberDetails({
  member,
  onEdit,
  onDelete,
  onExport,
  onGenerateReport,
  className,
}: MemberDetailsProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isGenerating, setIsGenerating] = useState(false);

  const statusConfig = {
    actif: { color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300", icon: CheckCircle2 },
    inactif: { color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300", icon: AlertCircle },
    en_conge: { color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300", icon: Clock },
  };

  const typeConfig = {
    salarie: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", icon: Briefcase },
    stagiaire: { color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300", icon: GraduationCap },
    benevole: { color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300", icon: Users },
  };

  const StatusIcon = statusConfig[member.status]?.icon || CheckCircle2;
  const TypeIcon = typeConfig[member.type]?.icon || Users;
  const isStagiaire = member.type === "stagiaire";
  const isHighRisk = member.aiRiskScore && member.aiRiskScore > 70;
  const isTopPerformer = member.aiPerformanceScore && member.aiPerformanceScore > 80;
  const averageScore = member.evaluations.length > 0 
    ? member.evaluations.reduce((acc, e) => acc + e.score, 0) / member.evaluations.length 
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

  const TrendIcon = trendIcons[member.performanceTrend];

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
            isHighRisk ? "bg-red-500" : isTopPerformer ? "bg-green-500" : "bg-primary"
          )}>
            {member.name.split(" ").map(n => n[0]).join("")}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <CardTitle className="text-2xl">{member.name}</CardTitle>
              <Badge className={statusConfig[member.status]?.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {member.status}
              </Badge>
              <Badge variant="outline" className={typeConfig[member.type]?.color}>
                <TypeIcon className="h-3 w-3 mr-1" />
                {member.type}
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
              {isStagiaire && member.internship?.level && (
                <Badge variant="outline" className="bg-purple-100 text-purple-700">
                  <GraduationCap className="h-3 w-3 mr-1" />
                  {member.internship.level}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {member.position} • {member.department}
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Aperçu</TabsTrigger>
            <TabsTrigger value="evaluations">Évaluations</TabsTrigger>
            {isStagiaire && <TabsTrigger value="internship">Stage</TabsTrigger>}
            <TabsTrigger value="projects">Projets</TabsTrigger>
            <TabsTrigger value="ai-insights">Insights IA</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Informations de contact */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{member.email}</span>
              </div>
              {member.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{member.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Depuis {new Date(member.joinDate).toLocaleDateString("fr-FR")}</span>
              </div>
            </div>

            {/* Performance */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Performance globale
                </span>
                <span className="flex items-center gap-2">
                  <TrendIcon className={cn("h-4 w-4", trendColors[member.performanceTrend])} />
                  <span className="font-medium">{member.performance}%</span>
                </span>
              </div>
              <Progress value={member.performance} className="h-2" />
            </div>

            {/* Compétences */}
            {member.skills.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Compétences
                </h4>
                <div className="flex flex-wrap gap-2">
                  {member.skills.map((skill, index) => (
                    <Badge key={index} variant="outline" className="bg-primary/10 text-primary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Objectifs */}
            {member.objectives.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Objectifs
                </h4>
                <div className="flex flex-wrap gap-2">
                  {member.objectives.map((objective, index) => (
                    <Badge key={index} variant="outline" className="bg-muted/30">
                      {objective}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Métadonnées */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
              <span>Créé le: {new Date(member.createdAt).toLocaleDateString("fr-FR")}</span>
              <span>Dernière modification: {new Date(member.updatedAt).toLocaleDateString("fr-FR")}</span>
            </div>
          </TabsContent>

          <TabsContent value="evaluations" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Historique des évaluations</h4>
                <Badge variant="outline" className="bg-primary/10">
                  {member.evaluations.length} évaluation{member.evaluations.length > 1 ? 's' : ''}
                </Badge>
              </div>

              {member.evaluations.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Aucune évaluation disponible</p>
              ) : (
                <div className="space-y-3">
                  {member.evaluations.map((evaluation, index) => (
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

          {isStagiaire && member.internship && (
            <TabsContent value="internship" className="mt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Niveau</p>
                    <p className="font-medium">{member.internship.level}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tuteur</p>
                    <p className="font-medium">{member.internship.tutor}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Établissement</p>
                    <p className="font-medium">{member.internship.establishment}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Sujet</p>
                    <p className="font-medium">{member.internship.subject}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date de début</p>
                    <p className="font-medium">{new Date(member.internship.startDate).toLocaleDateString("fr-FR")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date de fin</p>
                    <p className="font-medium">{new Date(member.internship.endDate).toLocaleDateString("fr-FR")}</p>
                  </div>
                  {member.internship.finalGrade !== undefined && (
                    <div>
                      <p className="text-sm text-muted-foreground">Note finale</p>
                      <p className="font-medium text-lg text-purple-700">{member.internship.finalGrade}/20</p>
                    </div>
                  )}
                  {member.internship.defenseDate && (
                    <div>
                      <p className="text-sm text-muted-foreground">Date de soutenance</p>
                      <p className="font-medium">{new Date(member.internship.defenseDate).toLocaleDateString("fr-FR")}</p>
                    </div>
                  )}
                </div>

                {member.internship.evaluationGrid && (
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-medium mb-2">Grille d'évaluation</h4>
                    <pre className="text-sm whitespace-pre-wrap">{member.internship.evaluationGrid}</pre>
                  </div>
                )}

                {member.internship.reportSubmitted && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Rapport de stage soumis</span>
                  </div>
                )}
              </div>
            </TabsContent>
          )}

          <TabsContent value="projects" className="mt-4">
            <div className="space-y-3">
              {member.projects.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Aucun projet assigné</p>
              ) : (
                member.projects.map((project) => (
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

              {member.aiPerformanceScore && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-500" />
                    Score de performance: {member.aiPerformanceScore}%
                  </h4>
                  <div className="mt-2">
                    <Progress value={member.aiPerformanceScore} className="h-2" />
                  </div>
                </div>
              )}

              {member.aiRiskScore && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Score de risque: {member.aiRiskScore}%
                  </h4>
                  <div className="mt-2">
                    <Progress value={member.aiRiskScore} className="h-2" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {member.aiRiskScore > 70 ? "⚠️ Risque élevé - Une attention particulière est recommandée" :
                     member.aiRiskScore > 40 ? "⚡ Risque modéré - Surveiller de près" :
                     "✅ Risque faible - Bonne progression"}
                  </p>
                </div>
              )}

              {member.aiRecommendations && member.aiRecommendations.length > 0 && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium mb-2">Recommandations</h4>
                  <ul className="space-y-2">
                    {member.aiRecommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-primary">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {member.aiLastUpdated && (
                <p className="text-xs text-muted-foreground text-right">
                  Dernière mise à jour: {new Date(member.aiLastUpdated).toLocaleString("fr-FR")}
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}