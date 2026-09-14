"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Building2,
  User,
  Mail,
  Phone,
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

import type { Departement } from "./DepartementTable";

interface DepartementDetailsProps {
  department: Departement;
}

export function DepartementDetails({
  department,
}: DepartementDetailsProps) {
  const isActive = department.status === "active";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/administration/departements">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux départements
          </Button>
        </Link>

        <Link
          href={`/administration/departements/${department.id}/edit`}
        >
          <Button>
            <Pencil className="mr-2 h-4 w-4" />
            Modifier
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <Building2 className="h-10 w-10 text-primary" />
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold">
                  {department.name}
                </h1>

                <Badge variant="outline">
                  {department.code}
                </Badge>

                <Badge
                  className={cn(
                    isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  )}
                >
                  {isActive ? "Actif" : "Inactif"}
                </Badge>
              </div>

              <p className="mt-3 text-muted-foreground">
                {department.description ||
                  "Aucune description disponible."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Responsable
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Nom
              </p>
              <p className="font-medium">
                {department.responsable}
              </p>
            </div>

            {department.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    Email
                  </p>
                  <p className="font-medium">
                    {department.email}
                  </p>
                </div>
              </div>
            )}

            {department.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    Téléphone
                  </p>
                  <p className="font-medium">
                    {department.phone}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Effectif
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <Users className="h-7 w-7 text-primary" />
              </div>

              <div>
                <p className="text-3xl font-bold">
                  {department.memberCount}
                </p>
                <p className="text-sm text-muted-foreground">
                  membre
                  {department.memberCount !== 1 ? "s" : ""}
                  {" "}dans ce département
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations administratives</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">
                  Date de création
                </p>
                <p className="font-medium">
                  {department.createdAt}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isActive ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-gray-500" />
              )}

              <div>
                <p className="text-sm text-muted-foreground">
                  Statut
                </p>
                <p className="font-medium">
                  {isActive ? "Département actif" : "Département inactif"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">
                  Code
                </p>
                <p className="font-medium">
                  {department.code}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default DepartementDetails;