"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Users,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export interface ProjectCardProps {
  id: string;
  name: string;
  description?: string;
  status: "active" | "completed" | "pending";
  progress: number;
  beneficiaries?: number;
  startDate?: string;
  endDate?: string;
  href?: string;
  className?: string;
}

const statusLabels = {
  active: "En cours",
  completed: "Terminé",
  pending: "En attente",
};

const statusClasses = {
  active:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  completed:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  pending:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
};

export default function ProjectCard({
  name,
  description,
  status,
  progress,
  beneficiaries,
  startDate,
  endDate,
  href,
  className,
}: ProjectCardProps) {
  const content = (
    <Card
      className={cn(
        "h-full transition-all",
        href && "hover:-translate-y-0.5 hover:shadow-md",
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{name}</CardTitle>

            {description && (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>

          <Badge
            variant="outline"
            className={cn("shrink-0", statusClasses[status])}
          >
            {statusLabels[status]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progression</span>
            <span className="font-semibold">{progress}%</span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${Math.min(Math.max(progress, 0), 100)}%`,
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          {beneficiaries !== undefined && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{beneficiaries} bénéficiaires</span>
            </div>
          )}

          {status === "completed" ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>Projet terminé</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock3 className="h-4 w-4" />
              <span>Suivi actif</span>
            </div>
          )}
        </div>

        {(startDate || endDate) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <span>
              {startDate || "—"} {endDate ? `→ ${endDate}` : ""}
            </span>
          </div>
        )}

        {href && (
          <div className="flex items-center gap-1 pt-1 text-sm font-medium text-primary">
            Voir le projet
            <ArrowRight className="h-4 w-4" />
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  );
}