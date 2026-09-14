"use client";

import Link from "next/link";
import {
  Activity,
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

type ActivityStatus =
  | "terminee"
  | "en_cours"
  | "en_attente"
  | "en_retard";

interface ProjectActivity {
  id: string;
  title: string;
  project: string;
  description: string;
  responsible: string;
  startDate: string;
  endDate: string;
  status: ActivityStatus;
  progress: number;
}

const activities: ProjectActivity[] = [
  {
    id: "act-001",
    title: "Formation aux compétences numériques",
    project: "Maison Digitale",
    description:
      "Sessions de formation destinées aux bénéficiaires.",
    responsible: "Coordinateur Maison Digitale",
    startDate: "2026-06-01",
    endDate: "2026-09-30",
    status: "en_cours",
    progress: 70,
  },
  {
    id: "act-002",
    title: "Atelier entrepreneuriat",
    project: "Kids Preneur",
    description:
      "Ateliers pratiques sur la création de projets.",
    responsible: "Responsable Kids Preneur",
    startDate: "2026-05-01",
    endDate: "2026-08-30",
    status: "terminee",
    progress: 100,
  },
  {
    id: "act-003",
    title: "Accompagnement des projets innovants",
    project: "Ankizy Innov",
    description:
      "Accompagnement des équipes sélectionnées.",
    responsible: "Responsable Ankizy Innov",
    startDate: "2026-07-01",
    endDate: "2026-10-01",
    status: "en_cours",
    progress: 65,
  },
  {
    id: "act-004",
    title: "Identification des initiatives",
    project: "Otrikasa",
    description:
      "Identification des initiatives communautaires.",
    responsible: "Responsable Otrikasa",
    startDate: "2026-09-15",
    endDate: "2026-10-15",
    status: "en_attente",
    progress: 0,
  },
];

function statusLabel(status: ActivityStatus) {
  switch (status) {
    case "terminee":
      return "Terminée";

    case "en_cours":
      return "En cours";

    case "en_attente":
      return "En attente";

    case "en_retard":
      return "En retard";
  }
}

function statusClass(status: ActivityStatus) {
  switch (status) {
    case "terminee":
      return "bg-green-100 text-green-700";

    case "en_cours":
      return "bg-blue-100 text-blue-700";

    case "en_attente":
      return "bg-gray-100 text-gray-700";

    case "en_retard":
      return "bg-red-100 text-red-700";
  }
}

function StatusIcon({
  status,
}: {
  status: ActivityStatus;
}) {
  if (status === "terminee") {
    return (
      <CheckCircle2 className="h-5 w-5 text-green-600" />
    );
  }

  if (status === "en_retard") {
    return (
      <AlertCircle className="h-5 w-5 text-red-600" />
    );
  }

  return (
    <Clock className="h-5 w-5 text-blue-600" />
  );
}

function formatDate(date: string) {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

export default function ProjectActivitiesPage() {
  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Activités des projets
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Planification et suivi des activités liées
            aux projets.
          </p>
        </div>

        <Button type="button">
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle activité
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">
              Total activités
            </p>

            <p className="mt-1 text-2xl font-bold">
              {activities.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">
              En cours
            </p>

            <p className="mt-1 text-2xl font-bold">
              {
                activities.filter(
                  (item) =>
                    item.status === "en_cours"
                ).length
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">
              Terminées
            </p>

            <p className="mt-1 text-2xl font-bold">
              {
                activities.filter(
                  (item) =>
                    item.status === "terminee"
                ).length
              }
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {activities.map((activity) => (
          <Card key={activity.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="rounded-lg bg-gray-100 p-3">
                    <Activity className="h-5 w-5" />
                  </div>

                  <div>
                    <CardTitle>
                      {activity.title}
                    </CardTitle>

                    <p className="mt-1 text-sm text-gray-500">
                      {activity.project}
                    </p>
                  </div>
                </div>

                <Badge
                  className={cn(
                    statusClass(activity.status)
                  )}
                >
                  {statusLabel(activity.status)}
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              <p className="text-sm text-gray-600">
                {activity.description}
              </p>

              <div className="mt-4 grid gap-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-4 w-4" />

                  {formatDate(activity.startDate)}
                  {" → "}
                  {formatDate(activity.endDate)}
                </div>

                <div>
                  <span className="text-gray-500">
                    Responsable :
                  </span>{" "}
                  <span className="font-medium">
                    {activity.responsible}
                  </span>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-gray-500">
                    Progression
                  </span>

                  <span className="font-semibold">
                    {activity.progress}%
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{
                      width: `${activity.progress}%`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-5">
                <Link
                  href={`/projects/${activity.project
                    .toLowerCase()
                    .replaceAll(" ", "-")}`}
                >
                  <Button
                    type="button"
                    variant="outline"
                  >
                    Voir le projet
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}