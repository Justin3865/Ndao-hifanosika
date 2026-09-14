// src/components/beneficiaries/BeneficiaryTable.tsx
"use client";

import Link from "next/link";
import { 
  Eye, Edit, Trash2, Mail, User, Calendar, 
  CheckCircle2, Clock, AlertCircle, Award, 
  AlertTriangle, BarChart3, Heart, MapPin,
  Users, Target
} from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { cn } from "@/lib/utils";

export interface Beneficiary {
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
  performance?: number;
  aiRiskScore?: number;
  aiPerformanceScore?: number;
  projectsCount?: number;
}

export interface BeneficiaryTableProps {
  beneficiaries: Beneficiary[];
  onEdit?: (beneficiary: Beneficiary) => void;
  onDelete?: (beneficiary: Beneficiary) => void;
  onView?: (beneficiary: Beneficiary) => void;
  className?: string;
  showActions?: boolean;
  loading?: boolean;
  compact?: boolean;
  showAIInsights?: boolean;
  showPerformance?: boolean;
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
  enfant: Heart,
};

export function BeneficiaryTable({
  beneficiaries,
  onEdit,
  onDelete,
  onView,
  className,
  showActions = true,
  loading = false,
  compact = false,
  showAIInsights = true,
  showPerformance = true,
}: BeneficiaryTableProps) {
  const getRiskLabel = (score: number) => {
    if (score > 70) return { label: "Élevé", color: "text-red-600" };
    if (score > 40) return { label: "Modéré", color: "text-yellow-600" };
    return { label: "Faible", color: "text-green-600" };
  };

  return (
    <div className={cn("rounded-xl border border-border/50 overflow-hidden", className)}>
      <Table compact={compact}>
        <TableHeader>
          <TableRow>
            <TableHead>Bénéficiaire</TableHead>
            <TableHead className="hidden md:table-cell">Programme</TableHead>
            <TableHead className="hidden lg:table-cell">Genre</TableHead>
            <TableHead>Progression</TableHead>
            <TableHead className="hidden sm:table-cell">Statut</TableHead>
            {showPerformance && <TableHead className="hidden xl:table-cell">Perf.</TableHead>}
            {showAIInsights && <TableHead className="hidden 2xl:table-cell">Risque IA</TableHead>}
            {showActions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableEmpty colSpan={showActions ? (showAIInsights ? 9 : 8) : (showAIInsights ? 8 : 7)}>
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin h-6 w-6 border-2 border-primary/20 border-t-primary rounded-full" />
                <p className="text-sm text-muted-foreground">Chargement...</p>
              </div>
            </TableEmpty>
          ) : beneficiaries.length === 0 ? (
            <TableEmpty colSpan={showActions ? (showAIInsights ? 9 : 8) : (showAIInsights ? 8 : 7)}>
              <p className="text-sm text-muted-foreground">Aucun bénéficiaire trouvé</p>
            </TableEmpty>
          ) : (
            beneficiaries.map((beneficiary) => {
              const StatusIcon = statusIcons[beneficiary.status];
              const GenderIcon = genderIcons[beneficiary.gender];
              const isHighRisk = beneficiary.aiRiskScore && beneficiary.aiRiskScore > 70;
              const isTopPerformer = beneficiary.aiPerformanceScore && beneficiary.aiPerformanceScore > 80;
              const isVulnerable = beneficiary.vulnérabilité && beneficiary.vulnérabilité.length > 0;
              const riskInfo = beneficiary.aiRiskScore ? getRiskLabel(beneficiary.aiRiskScore) : null;

              return (
                <TableRow 
                  key={beneficiary.id} 
                  className={cn(
                    isHighRisk && "bg-red-50/50 dark:bg-red-900/10",
                    isTopPerformer && "bg-green-50/50 dark:bg-green-900/10",
                    isVulnerable && "bg-yellow-50/50 dark:bg-yellow-900/10"
                  )}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0",
                        isHighRisk ? "bg-red-500" : isTopPerformer ? "bg-green-500" : isVulnerable ? "bg-yellow-500" : "bg-primary"
                      )}>
                        {beneficiary.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/beneficiaries/${beneficiary.id}`}
                            className="font-medium hover:text-primary transition-colors"
                          >
                            {beneficiary.name}
                          </Link>
                          {isVulnerable && (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-700 text-[10px]">
                              <Heart className="h-2 w-2 mr-1" />
                              Vulnérable
                            </Badge>
                          )}
                          {isHighRisk && (
                            <Badge variant="destructive" className="text-[10px]">
                              <AlertTriangle className="h-2 w-2 mr-1" />
                              Risque
                            </Badge>
                          )}
                          {isTopPerformer && (
                            <Badge variant="outline" className="bg-green-100 text-green-700 text-[10px]">
                              <Award className="h-2 w-2 mr-1" />
                              Top
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground md:hidden">{beneficiary.program}</p>
                        {beneficiary.email && (
                          <p className="text-xs text-muted-foreground hidden md:block">{beneficiary.email}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Link
                      href={`/programs/${beneficiary.programId}`}
                      className="text-sm hover:text-primary transition-colors flex items-center gap-1.5"
                    >
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      {beneficiary.program}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Badge variant="outline" className={genderColors[beneficiary.gender]}>
                      <GenderIcon className="h-3 w-3 mr-1" />
                      {genderLabels[beneficiary.gender]}
                    </Badge>
                    {beneficiary.age && (
                      <span className="text-xs text-muted-foreground ml-2">{beneficiary.age} ans</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            beneficiary.progress >= 70 ? "bg-green-500" :
                            beneficiary.progress >= 40 ? "bg-yellow-500" :
                            "bg-red-500"
                          )}
                          style={{ width: `${beneficiary.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium">{beneficiary.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline" className={statusColors[beneficiary.status]}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusLabels[beneficiary.status]}
                    </Badge>
                  </TableCell>
                  {showPerformance && (
                    <TableCell className="hidden xl:table-cell">
                      {beneficiary.performance !== undefined ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                beneficiary.performance >= 70 ? "bg-green-500" :
                                beneficiary.performance >= 40 ? "bg-yellow-500" :
                                "bg-red-500"
                              )}
                              style={{ width: `${beneficiary.performance}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium">{beneficiary.performance}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  )}
                  {showAIInsights && (
                    <TableCell className="hidden 2xl:table-cell">
                      {beneficiary.aiRiskScore ? (
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "flex items-center gap-1",
                            riskInfo?.color
                          )}>
                            <AlertTriangle className="h-3 w-3" />
                            <span className="text-xs font-medium">{beneficiary.aiRiskScore}%</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{riskInfo?.label}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  )}
                  {showActions && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onView?.(beneficiary)}
                          className="h-8 w-8"
                          title="Voir"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit?.(beneficiary)}
                          className="h-8 w-8"
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete?.(beneficiary)}
                          className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}