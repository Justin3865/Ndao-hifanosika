"use client";

import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type MilestoneStatus =
  | "done"
  | "pending"
  | "overdue";

interface ProjectMilestone {
  id: string;
  title: string;
  project: string;
  date: string;
  status: MilestoneStatus;
  description: string;
}

const milestones: ProjectMilestone[] = [
  {
    id: "md-1",
    title: "Lancement du programme",
    project: "Maison Digitale",
    date: "2026-01-15",
    status: "done",
    description:
      "Lancement officiel du programme.",
  },
  {
    id: "md-2",
    title: "Évaluation intermédiaire",
    project: "Maison Digitale",
    date: "2026-07-30",
    status: "done",
    description:
      "Évaluation des premiers résultats du programme.",
  },
  {
    id: "kp-1",
    title: "Accompagnement des projets",
    project: "Kids Preneur",
    date: "2026-09-30",
    status: "pending",
    description:
      "Suivi des projets développés par les jeunes.",
  },
  {
    id: "ai-1",
    title: "Présentation finale",
    project: "Ankizy Innov",
    date: "2026-10-15",
    status: "pending",
    description:
      "Présentation et évaluation des projets innovants.",
  },
  {
    id: "ot-1",
    title: "Sélection des initiatives",
    project: "Otrikasa",
    date: "2026-09-30",
    status: "pending",
    description:
      "Sélection des initiatives communautaires.",
  },
];

function statusLabel(
  status: MilestoneStatus
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

function statusClass(
  status: MilestoneStatus
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

function StatusIcon({
  status,
}: {
  status: MilestoneStatus;
}) {
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
  }
}

function formatDate(date: string) {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

export default function ProjectMilestonesPage() {
  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Jalons des projets
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Suivi des principales étapes et échéances
            des projets.
          </p>
        </div>

        <Button type="button">
          <Plus className="mr-2 h-4 w-4" />
          Nouveau jalon
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">
              Jalons
            </p>

            <p className="mt-1 text-2xl font-bold">
              {milestones.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">
              Terminés
            </p>

            <p className="mt-1 text-2xl font-bold">
              {
                milestones.filter(
                  (item) =>
                    item.status === "done"
                ).length
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">
              En attente
            </p>

            <p className="mt-1 text-2xl font-bold">
              {
                milestones.filter(
                  (item) =>
                    item.status === "pending"
                ).length
              }
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Calendrier des jalons
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="relative space-y-0">
            {milestones.map(
              (milestone, index) => {
                const isLast =
                  index === milestones.length - 1;

                return (
                  <div
                    key={milestone.id}
                    className="relative flex gap-4"
                  >
                    {!isLast && (
                      <div className="absolute left-[10px] top-8 h-[calc(100%-8px)] w-px bg-gray-200" />
                    )}

                    <div className="relative z-10 shrink-0 rounded-full bg-white">
                      <StatusIcon
                        status={milestone.status}
                      />
                    </div>

                    <div
                      className={cn(
                        "flex-1",
                        !isLast && "pb-8"
                      )}
                    >
                      <div className="rounded-lg border p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {milestone.title}
                            </h3>

                            <p className="mt-1 text-sm font-medium text-blue-600">
                              {milestone.project}
                            </p>

                            <p className="mt-2 text-sm text-gray-500">
                              {milestone.description}
                            </p>
                          </div>

                          <Badge
                            className={cn(
                              "w-fit",
                              statusClass(
                                milestone.status
                              )
                            )}
                          >
                            {statusLabel(
                              milestone.status
                            )}
                          </Badge>
                        </div>

                        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="h-4 w-4" />

                          {formatDate(
                            milestone.date
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}