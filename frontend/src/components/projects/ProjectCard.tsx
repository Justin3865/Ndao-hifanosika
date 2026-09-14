"use client";

import Link from "next/link";

import {
  Calendar,
  Users,
  UserRound,
  Wallet,
  Pencil,
  Trash2,
  Eye,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/Card";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

import type {
  Project,
  ProjectStatus,
} from "./ProjectTable";

interface ProjectCardProps {
  project: Project;

  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  onView?: (project: Project) => void;

  showActions?: boolean;

  className?: string;

  variant?: "default" | "compact";
}

function statusLabel(
  status: ProjectStatus
) {
  switch (status) {
    case "planifie":
      return "Planifié";

    case "en_cours":
      return "En cours";

    case "cloture":
      return "Clôturé";
  }
}

function statusClass(
  status: ProjectStatus
) {
  switch (status) {
    case "planifie":
      return "bg-blue-100 text-blue-700";

    case "en_cours":
      return "bg-green-100 text-green-700";

    case "cloture":
      return "bg-gray-100 text-gray-700";
  }
}

function formatCurrency(
  value: number,
  currency = "MGA"
) {
  return new Intl.NumberFormat("fr-MG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
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
      month: "2-digit",
      year: "numeric",
    }
  ).format(parsed);
}

export default function ProjectCard({
  project,
  onEdit,
  onDelete,
  onView,
  showActions = true,
  className,
  variant = "default",
}: ProjectCardProps) {
  const progress = Math.min(
    100,
    Math.max(0, project.progress)
  );

  return (
    <Card
      className={cn(
        "transition-shadow hover:shadow-md",
        className
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/projects/${project.id}`}
              className="line-clamp-2 text-lg font-bold text-gray-900 hover:underline"
            >
              {project.name}
            </Link>

            <p className="mt-1 text-sm text-gray-500">
              {project.donor}
            </p>
          </div>

          <Badge
            className={cn(
              "shrink-0",
              statusClass(project.status)
            )}
          >
            {statusLabel(project.status)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <p
          className={cn(
            "text-sm text-gray-600",
            variant === "compact"
              ? "line-clamp-2"
              : "line-clamp-3"
          )}
        >
          {project.description}
        </p>

        <div className="mt-5">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-gray-500">
              Avancement
            </span>

            <span className="font-semibold">
              {Math.round(progress)}%
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>

        <div className="mt-5 grid gap-3 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4 text-gray-400" />

            <span>
              {formatDate(project.startDate)}
              {" → "}
              {formatDate(project.endDate)}
            </span>
          </div>

          <div className="flex items-center gap-2 text-gray-600">
            <Wallet className="h-4 w-4 text-gray-400" />

            <span>
              {formatCurrency(
                project.budget,
                project.currency
              )}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-gray-600">
              <Users className="h-4 w-4 text-gray-400" />
              {project.members} membres
            </span>

            <span className="flex items-center gap-2 text-gray-600">
              <UserRound className="h-4 w-4 text-gray-400" />
              {project.beneficiaries} bénéficiaires
            </span>
          </div>
        </div>

        {showActions && (
          <div className="mt-6 flex justify-end gap-2 border-t pt-4">
            <Link
              href={`/projects/${project.id}`}
            >
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  onView?.(project)
                }
              >
                <Eye className="mr-2 h-4 w-4" />
                Voir
              </Button>
            </Link>

            <Link
              href={`/projects/${project.id}/edit`}
            >
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  onEdit?.(project)
                }
              >
                <Pencil className="mr-2 h-4 w-4" />
                Modifier
              </Button>
            </Link>

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                onDelete?.(project)
              }
            >
              <Trash2 className="mr-2 h-4 w-4 text-red-600" />
              Supprimer
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}