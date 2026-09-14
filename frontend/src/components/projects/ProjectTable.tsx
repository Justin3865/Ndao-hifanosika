"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Eye,
  Pencil,
  Trash2,
  Search,
  Calendar,
  Users,
  UserRound,
  Wallet,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/Card";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

export type ProjectStatus =
  | "planifie"
  | "en_cours"
  | "cloture";

export interface Milestone {
  id: string;
  title: string;
  date: string;
  status: "done" | "pending" | "overdue";
  description?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  donor: string;

  startDate: string;
  endDate: string;

  status: ProjectStatus;
  progress: number;

  budget: number;
  spent?: number;
  currency?: string;

  members: number;
  beneficiaries: number;

  objectives: string[];

  responsible?: string;

  milestones?: Milestone[];

  createdAt?: string;
  updatedAt?: string;
}

interface ProjectTableProps {
  projects: Project[];

  loading?: boolean;

  onView?: (project: Project) => void;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;

  className?: string;
}

function getStatusLabel(status: ProjectStatus) {
  switch (status) {
    case "planifie":
      return "Planifié";

    case "en_cours":
      return "En cours";

    case "cloture":
      return "Clôturé";

    default:
      return status;
  }
}

function getStatusClass(status: ProjectStatus) {
  switch (status) {
    case "planifie":
      return "bg-blue-100 text-blue-700";

    case "en_cours":
      return "bg-green-100 text-green-700";

    case "cloture":
      return "bg-gray-100 text-gray-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

function formatDate(date: string) {
  if (!date) return "-";

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

export default function ProjectTable({
  projects,
  loading = false,
  onView,
  onEdit,
  onDelete,
  className,
}: ProjectTableProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] =
    useState<ProjectStatus | "all">("all");

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesSearch =
        !query ||
        project.name.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query) ||
        project.donor.toLowerCase().includes(query) ||
        project.responsible
          ?.toLowerCase()
          .includes(query);

      const matchesStatus =
        status === "all" || project.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [projects, search, status]);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

            <Input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Rechercher un projet..."
              className="pl-9"
            />
          </div>

          <select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target.value as
                  | ProjectStatus
                  | "all"
              )
            }
            className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
          >
            <option value="all">
              Tous les statuts
            </option>

            <option value="planifie">
              Planifié
            </option>

            <option value="en_cours">
              En cours
            </option>

            <option value="cloture">
              Clôturé
            </option>
          </select>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-500">
            Chargement des projets...
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <p className="font-medium text-gray-700">
              Aucun projet trouvé
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Modifiez votre recherche ou créez un
              nouveau projet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">
                    Projet
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Bailleur
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Période
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Budget
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Avancement
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Équipe
                  </th>

                  <th className="px-4 py-3 font-medium whitespace-nowrap">
                    Statut
                  </th>

                  <th className="px-4 py-3 text-right font-medium whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredProjects.map((project) => (
                  <tr
                    key={project.id}
                    className="border-b last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-4">
                      <div className="max-w-[250px]">
                        <Link
                          href={`/projects/${project.id}`}
                          className="font-semibold text-gray-900 hover:underline"
                        >
                          {project.name}
                        </Link>

                        <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                          {project.description}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <span className="text-gray-700">
                        {project.donor}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-xs text-gray-600 whitespace-nowrap">
                        <Calendar className="h-4 w-4 shrink-0" />

                        <span>
                          {formatDate(project.startDate)}
                          {" → "}
                          {formatDate(project.endDate)}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <Wallet className="h-4 w-4 shrink-0 text-gray-400" />

                        <span className="font-medium">
                          {formatCurrency(
                            project.budget,
                            project.currency
                          )}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="w-[150px]">
                        <div className="mb-1 flex justify-between text-xs">
                          <span>Progression</span>

                          <span className="font-semibold">
                            {Math.min(
                              100,
                              Math.max(
                                0,
                                project.progress
                              )
                            )}
                            %
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full bg-blue-600 transition-all"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(
                                  0,
                                  project.progress
                                )
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-xs">
                          <Users className="h-4 w-4" />
                          {project.members}
                        </div>

                        <div className="flex items-center gap-1 text-xs">
                          <UserRound className="h-4 w-4" />
                          {project.beneficiaries}
                        </div>
                      </div>
                    </td>

                    {/* =================================
                        STATUT — UNE SEULE LIGNE
                    ================================== */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Badge
                        className={cn(
                          "whitespace-nowrap",
                          getStatusClass(project.status)
                        )}
                      >
                        {getStatusLabel(project.status)}
                      </Badge>
                    </td>

                    {/* =================================
                        ACTIONS
                    ================================== */}
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-1 whitespace-nowrap">
                        <Link
                          href={`/projects/${project.id}`}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title="Voir"
                            onClick={() =>
                              onView?.(project)
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>

                        <Link
                          href={`/projects/${project.id}/edit`}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title="Modifier"
                            onClick={() =>
                              onEdit?.(project)
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Supprimer"
                          onClick={() =>
                            onDelete?.(project)
                          }
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}