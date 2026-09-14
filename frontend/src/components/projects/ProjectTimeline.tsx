"use client";

import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Circle,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

import { cn } from "@/lib/utils";

import type {
  Milestone,
} from "./ProjectTable";

interface ProjectTimelineProps {
  milestones: Milestone[];

  startDate?: string;
  endDate?: string;

  className?: string;

  showDates?: boolean;
}

function formatDate(date: string) {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(parsed);
}

function getStatusIcon(
  status: Milestone["status"]
) {
  switch (status) {
    case "done":
      return (
        <CheckCircle2 className="h-5 w-5 text-green-600" />
      );

    case "pending":
      return (
        <Clock className="h-5 w-5 text-blue-600" />
      );

    case "overdue":
      return (
        <AlertCircle className="h-5 w-5 text-red-600" />
      );

    default:
      return (
        <Circle className="h-5 w-5 text-gray-400" />
      );
  }
}

function getStatusText(
  status: Milestone["status"]
) {
  switch (status) {
    case "done":
      return "Terminé";

    case "pending":
      return "En attente";

    case "overdue":
      return "En retard";
  }
}

function getStatusClass(
  status: Milestone["status"]
) {
  switch (status) {
    case "done":
      return "bg-green-100 text-green-700";

    case "pending":
      return "bg-blue-100 text-blue-700";

    case "overdue":
      return "bg-red-100 text-red-700";
  }
}

export default function ProjectTimeline({
  milestones,
  startDate,
  endDate,
  className,
  showDates = true,
}: ProjectTimelineProps) {
  const sortedMilestones = [...milestones].sort(
    (a, b) =>
      new Date(a.date).getTime() -
      new Date(b.date).getTime()
  );

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Jalons du projet
        </CardTitle>

        {startDate && endDate && (
          <p className="text-sm text-gray-500">
            {formatDate(startDate)}
            {" → "}
            {formatDate(endDate)}
          </p>
        )}
      </CardHeader>

      <CardContent>
        {sortedMilestones.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-gray-500">
              Aucun jalon enregistré pour ce projet.
            </p>
          </div>
        ) : (
          <div className="relative">
            {sortedMilestones.map(
              (milestone, index) => {
                const isLast =
                  index ===
                  sortedMilestones.length - 1;

                return (
                  <div
                    key={milestone.id}
                    className="relative flex gap-4"
                  >
                    {!isLast && (
                      <div className="absolute left-[10px] top-7 h-[calc(100%-8px)] w-px bg-gray-200" />
                    )}

                    <div className="relative z-10 mt-1 shrink-0 rounded-full bg-white">
                      {getStatusIcon(
                        milestone.status
                      )}
                    </div>

                    <div
                      className={cn(
                        "min-w-0 flex-1",
                        !isLast && "pb-7"
                      )}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {milestone.title}
                          </h3>

                          {milestone.description && (
                            <p className="mt-1 text-sm text-gray-500">
                              {milestone.description}
                            </p>
                          )}
                        </div>

                        <span
                          className={cn(
                            "w-fit rounded-full px-2 py-1 text-xs font-medium",
                            getStatusClass(
                              milestone.status
                            )
                          )}
                        >
                          {getStatusText(
                            milestone.status
                          )}
                        </span>
                      </div>

                      {showDates && (
                        <p className="mt-2 text-xs text-gray-400">
                          {formatDate(
                            milestone.date
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}