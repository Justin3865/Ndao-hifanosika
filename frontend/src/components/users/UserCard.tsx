// src/components/users/UserCard.tsx
"use client";

import Link from "next/link";
import {
  Mail,
  Building2,
  Shield,
  Phone,
  Eye,
  Pencil,
  Trash2,
  Briefcase,
} from "lucide-react";

import {
  Card,
  CardContent,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

import type {
  User,
  UserRole,
  UserStatus,
} from "./UserTable";

export interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
  onView?: (user: User) => void;
  className?: string;
  showActions?: boolean;
}

const roleColors: Record<UserRole, string> = {
  admin:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  directeur:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  rh:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  daf:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  communication:
    "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  coordinateur:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  tuteur:
    "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  stagiaire:
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const roleLabels: Record<UserRole, string> = {
  admin: "Administrateur",
  directeur: "Direction",
  rh: "Ressources Humaines",
  daf: "DAF",
  communication: "Communication",
  coordinateur: "Coordinateur",
  tuteur: "Tuteur",
  stagiaire: "Stagiaire",
};

const statusColors: Record<UserStatus, string> = {
  active:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  inactive:
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  pending:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
};

const statusLabels: Record<UserStatus, string> = {
  active: "Actif",
  inactive: "Inactif",
  pending: "En attente",
};

export function UserCard({
  user,
  onEdit,
  onDelete,
  onView,
  className,
  showActions = true,
}: UserCardProps) {
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md",
        className
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/administration/users/${user.id}`}
                  className="font-semibold hover:text-primary"
                >
                  {user.name}
                </Link>

                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className={roleColors[user.role]}
                  >
                    <Shield className="mr-1 h-3 w-3" />
                    {roleLabels[user.role]}
                  </Badge>

                  <Badge
                    variant="outline"
                    className={statusColors[user.status]}
                  >
                    {statusLabels[user.status]}
                  </Badge>
                </div>
              </div>

              {showActions && (
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onView?.(user)}
                    title="Voir"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit?.(user)}
                    title="Modifier"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete?.(user)}
                    title="Supprimer"
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                <span className="truncate">
                  {user.email}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5" />
                <span>
                  {user.department}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Briefcase className="h-3.5 w-3.5" />
                <span>
                  {user.position}
                </span>
              </div>

              {user.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{user.phone}</span>
                </div>
              )}

              {user.project && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    Projet :
                  </span>
                  <span>{user.project}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default UserCard;