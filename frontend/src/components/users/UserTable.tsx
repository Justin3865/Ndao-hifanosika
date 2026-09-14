// src/components/users/UserTable.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Eye,
  Pencil,
  Trash2,
  UserPlus,
  MoreHorizontal,
  UserCheck,
  UserX,
  ShieldCheck,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

import { UserFilters, type UserFilters as UserFiltersType } from "./UserFilters";

export type UserRole =
  | "admin"
  | "directeur"
  | "rh"
  | "daf"
  | "communication"
  | "coordinateur"
  | "tuteur"
  | "stagiaire";

export type UserStatus =
  | "active"
  | "inactive"
  | "pending";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  department: string;
  position: string;
  status: UserStatus;
  project?: string;
  lastLogin?: string;
  createdAt: string;
}

interface UserTableProps {
  users?: User[];
  onDelete?: (user: User) => void;
}

const defaultUsers: User[] = [
  {
    id: "1",
    name: "Jean Dupont",
    email: "jean.dupont@ndao-hifanosika.org",
    phone: "+261 34 00 000 00",
    role: "admin",
    department: "Direction",
    position: "Administrateur",
    status: "active",
    lastLogin: "07/09/2026 08:42",
    createdAt: "01/08/2026",
  },
  {
    id: "2",
    name: "Marie Razafindrazaka",
    email: "marie.razafindrazaka@ndao-hifanosika.org",
    phone: "+261 34 11 111 11",
    role: "daf",
    department: "DAF",
    position: "Responsable administratif et financier",
    status: "active",
    project: "Otrikasa",
    lastLogin: "07/09/2026 07:30",
    createdAt: "03/08/2026",
  },
  {
    id: "3",
    name: "Faly Andriamanjato",
    email: "faly.andriamanjato@ndao-hifanosika.org",
    phone: "+261 34 22 222 22",
    role: "coordinateur",
    department: "RH",
    position: "Coordinateur de projet",
    status: "active",
    project: "Maison Digitale",
    lastLogin: "06/09/2026 16:20",
    createdAt: "05/08/2026",
  },
  {
    id: "4",
    name: "Tiana Rakotomalala",
    email: "tiana.rakotomalala@ndao-hifanosika.org",
    phone: "+261 34 33 333 33",
    role: "tuteur",
    department: "Communication",
    position: "Tuteur",
    project: "Kids Preneur",
    status: "active",
    lastLogin: "05/09/2026 14:10",
    createdAt: "10/08/2026",
  },
  {
    id: "5",
    name: "Hanta Randrianasolo",
    email: "hanta.randrianasolo@ndao-hifanosika.org",
    role: "stagiaire",
    department: "DSI",
    position: "Stagiaire",
    project: "Ankizy Innov",
    status: "pending",
    lastLogin: "Jamais",
    createdAt: "02/09/2026",
  },
];

export const roleLabels: Record<UserRole, string> = {
  admin: "Administrateur",
  directeur: "Direction",
  rh: "Ressources Humaines",
  daf: "DAF",
  communication: "Communication",
  coordinateur: "Coordinateur",
  tuteur: "Tuteur",
  stagiaire: "Stagiaire",
};

export const statusLabels: Record<UserStatus, string> = {
  active: "Actif",
  inactive: "Inactif",
  pending: "En attente",
};

export const statusColors: Record<UserStatus, string> = {
  active:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  inactive:
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  pending:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
};

export function UserTable({
  users = defaultUsers,
  onDelete,
}: UserTableProps) {
  const [filters, setFilters] = useState<UserFiltersType>({
    search: "",
    role: "all",
    status: "all",
    department: "all",
  });

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const search = filters.search.toLowerCase().trim();

      const matchesSearch =
        !search ||
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        user.department.toLowerCase().includes(search) ||
        user.position.toLowerCase().includes(search);

      const matchesRole =
        filters.role === "all" ||
        user.role === filters.role;

      const matchesStatus =
        filters.status === "all" ||
        user.status === filters.status;

      const matchesDepartment =
        filters.department === "all" ||
        user.department === filters.department;

      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus &&
        matchesDepartment
      );
    });
  }, [users, filters]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Utilisateurs</CardTitle>

            <p className="mt-1 text-sm text-muted-foreground">
              Gestion des comptes, rôles, départements et accès.
            </p>
          </div>

          <Link href="/administration/users/create">
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Nouvel utilisateur
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <UserFilters onFilterChange={setFilters} />

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Utilisateur
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Département
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Fonction
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Rôle
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Statut
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Projet
                </th>

                <th className="px-4 py-3 text-right text-sm font-semibold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                          {user.name
                            .split(" ")
                            .map((part) => part[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>

                        <div>
                          <p className="font-medium">
                            {user.name}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-sm">
                      {user.department}
                    </td>

                    <td className="px-4 py-4 text-sm">
                      {user.position}
                    </td>

                    <td className="px-4 py-4">
                      <Badge variant="outline">
                        <ShieldCheck className="mr-1 h-3 w-3" />
                        {roleLabels[user.role]}
                      </Badge>
                    </td>

                    <td className="px-4 py-4">
                      <Badge
                        variant="outline"
                        className={cn(statusColors[user.status])}
                      >
                        {user.status === "active" ? (
                          <UserCheck className="mr-1 h-3 w-3" />
                        ) : (
                          <UserX className="mr-1 h-3 w-3" />
                        )}

                        {statusLabels[user.status]}
                      </Badge>
                    </td>

                    <td className="px-4 py-4 text-sm">
                      {user.project || "—"}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/administration/users/${user.id}`}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Voir"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>

                        <Link
                          href={`/administration/users/${user.id}/edit`}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>

                        <Button
                          variant="ghost"
                          size="icon"
                          title="Supprimer"
                          onClick={() => onDelete?.(user)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          title="Plus d'actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="text-sm text-muted-foreground">
          {filteredUsers.length} utilisateur(s)
        </p>
      </CardContent>
    </Card>
  );
}

export default UserTable;