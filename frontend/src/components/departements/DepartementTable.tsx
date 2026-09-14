"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Building2,
  Eye,
  Pencil,
  Trash2,
  Plus,
  Users,
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

export type DepartementStatus = "active" | "inactive";

export interface Departement {
  id: string;
  name: string;
  code: string;
  description: string;
  responsable: string;
  email?: string;
  phone?: string;
  status: DepartementStatus;
  memberCount: number;
  createdAt: string;
  updatedAt?: string;
}

interface DepartementTableProps {
  departments?: Departement[];
  onDelete?: (department: Departement) => void;
}

const defaultDepartments: Departement[] = [
  {
    id: "1",
    name: "Direction",
    code: "DIR",
    description:
      "Pilotage stratégique, supervision générale et coordination des activités de l'organisation.",
    responsable: "Jean Dupont",
    email: "direction@ndaohifanosika.org",
    phone: "+261 34 00 000 01",
    status: "active",
    memberCount: 4,
    createdAt: "2026-01-10",
  },
  {
    id: "2",
    name: "DSI",
    code: "DSI",
    description:
      "Gestion des systèmes d'information, infrastructures numériques et solutions informatiques.",
    responsable: "Faly Andriamanjato",
    email: "dsi@ndaohifanosika.org",
    phone: "+261 34 00 000 02",
    status: "active",
    memberCount: 6,
    createdAt: "2026-01-12",
  },
  {
    id: "3",
    name: "DAF",
    code: "DAF",
    description:
      "Gestion administrative, financière, budgétaire et comptable.",
    responsable: "Tiana Rakotomalala",
    email: "daf@ndaohifanosika.org",
    phone: "+261 34 00 000 03",
    status: "active",
    memberCount: 5,
    createdAt: "2026-01-15",
  },
  {
    id: "4",
    name: "RH",
    code: "RH",
    description:
      "Gestion des ressources humaines, recrutement, suivi et accompagnement du personnel.",
    responsable: "Marie Razafindrazaka",
    email: "rh@ndaohifanosika.org",
    phone: "+261 34 00 000 04",
    status: "active",
    memberCount: 7,
    createdAt: "2026-01-18",
  },
  {
    id: "5",
    name: "Communication",
    code: "COM",
    description:
      "Communication institutionnelle, visibilité des projets et gestion des contenus.",
    responsable: "Hanta Randrianasolo",
    email: "communication@ndaohifanosika.org",
    phone: "+261 34 00 000 05",
    status: "active",
    memberCount: 4,
    createdAt: "2026-01-20",
  },
];

const statusLabels: Record<DepartementStatus, string> = {
  active: "Actif",
  inactive: "Inactif",
};

export function DepartementTable({
  departments = defaultDepartments,
  onDelete,
}: DepartementTableProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | DepartementStatus>("all");

  const filteredDepartments = useMemo(() => {
    return departments.filter((department) => {
      const searchValue = search.toLowerCase().trim();

      const matchesSearch =
        !searchValue ||
        department.name.toLowerCase().includes(searchValue) ||
        department.code.toLowerCase().includes(searchValue) ||
        department.responsable.toLowerCase().includes(searchValue);

      const matchesStatus =
        status === "all" || department.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [departments, search, status]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Départements
            </CardTitle>

            <p className="mt-1 text-sm text-muted-foreground">
              Gestion des départements et de leurs responsables.
            </p>
          </div>

          <Link href="/administration/departements/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau département
            </Button>
          </Link>
        </div>

        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un département..."
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />

          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as "all" | DepartementStatus)
            }
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
          </select>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="px-4 py-3">Département</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Responsable</th>
                <th className="px-4 py-3">Membres</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredDepartments.map((department) => (
                <tr
                  key={department.id}
                  className="border-b transition-colors hover:bg-muted/50"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>

                      <div>
                        <p className="font-medium">{department.name}</p>
                        <p className="max-w-[300px] truncate text-xs text-muted-foreground">
                          {department.description}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <Badge variant="outline">
                      {department.code}
                    </Badge>
                  </td>

                  <td className="px-4 py-4">
                    <p className="font-medium">
                      {department.responsable}
                    </p>

                    {department.email && (
                      <p className="text-xs text-muted-foreground">
                        {department.email}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{department.memberCount}</span>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <Badge
                      className={cn(
                        department.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      )}
                    >
                      {statusLabels[department.status]}
                    </Badge>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/administration/departements/${department.id}`}
                      >
                        <Button variant="outline" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>

                      <Link
                        href={`/administration/departements/${department.id}/edit`}
                      >
                        <Button variant="outline" size="icon">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>

                      {onDelete && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => onDelete(department)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredDepartments.length === 0 && (
            <div className="py-12 text-center">
              <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-medium">
                Aucun département trouvé
              </p>
              <p className="text-sm text-muted-foreground">
                Modifiez vos critères de recherche.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default DepartementTable;