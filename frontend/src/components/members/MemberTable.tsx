// src/components/members/MemberTable.tsx
"use client";

import Link from "next/link";
import { 
  Eye, Edit, Trash2, Mail, Building2, Briefcase, 
  CheckCircle2, Clock, AlertCircle, Award, GraduationCap,
  AlertTriangle, BarChart3, Users 
} from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { cn } from "@/lib/utils";

export interface Member {
  id: string;
  name: string;
  email: string;
  position: string;
  department: string;
  departmentId: string;
  status: "actif" | "inactif" | "en_conge";
  type: "salarie" | "stagiaire" | "benevole";
  joinDate: string;
  evaluations: number;
  // Nouveaux champs
  phone?: string;
  performance?: number;
  aiPerformanceScore?: number;
  aiRiskScore?: number;
  internshipLevel?: "L3" | "M2";
  projectsCount?: number;
  activitiesCount?: number;
}

export interface MemberTableProps {
  members: Member[];
  onEdit?: (member: Member) => void;
  onDelete?: (member: Member) => void;
  onView?: (member: Member) => void;
  className?: string;
  showActions?: boolean;
  loading?: boolean;
  compact?: boolean;
  showAIInsights?: boolean;
  showPerformance?: boolean;
}

const statusColors = {
  actif: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  inactif: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  en_conge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
};

const statusLabels = {
  actif: "Actif",
  inactif: "Inactif",
  en_conge: "En congé",
};

const statusIcons = {
  actif: CheckCircle2,
  inactif: AlertCircle,
  en_conge: Clock,
};

const typeLabels = {
  salarie: "Salarié",
  stagiaire: "Stagiaire",
  benevole: "Bénévole",
};

const typeColors = {
  salarie: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  stagiaire: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  benevole: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
};

const typeIcons = {
  salarie: Briefcase,
  stagiaire: GraduationCap,
  benevole: Users,
};

export function MemberTable({
  members,
  onEdit,
  onDelete,
  onView,
  className,
  showActions = true,
  loading = false,
  compact = false,
  showAIInsights = true,
  showPerformance = true,
}: MemberTableProps) {
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
            <TableHead>Membre</TableHead>
            <TableHead className="hidden md:table-cell">Poste</TableHead>
            <TableHead className="hidden lg:table-cell">Département</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="hidden sm:table-cell">Statut</TableHead>
            {showPerformance && <TableHead className="hidden xl:table-cell">Perf.</TableHead>}
            {showAIInsights && <TableHead className="hidden 2xl:table-cell">Score IA</TableHead>}
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
          ) : members.length === 0 ? (
            <TableEmpty colSpan={showActions ? (showAIInsights ? 9 : 8) : (showAIInsights ? 8 : 7)}>
              <p className="text-sm text-muted-foreground">Aucun membre trouvé</p>
            </TableEmpty>
          ) : (
            members.map((member) => {
              const StatusIcon = statusIcons[member.status];
              const TypeIcon = typeIcons[member.type];
              const isHighRisk = member.aiRiskScore && member.aiRiskScore > 70;
              const isTopPerformer = member.aiPerformanceScore && member.aiPerformanceScore > 80;
              const riskInfo = member.aiRiskScore ? getRiskLabel(member.aiRiskScore) : null;
              const isStagiaire = member.type === "stagiaire";

              return (
                <TableRow 
                  key={member.id} 
                  className={cn(
                    isHighRisk && "bg-red-50/50 dark:bg-red-900/10",
                    isTopPerformer && "bg-green-50/50 dark:bg-green-900/10"
                  )}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0",
                        isHighRisk ? "bg-red-500" : isTopPerformer ? "bg-green-500" : "bg-primary"
                      )}>
                        {member.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/members/${member.id}`}
                            className="font-medium hover:text-primary transition-colors"
                          >
                            {member.name}
                          </Link>
                          {isStagiaire && member.internshipLevel && (
                            <Badge variant="outline" className="bg-purple-100 text-purple-700 text-[10px]">
                              {member.internshipLevel}
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
                        <p className="text-xs text-muted-foreground md:hidden">{member.position}</p>
                        <p className="text-xs text-muted-foreground hidden md:block">{member.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                      {member.position}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Link
                      href={`/departements/${member.departmentId}`}
                      className="text-sm hover:text-primary transition-colors flex items-center gap-1.5"
                    >
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      {member.department}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={typeColors[member.type]}>
                      <TypeIcon className="h-3 w-3 mr-1" />
                      {typeLabels[member.type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline" className={statusColors[member.status]}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusLabels[member.status]}
                    </Badge>
                  </TableCell>
                  {showPerformance && (
                    <TableCell className="hidden xl:table-cell">
                      {member.performance !== undefined ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                member.performance >= 70 ? "bg-green-500" :
                                member.performance >= 40 ? "bg-yellow-500" :
                                "bg-red-500"
                              )}
                              style={{ width: `${member.performance}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium">{member.performance}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  )}
                  {showAIInsights && (
                    <TableCell className="hidden 2xl:table-cell">
                      {member.aiRiskScore ? (
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "flex items-center gap-1",
                            riskInfo?.color
                          )}>
                            <AlertTriangle className="h-3 w-3" />
                            <span className="text-xs font-medium">{member.aiRiskScore}%</span>
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
                          onClick={() => onView?.(member)}
                          className="h-8 w-8"
                          title="Voir"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit?.(member)}
                          className="h-8 w-8"
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete?.(member)}
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