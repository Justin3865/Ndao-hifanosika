// src/components/activities/ActivityDetails.tsx
"use client";

import { useState } from "react";
import { 
  Calendar, Clock, Users, Building2, FileText, 
  Download, Share2, BarChart3, AlertTriangle,
  CheckCircle2, XCircle, Clock as ClockIcon,
  Edit, Trash2, User, MapPin, Target,
  Award, BookOpen, GraduationCap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { cn } from "@/lib/utils";

export interface ActivityDetailsProps {
  activity: {
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
    deliverables: string[];
    milestones: { title: string; date: string; status: string }[];
    progress: number;
    budgetIndicatif?: number;
    budgetSpent?: number;
    organizer: string;
    participantsList?: string[];
    // IA Insights
    aiRiskScore?: number;
    aiPerformanceScore?: number;
    aiRecommendations?: string[];
    aiLastUpdated?: string;
    // Ho an'ny stagiaires
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
    reportSummary?: string;
    reportFile?: string;
    createdAt: string;
    updatedAt: string;
  };
  onEdit?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  onGenerateReport?: () => void;
  className?: string;
}

export function ActivityDetails({
  activity,
  onEdit,
  onDelete,
  onExport,
  onGenerateReport,
  className,
}: ActivityDetailsProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isGenerating, setIsGenerating] = useState(false);

  const statusConfig = {
    planifie: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", icon: ClockIcon },
    en_cours: { color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300", icon: ClockIcon },
    termine: { color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300", icon: CheckCircle2 },
    annule: { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300", icon: XCircle },
  };

  const typeConfig = {
    formation: { color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300", icon: GraduationCap },
    atelier: { color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300", icon: Target },
    reunion: { color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300", icon: Users },
    suivi: { color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300", icon: BookOpen },
    autre: { color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300", icon: FileText },
    stage: { color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300", icon: Award },
  };

  const StatusIcon = statusConfig[activity.status]?.icon || ClockIcon;
  const TypeIcon = typeConfig[activity.type]?.icon || FileText;
  const isHighRisk = activity.aiRiskScore && activity.aiRiskScore > 70;
  const isStage = activity.type === "stage";

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
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <CardTitle className="text-2xl">{activity.title}</CardTitle>
            <Badge className={statusConfig[activity.status]?.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {activity.status}
            </Badge>
            <Badge variant="outline" className={typeConfig[activity.type]?.color}>
              <TypeIcon className="h-3 w-3 mr-1" />
              {activity.type}
            </Badge>
            {isHighRisk && (
              <Badge variant="destructive" className="animate-pulse">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Risque élevé
              </Badge>
            )}
            {activity.internship?.level && (
              <Badge variant="outline" className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                <GraduationCap className="h-3 w-3 mr-1" />
                {activity.internship.level}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-2">{activity.description}</p>
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
            <TabsTrigger value="deliverables">Livrables</TabsTrigger>
            <TabsTrigger value="milestones">Jalons</TabsTrigger>
            {isStage && <TabsTrigger value="internship">Stage</TabsTrigger>}
            <TabsTrigger value="ai-insights">Insights IA</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Aperçu détaillé */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>{activity.project}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{new Date(activity.date).toLocaleDateString("fr-FR")}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{activity.time} - {activity.endTime}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{activity.participants} participants</span>
              </div>
            </div>

            {activity.location && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{activity.location}</span>
              </div>
            )}

            {activity.organizer && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Organisé par: {activity.organizer}</span>
              </div>
            )}

            <div className="mt-4">
              <div className="flex justify-between text-sm">
                <span>Progression</span>
                <span>{activity.progress}%</span>
              </div>
              <Progress value={activity.progress} className="h-2" />
            </div>

            {(activity.budgetIndicatif || activity.budgetSpent) && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Budget</h4>
                <div className="space-y-1">
                  {activity.budgetIndicatif && (
                    <div className="flex justify-between text-sm">
                      <span>Budget indicatif</span>
                      <span className="font-medium">{activity.budgetIndicatif.toLocaleString()} Ar</span>
                    </div>
                  )}
                  {activity.budgetSpent !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span>Dépensé</span>
                      <span className="font-medium">{activity.budgetSpent.toLocaleString()} Ar</span>
                    </div>
                  )}
                  {activity.budgetIndicatif && activity.budgetSpent !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span>Restant</span>
                      <span className="font-medium text-green-600">
                        {(activity.budgetIndicatif - activity.budgetSpent).toLocaleString()} Ar
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
              <span>Créé le: {new Date(activity.createdAt).toLocaleDateString("fr-FR")}</span>
              <span>Modifié le: {new Date(activity.updatedAt).toLocaleDateString("fr-FR")}</span>
            </div>
          </TabsContent>

          <TabsContent value="deliverables" className="mt-4">
            <div className="space-y-2">
              {activity.deliverables.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Aucun livrable défini</p>
              ) : (
                activity.deliverables.map((deliverable, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{deliverable}</span>
                    <Badge variant="outline" className="ml-auto bg-green-100 text-green-700">
                      En attente
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="milestones" className="mt-4">
            <div className="space-y-3">
              {activity.milestones.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Aucun jalon défini</p>
              ) : (
                activity.milestones.map((milestone, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="font-medium">{milestone.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(milestone.date).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <Badge variant="outline" className={
                      milestone.status === "termine" ? "bg-green-100 text-green-700" :
                      milestone.status === "en_cours" ? "bg-yellow-100 text-yellow-700" :
                      "bg-blue-100 text-blue-700"
                    }>
                      {milestone.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {isStage && (
            <TabsContent value="internship" className="mt-4">
              {activity.internship ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Tuteur</p>
                      <p className="font-medium">{activity.internship.tutor}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Établissement</p>
                      <p className="font-medium">{activity.internship.establishment}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Sujet</p>
                      <p className="font-medium">{activity.internship.subject}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date de début</p>
                      <p className="font-medium">{new Date(activity.internship.startDate).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date de fin</p>
                      <p className="font-medium">{new Date(activity.internship.endDate).toLocaleDateString("fr-FR")}</p>
                    </div>
                    {activity.internship.finalGrade !== undefined && (
                      <div>
                        <p className="text-sm text-muted-foreground">Note finale</p>
                        <p className="font-medium text-lg">{activity.internship.finalGrade}/20</p>
                      </div>
                    )}
                    {activity.internship.defenseDate && (
                      <div>
                        <p className="text-sm text-muted-foreground">Date de soutenance</p>
                        <p className="font-medium">{new Date(activity.internship.defenseDate).toLocaleDateString("fr-FR")}</p>
                      </div>
                    )}
                  </div>

                  {activity.internship.evaluationGrid && (
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <h4 className="font-medium mb-2">Grille d'évaluation</h4>
                      <pre className="text-sm whitespace-pre-wrap">{activity.internship.evaluationGrid}</pre>
                    </div>
                  )}

                  {activity.internship.reportSubmitted && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Rapport de stage soumis</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">Aucune information de stage disponible</p>
              )}
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

              {activity.aiRiskScore && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Score de risque: {activity.aiRiskScore}%
                  </h4>
                  <div className="mt-2">
                    <Progress value={activity.aiRiskScore} className="h-2" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {activity.aiRiskScore > 70 ? "⚠️ Risque élevé - Une attention particulière est recommandée" :
                     activity.aiRiskScore > 40 ? "⚡ Risque modéré - Surveiller de près" :
                     "✅ Risque faible - Bonne progression"}
                  </p>
                </div>
              )}

              {activity.aiPerformanceScore && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-500" />
                    Score de performance: {activity.aiPerformanceScore}%
                  </h4>
                  <div className="mt-2">
                    <Progress value={activity.aiPerformanceScore} className="h-2" />
                  </div>
                </div>
              )}

              {activity.aiRecommendations && activity.aiRecommendations.length > 0 && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium mb-2">Recommandations</h4>
                  <ul className="space-y-2">
                    {activity.aiRecommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-primary">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activity.aiLastUpdated && (
                <p className="text-xs text-muted-foreground text-right">
                  Dernière mise à jour: {new Date(activity.aiLastUpdated).toLocaleString("fr-FR")}
                </p>
              )}

              {activity.reportSummary && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium mb-2">Synthèse du rapport</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {activity.reportSummary}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}