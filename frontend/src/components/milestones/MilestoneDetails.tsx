// src/components/milestones/MilestoneDetails.tsx
"use client";

import { useState } from "react";
import {
  Target, Calendar, Building2, FileText, Check, Plus, Trash2,
  Users, Award, BarChart3, AlertTriangle, CheckCircle2, Clock,
  AlertCircle, Circle, Edit, Download, Share2, User, MapPin,
  Activity, BookOpen, GraduationCap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { cn } from "@/lib/utils";

export interface MilestoneDetailsProps {
  milestone: {
    id: string;
    title: string;
    description: string;
    project: string;
    projectId: string;
    targetDate: string;
    actualDate?: string;
    status: "planifie" | "en_cours" | "termine" | "retard";
    progress: number;
    objectives: string[];
    deliverables: string[];
    responsibleTeam?: string;
    beneficiariesCount?: number;
    budgetIndicatif?: number;
    budgetSpent?: number;
    // IA Insights
    aiRiskScore?: number;
    aiPerformanceScore?: number;
    aiRecommendations?: string[];
    aiLastUpdated?: string;
    // Bénéficiaires et membres
    beneficiaries?: { id: string; name: string; program: string; status: string }[];
    members?: { id: string; name: string; role: string; department: string }[];
    // Documents
    attachments?: { id: string; name: string; url: string; size: string }[];
    // Dates
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
    // Métadonnées
    createdBy: string;
    lastModifiedBy?: string;
  };
  onEdit?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  onGenerateReport?: () => void;
  className?: string;
}

export function MilestoneDetails({
  milestone,
  onEdit,
  onDelete,
  onExport,
  onGenerateReport,
  className,
}: MilestoneDetailsProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isGenerating, setIsGenerating] = useState(false);

  const statusConfig = {
    planifie: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", icon: Circle },
    en_cours: { color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300", icon: Clock },
    termine: { color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300", icon: CheckCircle2 },
    retard: { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300", icon: AlertCircle },
  };

  const StatusIcon = statusConfig[milestone.status]?.icon || Circle;
  const isHighRisk = milestone.aiRiskScore && milestone.aiRiskScore > 70;
  const isCompleted = milestone.status === "termine";
  const daysUntil = milestone.status !== "termine" 
    ? Math.ceil((new Date(milestone.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

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
            <CardTitle className="text-2xl">{milestone.title}</CardTitle>
            <Badge className={statusConfig[milestone.status]?.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {milestone.status}
            </Badge>
            {isHighRisk && (
              <Badge variant="destructive" className="animate-pulse">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Risque élevé
              </Badge>
            )}
            {isCompleted && milestone.actualDate && (
              <Badge variant="outline" className="bg-green-100 text-green-700">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Réalisé le {new Date(milestone.actualDate).toLocaleDateString("fr-FR")}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-2">{milestone.description}</p>
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
            <TabsTrigger value="objectives">Objectifs</TabsTrigger>
            <TabsTrigger value="deliverables">Livrables</TabsTrigger>
            <TabsTrigger value="stakeholders">Parties prenantes</TabsTrigger>
            <TabsTrigger value="ai-insights">Insights IA</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Aperçu détaillé */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>{milestone.project}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Cible: {new Date(milestone.targetDate).toLocaleDateString("fr-FR")}</span>
              </div>
              {milestone.actualDate && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Réalisé: {new Date(milestone.actualDate).toLocaleDateString("fr-FR")}</span>
                </div>
              )}
              {milestone.responsibleTeam && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{milestone.responsibleTeam}</span>
                </div>
              )}
            </div>

            {/* Progression */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Progression</span>
                <span className="font-medium">{milestone.progress}%</span>
              </div>
              <Progress value={milestone.progress} className="h-2" />
              {!isCompleted && daysUntil > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  {daysUntil} jour{daysUntil > 1 ? 's' : ''} restant{daysUntil > 1 ? 's' : ''} avant la date cible
                </p>
              )}
              {!isCompleted && daysUntil < 0 && (
                <p className="text-sm text-red-600 mt-2">
                  ⚠️ {Math.abs(daysUntil)} jour{Math.abs(daysUntil) > 1 ? 's' : ''} de retard
                </p>
              )}
            </div>

            {/* Budget */}
            {(milestone.budgetIndicatif || milestone.budgetSpent) && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Budget</h4>
                <div className="space-y-1">
                  {milestone.budgetIndicatif && (
                    <div className="flex justify-between text-sm">
                      <span>Budget indicatif</span>
                      <span className="font-medium">{milestone.budgetIndicatif.toLocaleString()} Ar</span>
                    </div>
                  )}
                  {milestone.budgetSpent !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span>Dépensé</span>
                      <span className="font-medium">{milestone.budgetSpent.toLocaleString()} Ar</span>
                    </div>
                  )}
                  {milestone.budgetIndicatif && milestone.budgetSpent !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span>Restant</span>
                      <span className="font-medium text-green-600">
                        {(milestone.budgetIndicatif - milestone.budgetSpent).toLocaleString()} Ar
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Métadonnées */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
              <span>Créé par: {milestone.createdBy}</span>
              <span>Créé le: {new Date(milestone.createdAt).toLocaleDateString("fr-FR")}</span>
              {milestone.lastModifiedBy && (
                <span>Modifié par: {milestone.lastModifiedBy}</span>
              )}
              <span>Dernière modification: {new Date(milestone.updatedAt).toLocaleDateString("fr-FR")}</span>
            </div>
          </TabsContent>

          <TabsContent value="objectives" className="mt-4">
            <div className="space-y-2">
              {milestone.objectives.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Aucun objectif défini</p>
              ) : (
                milestone.objectives.map((objective, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span>{objective}</span>
                    <Badge variant="outline" className="ml-auto bg-green-100 text-green-700">
                      En cours
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="deliverables" className="mt-4">
            <div className="space-y-2">
              {milestone.deliverables.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Aucun livrable défini</p>
              ) : (
                milestone.deliverables.map((deliverable, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{deliverable}</span>
                    <Badge variant="outline" className="ml-auto bg-yellow-100 text-yellow-700">
                      En attente
                    </Badge>
                  </div>
                ))
              )}
            </div>

            {/* Attachments */}
            {milestone.attachments && milestone.attachments.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Pièces jointes</h4>
                <div className="space-y-2">
                  {milestone.attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>{attachment.name}</span>
                        <span className="text-xs text-muted-foreground">({attachment.size})</span>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="stakeholders" className="mt-4">
            {/* Bénéficiaires */}
            {milestone.beneficiaries && milestone.beneficiaries.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Bénéficiaires concernés ({milestone.beneficiaries.length})
                </h4>
                <div className="space-y-2">
                  {milestone.beneficiaries.map((beneficiary) => (
                    <div key={beneficiary.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium">{beneficiary.name}</p>
                        <p className="text-sm text-muted-foreground">{beneficiary.program}</p>
                      </div>
                      <Badge variant="outline" className={
                        beneficiary.status === "actif" ? "bg-green-100 text-green-700" :
                        "bg-yellow-100 text-yellow-700"
                      }>
                        {beneficiary.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Membres */}
            {milestone.members && milestone.members.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Membres assignés ({milestone.members.length})
                </h4>
                <div className="space-y-2">
                  {milestone.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.role} - {member.department}</p>
                      </div>
                      <Badge variant="outline" className="bg-blue-100 text-blue-700">
                        Assigné
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!milestone.beneficiaries || milestone.beneficiaries.length === 0) &&
             (!milestone.members || milestone.members.length === 0) && (
              <p className="text-muted-foreground text-center py-4">Aucune partie prenante assignée</p>
            )}
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

              {milestone.aiRiskScore && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Score de risque: {milestone.aiRiskScore}%
                  </h4>
                  <div className="mt-2">
                    <Progress value={milestone.aiRiskScore} className="h-2" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {milestone.aiRiskScore > 70 ? "⚠️ Risque élevé - Une attention particulière est recommandée" :
                     milestone.aiRiskScore > 40 ? "⚡ Risque modéré - Surveiller de près" :
                     "✅ Risque faible - Bonne progression"}
                  </p>
                </div>
              )}

              {milestone.aiPerformanceScore && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-500" />
                    Score de performance: {milestone.aiPerformanceScore}%
                  </h4>
                  <div className="mt-2">
                    <Progress value={milestone.aiPerformanceScore} className="h-2" />
                  </div>
                </div>
              )}

              {milestone.aiRecommendations && milestone.aiRecommendations.length > 0 && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium mb-2">Recommandations</h4>
                  <ul className="space-y-2">
                    {milestone.aiRecommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-primary">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {milestone.aiLastUpdated && (
                <p className="text-xs text-muted-foreground text-right">
                  Dernière mise à jour: {new Date(milestone.aiLastUpdated).toLocaleString("fr-FR")}
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}