// src/components/users/UserFilters.tsx
"use client";

import { useState } from "react";
import { Search, Filter, X } from "lucide-react";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export interface UserFiltersProps {
  onFilterChange?: (filters: UserFilters) => void;
  className?: string;
  initialFilters?: UserFilters;
}

export interface UserFilters {
  search: string;
  role: string;
  status: string;
  department: string;
}

const roleOptions = [
  { value: "all", label: "Tous les rôles" },
  { value: "admin", label: "Administrateur" },
  { value: "directeur", label: "Direction" },
  { value: "rh", label: "Ressources Humaines" },
  { value: "daf", label: "DAF" },
  { value: "communication", label: "Communication" },
  { value: "coordinateur", label: "Coordinateur" },
  { value: "tuteur", label: "Tuteur" },
  { value: "stagiaire", label: "Stagiaire" },
];

const statusOptions = [
  { value: "all", label: "Tous les statuts" },
  { value: "active", label: "Actif" },
  { value: "inactive", label: "Inactif" },
  { value: "pending", label: "En attente" },
];

const departmentOptions = [
  { value: "all", label: "Tous les départements" },
  { value: "Direction", label: "Direction" },
  { value: "DSI", label: "DSI" },
  { value: "DAF", label: "DAF" },
  { value: "RH", label: "RH" },
  { value: "Communication", label: "Communication" },
];

export function UserFilters({
  onFilterChange,
  className,
  initialFilters = {
    search: "",
    role: "all",
    status: "all",
    department: "all",
  },
}: UserFiltersProps) {
  const [filters, setFilters] =
    useState<UserFilters>(initialFilters);

  const [isExpanded, setIsExpanded] =
    useState(false);

  const handleChange = (
    key: keyof UserFilters,
    value: string
  ) => {
    const newFilters = {
      ...filters,
      [key]: value,
    };

    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const handleReset = () => {
    const resetFilters: UserFilters = {
      search: "",
      role: "all",
      status: "all",
      department: "all",
    };

    setFilters(resetFilters);
    onFilterChange?.(resetFilters);
  };

  const activeFiltersCount =
    Number(filters.role !== "all") +
    Number(filters.status !== "all") +
    Number(filters.department !== "all");

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <Input
            placeholder="Rechercher par nom, email ou fonction..."
            value={filters.search}
            onChange={(e) =>
              handleChange("search", e.target.value)
            }
            icon={<Search className="h-4 w-4" />}
            className="h-10"
          />
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setIsExpanded((value) => !value)
            }
            className="h-10"
          >
            <Filter className="mr-2 h-4 w-4" />

            Filtres

            {activeFiltersCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-1.5 flex h-5 w-5 items-center justify-center p-0 text-[10px]"
              >
                {activeFiltersCount}
              </Badge>
            )}
          </Button>

          {activeFiltersCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleReset}
              className="h-10"
            >
              <X className="mr-2 h-4 w-4" />
              Réinitialiser
            </Button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="grid grid-cols-1 gap-3 border-t border-border/50 pt-3 sm:grid-cols-3">
          <Select
            options={roleOptions}
            value={filters.role}
            onChange={(e) =>
              handleChange("role", e.target.value)
            }
            className="h-10"
          />

          <Select
            options={statusOptions}
            value={filters.status}
            onChange={(e) =>
              handleChange("status", e.target.value)
            }
            className="h-10"
          />

          <Select
            options={departmentOptions}
            value={filters.department}
            onChange={(e) =>
              handleChange("department", e.target.value)
            }
            className="h-10"
          />
        </div>
      )}
    </div>
  );
}

export default UserFilters;