"use client";

import Link from "next/link";

import {
  ArrowLeft,
  Pencil,
  Calendar,
  Users,
  UserRound,
  Wallet,
  Target,
  UserCircle,
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

import type {
  Project,
  ProjectStatus,
} from "./ProjectTable";

import ProjectBudget from "./ProjectBudget";
import ProjectProgress from "./ProjectProgress";
import ProjectTimeline from "./ProjectTimeline";

interface ProjectDetailsProps {
  project: Project;
  onEdit?: () => void;
}

function statusLabel(status: ProjectStatus) {
  switch (status) {
    case "planifie":
      return "Planifié";

    case "en_cours":
      return "En cours";

    case "cloture":
      return "Clôturé";
  }
}

function statusClass(status: ProjectStatus) {
  switch (status) {
    case "planifie":
      return "bg-blue-100 text-blue-700";

    case "en_cours":
      return "bg-green-100 text-green-700";

    case "cloture":
      return "bg-gray-100 text-gray-700";
  }
}

function formatDate(date?: string) {
  if (!date) return "-";

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

export default function ProjectDetails({
  project,
  onEdit,
}: ProjectDetailsProps) {
  const spent = project.spent ?? 0;

  const remaining = Math.max(
    0,
    project.budget - spent
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/projects">
          <Button
            type="button"
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux projets
          </Button>
        </Link>

        <Link
          href={`/projects/${project.id}/edit`}
        >
          <Button
            type="button"
            onClick={onEdit}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Modifier
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <Badge
                  className={cn(
                    statusClass(project.status)
                  )}
                >
                  {statusLabel(project.status)}
                </Badge>

                <span className="text-sm text-gray-500">
                  Projet #{project.id}
                </span>
              </div>

              <h1 className="text-2xl font-bold text-gray-900">
                {project.name}
              </h1>

              <p className="mt-2 max-w-3xl text-gray-600">
                {project.description}
              </p>
            </div>

            <div className="min-w-[180px]">
              <ProjectProgress
                progress={project.progress}
                status={project.status}
                variant="circle"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-lg bg-blue-100 p-3">
              <Users className="h-5 w-5 text-blue-700" />
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Membres
              </p>

              <p className="text-xl font-bold">
                {project.members}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-lg bg-green-100 p-3">
              <UserRound className="h-5 w-5 text-green-700" />
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Bénéficiaires
              </p>

              <p className="text-xl font-bold">
                {project.beneficiaries}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-lg bg-blue-100 p-3">
              <Wallet className="h-5 w-5 text-blue-700" />
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Budget
              </p>

              <p className="text-lg font-bold">
                {new Intl.NumberFormat("fr-MG", {
                  style: "currency",
                  currency: project.currency ?? "MGA",
                  maximumFractionDigits: 0,
                }).format(project.budget)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-lg bg-orange-100 p-3">
              <UserCircle className="h-5 w-5 text-orange-700" />
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Responsable
              </p>

              <p className="font-bold">
                {project.responsible ?? "-"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              Informations du projet
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="flex items-start gap-3">
              <Calendar className="mt-1 h-5 w-5 text-gray-400" />

              <div>
                <p className="text-sm text-gray-500">
                  Période
                </p>

                <p className="font-medium">
                  {formatDate(project.startDate)}
                  {" → "}
                  {formatDate(project.endDate)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Bailleur / partenaire
              </p>

              <p className="mt-1 font-medium">
                {project.donor}
              </p>
            </div>

            {/* AVANCEMENT - BLEU */}
            <div>
              <p className="text-sm text-gray-500">
                Avancement
              </p>

              <div className="mt-2">
                <ProjectProgress
                  progress={project.progress}
                  status={project.status}
                  variant="bar"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CONSOMMATION DU PROJET */}
        <ProjectBudget
          total={project.budget}
          spent={spent}
          remaining={remaining}
          currency={project.currency ?? "MGA"}
          showDetails
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Objectifs du projet
          </CardTitle>
        </CardHeader>

        <CardContent>
          {project.objectives.length === 0 ? (
            <p className="text-sm text-gray-500">
              Aucun objectif enregistré.
            </p>
          ) : (
            <ol className="space-y-3">
              {project.objectives.map(
                (objective, index) => (
                  <li
                    key={`${project.id}-objective-${index}`}
                    className="flex gap-3"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                      {index + 1}
                    </span>

                    <span className="pt-1 text-gray-700">
                      {objective}
                    </span>
                  </li>
                )
              )}
            </ol>
          )}
        </CardContent>
      </Card>

      {project.milestones &&
        project.milestones.length > 0 && (
          <ProjectTimeline
            milestones={project.milestones}
            startDate={project.startDate}
            endDate={project.endDate}
          />
        )}
    </div>
  );
}