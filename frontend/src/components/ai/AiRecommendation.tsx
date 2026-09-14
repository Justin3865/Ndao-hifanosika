// src/components/ai/AiRecommendation.tsx
"use client";

import { useState } from "react";
import { Sparkles, Target, CheckCircle, Clock, AlertCircle, Eye, Download, ThumbsUp, ThumbsDown, Share2, BookOpen, Users, Briefcase, Heart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface AiRecommendationProps {
  id: string;
  title: string;
  description: string;
  type: "dropout" | "performance" | "anomaly" | "summary";
  priority: "haute" | "moyenne" | "basse";
  confidence: number;
  targetName?: string;
  targetType?: "beneficiary" | "member" | "project";
  actions: string[];
  createdAt: string;
  onAccept?: () => void;
  onReject?: () => void;
  onView?: () => void;
  className?: string;
  compact?: boolean;
}

const typeLabels = {
  dropout: "Prévention décrochage",
  performance: "Optimisation performance",
  anomaly: "Correction anomalie",
  summary: "Synthèse automatique",
};

const typeColors = {
  dropout: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  performance: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  anomaly: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  summary: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
};

const typeIcons = {
  dropout: Heart,
  performance: Users,
  anomaly: AlertCircle,
  summary: BookOpen,
};

const priorityColors = {
  haute: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  moyenne: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  basse: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

const priorityLabels = {
  haute: "Haute priorité",
  moyenne: "Priorité moyenne",
  basse: "Priorité basse",
};

export function AiRecommendation({
  id,
  title,
  description,
  type,
  priority,
  confidence,
  targetName,
  targetType,
  actions,
  createdAt,
  onAccept,
  onReject,
  onView,
  className,
  compact = false,
}: AiRecommendationProps) {
  const [isAccepted, setIsAccepted] = useState(false);
  const [isRejected, setIsRejected] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const TypeIcon = typeIcons[type];

  const handleAccept = () => {
    setIsAccepted(true);
    onAccept?.();
  };

  const handleReject = () => {
    setIsRejected(true);
    onReject?.();
  };

  if (isAccepted) {
    return (
      <Card className={cn("border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/10", className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="font-medium text-green-700 dark:text-green-300">Recommandation acceptée</p>
              <p className="text-sm text-green-600 dark:text-green-400">L'action a été prise en compte</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isRejected) {
    return (
      <Card className={cn("border-gray-300 dark:border-gray-700 bg-muted/30", className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-muted-foreground">Recommandation ignorée</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "hover:shadow-md transition-all",
      priority === "haute" && "border-red-300 dark:border-red-800",
      className
    )}>
      <CardHeader className={compact ? "pb-2" : ""}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              typeColors[type]
            )}>
              <TypeIcon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className={compact ? "text-base" : ""}>{title}</CardTitle>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <Badge variant="outline" className={typeColors[type]}>
                  {typeLabels[type]}
                </Badge>
                <Badge variant="outline" className={priorityColors[priority]}>
                  {priorityLabels[priority]}
                </Badge>
                <Badge variant="outline" className="bg-primary/10 text-primary">
                  Confiance: {confidence}%
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className={compact ? "pt-0" : ""}>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{description}</p>

          {targetName && (
            <div className="flex items-center gap-2 text-sm bg-muted/30 p-2 rounded-lg">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{targetName}</span>
              {targetType && (
                <Badge variant="outline" className="text-xs">
                  {targetType === "beneficiary" ? "Bénéficiaire" :
                   targetType === "member" ? "Membre" :
                   targetType === "project" ? "Projet" : ""}
                </Badge>
              )}
            </div>
          )}

          {/* Actions */}
          {actions.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1.5">Actions recommandées:</p>
              <ul className="space-y-1">
                {actions.map((action, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <Target className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer */}
          <div className={cn(
            "flex items-center justify-between pt-2",
            !compact && "border-t border-border/50"
          )}>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(createdAt).toLocaleDateString("fr-FR")}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onView}
                className="h-7 text-xs"
              >
                <Eye className="h-3.5 w-3.5 mr-1" />
                Voir
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAccept}
                className="h-7 text-xs text-green-600 hover:text-green-700"
              >
                <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                Accepter
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReject}
                className="h-7 text-xs text-muted-foreground"
              >
                <ThumbsDown className="h-3.5 w-3.5 mr-1" />
                Ignorer
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}