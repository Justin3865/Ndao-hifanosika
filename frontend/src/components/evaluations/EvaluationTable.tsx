// src/components/evaluations/EvaluationTable.tsx
"use client";

import Link from "next/link";
import { Eye, Edit, Trash2, ClipboardList, Calendar, Users, Award, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface Evaluation {
  id: string;
  title: string;
  type: "membre" | "stagiaire" | "beneficiaire";
  targetName: string;
  targetId: string;
  evaluatorName: string;
  evaluatorId: string;
  gridName: string;
  gridId: string;
  period: string;
  status: "planifie" | "en_cours" | "termine" | "annule";
  score?: number;
  dueDate: string;
  completedDate?: string;
}

export interface EvaluationTableProps {
  evaluations: Evaluation[];
  onEdit?: (evaluation: Evaluation) => void;
  onDelete?: (evaluation: Evaluation) => void;
  onView?: (evaluation: Evaluation) => void;
  onResults?: (evaluation: Evaluation) => void;
  className?: string;
  showActions?: boolean;
  loading?: boolean;
  compact?: boolean;
}

const typeLabels = {
  membre: "Membre",
  stagiaire: "Stagiaire",
  beneficiaire: "Bénéficiaire",
};

const typeColors = {
  membre: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  stagiaire: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  beneficiaire: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

const statusColors = {
  planifie: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  en_cours: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  termine: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  annule: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const statusLabels = {
  planifie: "Planifié",
  en_cours: "En cours",
  termine: "Terminé",
  annule: "Annulé",
};

const statusIcons = {
  planifie: Clock,
  en_cours: ClipboardList,
  termine: CheckCircle2,
  annule: AlertCircle,
};

export function EvaluationTable({
  evaluations,
  onEdit,
  onDelete,
  onView,
  onResults,
  className,
  showActions = true,
  loading = false,
  compact = false,
}: EvaluationTableProps) {
  return (
    <div className={cn("rounded-xl border border-border/50 overflow-hidden", className)}>
      <Table compact={compact}>
        <TableHeader>
          <TableRow>
            <TableHead>Évaluation</TableHead>
            <TableHead className="hidden md:table-cell">Type</TableHead>
            <TableHead className="hidden lg:table-cell">Évaluateur</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="hidden sm:table-cell">Score</TableHead>
            {showActions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableEmpty colSpan={showActions ? 6 : 5}>
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin h-6 w-6 border-2 border-primary/20 border-t-primary rounded-full" />
                <p className="text-sm text-muted-foreground">Chargement...</p>
              </div>
            </TableEmpty>
          ) : evaluations.length === 0 ? (
            <TableEmpty colSpan={showActions ? 6 : 5}>
              <p className="text-sm text-muted-foreground">Aucune évaluation trouvée</p>
            </TableEmpty>
          ) : (
            evaluations.map((evaluation) => {
              const StatusIcon = statusIcons[evaluation.status];
              return (
                <TableRow key={evaluation.id}>
                  <TableCell>
                    <div>
                      <Link
                        href={`/evaluations/${evaluation.id}`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {evaluation.title}
                      </Link>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <Users className="h-3 w-3" />
                        <span>{evaluation.targetName}</span>
                        <span className="w-0.5 h-3 bg-border" />
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(evaluation.dueDate).toLocaleDateString("fr-FR")}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline" className={typeColors[evaluation.type]}>
                      {typeLabels[evaluation.type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-sm">{evaluation.evaluatorName}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[evaluation.status]}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusLabels[evaluation.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {evaluation.score ? (
                      <div className="flex items-center gap-1">
                        <Award className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">{evaluation.score}/5</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onView?.(evaluation)}
                          className="h-8 w-8"
                          title="Voir"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {evaluation.status === "termine" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onResults?.(evaluation)}
                            className="h-8 w-8"
                            title="Résultats"
                          >
                            <Award className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit?.(evaluation)}
                          className="h-8 w-8"
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete?.(evaluation)}
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