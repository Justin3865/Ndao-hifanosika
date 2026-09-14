// src/components/users/UserForm.tsx
"use client";

import { useState } from "react";
import {
  User,
  Mail,
  Lock,
  Building2,
  Shield,
  Phone,
  Briefcase,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { cn } from "@/lib/utils";

import type {
  User,
  UserRole,
  UserStatus,
} from "./UserTable";

export interface UserFormData {
  name: string;
  email: string;
  password?: string;
  phone: string;
  role: UserRole | "";
  department: string;
  position: string;
  project: string;
  status: UserStatus;
}

export interface UserFormProps {
  initialData?: Partial<UserFormData & User>;
  onSubmit: (data: UserFormData) => Promise<void>;
  onCancel?: () => void;
  className?: string;
  isLoading?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
}

const roleOptions = [
  { value: "admin", label: "Administrateur" },
  { value: "directeur", label: "Direction" },
  { value: "rh", label: "Ressources Humaines" },
  { value: "daf", label: "DAF" },
  { value: "communication", label: "Communication" },
  { value: "coordinateur", label: "Coordinateur" },
  { value: "tuteur", label: "Tuteur" },
  { value: "stagiaire", label: "Stagiaire" },
];

const departmentOptions = [
  { value: "Direction", label: "Direction" },
  { value: "DSI", label: "DSI" },
  { value: "DAF", label: "DAF" },
  { value: "RH", label: "RH" },
  { value: "Communication", label: "Communication" },
];

const projectOptions = [
  { value: "none", label: "Aucun projet spécifique" },
  { value: "Maison Digitale", label: "Maison Digitale" },
  { value: "Kids Preneur", label: "Kids Preneur" },
  { value: "Ankizy Innov", label: "Ankizy Innov" },
  { value: "Otrikasa", label: "Otrikasa" },
];

const statusOptions = [
  { value: "active", label: "Actif" },
  { value: "inactive", label: "Inactif" },
  { value: "pending", label: "En attente" },
];

export function UserForm({
  initialData = {},
  onSubmit,
  onCancel,
  className,
  isLoading = false,
  submitLabel = "Créer l'utilisateur",
  cancelLabel = "Annuler",
}: UserFormProps) {
  const [showPassword, setShowPassword] =
    useState(false);

  const [formData, setFormData] =
    useState<UserFormData>({
      name: initialData.name || "",
      email: initialData.email || "",
      password: "",
      phone: initialData.phone || "",
      role: initialData.role || "",
      department: initialData.department || "",
      position: initialData.position || "",
      project: initialData.project || "none",
      status: initialData.status || "active",
    });

  const [errors, setErrors] = useState<
    Partial<Record<keyof UserFormData, string>>
  >({});

  const [generalError, setGeneralError] =
    useState<string | null>(null);

  const isEditMode = Boolean(initialData.id);

  const updateField = <K extends keyof UserFormData>(
    key: K,
    value: UserFormData[K]
  ) => {
    setFormData((current) => ({
      ...current,
      [key]: value,
    }));

    setErrors((current) => ({
      ...current,
      [key]: undefined,
    }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<
      Record<keyof UserFormData, string>
    > = {};

    if (!formData.name.trim()) {
      newErrors.name = "Le nom est requis.";
    }

    if (!formData.email.trim()) {
      newErrors.email = "L'email est requis.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        formData.email
      )
    ) {
      newErrors.email = "Email invalide.";
    }

    if (!formData.role) {
      newErrors.role = "Le rôle est requis.";
    }

    if (!formData.department) {
      newErrors.department =
        "Le département est requis.";
    }

    if (
      !isEditMode &&
      (!formData.password ||
        formData.password.length < 8)
    ) {
      newErrors.password =
        "Le mot de passe doit contenir au moins 8 caractères.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setGeneralError(null);

    if (!validate()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch {
      setGeneralError(
        "Une erreur est survenue. Veuillez réessayer."
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("space-y-6", className)}
    >
      {generalError && (
        <Alert variant="danger">
          {generalError}
        </Alert>
      )}

      {/* Informations personnelles */}
      <div className="rounded-xl border bg-card p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold">
            Informations personnelles
          </h2>

          <p className="text-sm text-muted-foreground">
            Identité et coordonnées de l'utilisateur.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <Input
              id="name"
              label="Nom complet"
              placeholder="Jean Rakoto"
              value={formData.name}
              onChange={(e) =>
                updateField("name", e.target.value)
              }
              error={errors.name}
              required
              icon={<User className="h-4 w-4" />}
            />
          </div>

          <Input
            id="email"
            type="email"
            label="Email"
            placeholder="jean@ndao-hifanosika.org"
            value={formData.email}
            onChange={(e) =>
              updateField("email", e.target.value)
            }
            error={errors.email}
            required
            icon={<Mail className="h-4 w-4" />}
          />

          <Input
            id="phone"
            type="tel"
            label="Téléphone"
            placeholder="+261 34 12 345 67"
            value={formData.phone}
            onChange={(e) =>
              updateField("phone", e.target.value)
            }
            icon={<Phone className="h-4 w-4" />}
          />

          {!isEditMode && (
            <div className="md:col-span-2">
              <Input
                id="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                label="Mot de passe"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) =>
                  updateField(
                    "password",
                    e.target.value
                  )
                }
                error={errors.password}
                required
                helper="Minimum 8 caractères"
                icon={
                  <Lock className="h-4 w-4" />
                }
                rightElement={
                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (value) => !value
                      )
                    }
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* Organisation et accès */}
      <div className="rounded-xl border bg-card p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold">
            Organisation et accès
          </h2>

          <p className="text-sm text-muted-foreground">
            Département, fonction, rôle et programme
            d'affectation.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Select
            id="department"
            label="Département"
            options={departmentOptions}
            placeholder="Sélectionnez un département"
            value={formData.department}
            onChange={(e) =>
              updateField(
                "department",
                e.target.value
              )
            }
            error={errors.department}
            required
            icon={
              <Building2 className="h-4 w-4" />
            }
          />

          <Select
            id="role"
            label="Rôle"
            options={roleOptions}
            placeholder="Sélectionnez un rôle"
            value={formData.role}
            onChange={(e) =>
              updateField(
                "role",
                e.target.value as UserRole
              )
            }
            error={errors.role}
            required
            icon={
              <Shield className="h-4 w-4" />
            }
          />

          <Input
            id="position"
            label="Poste / Fonction"
            placeholder="Ex: Coordinateur de projet"
            value={formData.position}
            onChange={(e) =>
              updateField(
                "position",
                e.target.value
              )
            }
            icon={
              <Briefcase className="h-4 w-4" />
            }
          />

          <Select
            id="project"
            label="Projet / Programme"
            options={projectOptions}
            value={formData.project}
            onChange={(e) =>
              updateField(
                "project",
                e.target.value
              )
            }
          />

          {isEditMode && (
            <Select
              id="status"
              label="Statut du compte"
              options={statusOptions}
              value={formData.status}
              onChange={(e) =>
                updateField(
                  "status",
                  e.target.value as UserStatus
                )
              }
            />
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 border-t border-border/50 pt-4 sm:flex-row">
        <Button
          type="submit"
          fullWidth
          isLoading={isLoading}
          loadingText="Enregistrement..."
          leftIcon={
            <Check className="h-4 w-4" />
          }
        >
          {submitLabel}
        </Button>

        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            fullWidth
          >
            {cancelLabel}
          </Button>
        )}
      </div>
    </form>
  );
}

export default UserForm;