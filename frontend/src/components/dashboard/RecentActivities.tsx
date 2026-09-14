// src/components/dashboard/RecentActivities.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Clock, CheckCircle2, AlertCircle, Activity, User, Briefcase, Heart, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export interface RecentActivity {
  id: string;
  title: string;
  description: string;
  type: "evaluation" | "project" | "beneficiary" | "report" | "member";
  status: "done" | "pending" | "overdue";
  time: string;
  user?: string;
  href?: string;
}

export interface RecentActivitiesProps {
  activities?: RecentActivity[];
  className?: string;
  maxItems?: number;
  showViewAll?: boolean;
}

const defaultActivities: RecentActivity[] = [
  {
    id: "1",
    title: "Évaluation trimestrielle - Maison Digitale",
    description: "Évaluation des bénéficiaires du programme",
    type: "evaluation",
    status: "done",
    time: "Il y a 2h",
    user: "Rakoto Jean",
    href: "/evaluations/1",
  },
  {
    id: "2",
    title: "Rapport d'activité - Otrikasa",
    description: "Rapport mensuel d'activités",
    type: "report",
    status: "pending",
    time: "Il y a 5h",
    user: "Razafindrazaka Marie",
    href: "/reports/2",
  },
  {
    id: "3",
    title: "Campagne d'évaluation des stagiaires",
    description: "Évaluation de fin de stage L3/M2",
    type: "evaluation",
    status: "overdue",
    time: "Il y a 1j",
    user: "Andriamanjato Faly",
    href: "/evaluations/campaigns",
  },
  {
    id: "4",
    title: "Suivi bénéficiaires - Kids Preneur",
    description: "Suivi des progrès des enfants",
    type: "beneficiary",
    status: "done",
    time: "Il y a 2j",
    user: "Randrianasolo Hanta",
    href: "/beneficiaries",
  },
  {
    id: "5",
    title: "Nouveau projet - Ankizy Innov",
    description: "Lancement du programme d'innovation",
    type: "project",
    status: "pending",
    time: "Il y a 3j",
    user: "Rakotomalala Tiana",
    href: "/projects/3",
  },
];

const typeIcons = {
  evaluation: { icon: FileText, color: "text-purple-500" },
  project: { icon: Briefcase, color: "text-blue-500" },
  beneficiary: { icon: Heart, color: "text-pink-500" },
  report: { icon: FileText, color: "text-indigo-500" },
  member: { icon: User, color: "text-green-500" },
};

const statusColors = {
  done: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const statusIcons = {
  done: CheckCircle2,
  pending: Clock,
  overdue: AlertCircle,
};

const statusLabels = {
  done: "Terminé",
  pending: "En cours",
  overdue: "En retard",
};

export function RecentActivities({
  activities = defaultActivities,
  className,
  maxItems = 5,
  showViewAll = true,
}: RecentActivitiesProps) {
  const [visibleActivities] = useState(activities.slice(0, maxItems));

  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Activités récentes</CardTitle>
        {showViewAll && (
          <Link
            href="/activities"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            Voir tout
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleActivities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm">Aucune activité récente</p>
          </div>
        ) : (
          visibleActivities.map((activity) => {
            const TypeIcon = typeIcons[activity.type]?.icon || Activity;
            const StatusIcon = statusIcons[activity.status];
            const typeColor = typeIcons[activity.type]?.color || "text-muted-foreground";

            return (
              <div
                key={activity.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-xl transition-colors",
                  "hover:bg-muted/30",
                  activity.href && "cursor-pointer"
                )}
                onClick={() => {
                  if (activity.href) {
                    window.location.href = activity.href;
                  }
                }}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                    <TypeIcon className={cn("h-4 w-4", typeColor)} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {activity.user && (
                          <>
                            <span className="flex items-center gap-0.5">
                              <User className="h-3 w-3" />
                              {activity.user}
                            </span>
                            <span className="w-0.5 h-3 bg-border" />
                          </>
                        )}
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          {activity.time}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "flex-shrink-0 text-xs",
                        statusColors[activity.status]
                      )}
                    >
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusLabels[activity.status]}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}