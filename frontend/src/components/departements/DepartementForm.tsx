"use client";

import { useState } from "react";
import {
  Building2,
  FileText,
  User,
  Mail,
  Phone,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";

import type {
  Departement,
  DepartementStatus,
} from "./DepartementTable";

export interface DepartementFormData {
  name: string;
  code: string;
  description: string;
  responsable: string;
  email: string;
  phone: string;
  status: DepartementStatus;
}

interface DepartementFormProps {
  initialData?: Partial<Departement>;
  onSubmit?: (data: DepartementFormData) => void;
  onCancel?: () => void;
}

const defaultData: DepartementFormData = {
  name: "",
  code: "",
  description: "",
  responsable: "",
  email: "",
  phone: "",
  status: "active",
};

export function DepartementForm({
  initialData,
  onSubmit,
  onCancel,
}: DepartementFormProps) {
  const [formData, setFormData] = useState<DepartementFormData>({
    name: initialData?.name ?? defaultData.name,
    code: initialData?.code ?? defaultData.code,
    description:
      initialData?.description ?? defaultData.description,
    responsable:
      initialData?.responsable ?? defaultData.responsable,
    email: initialData?.email ?? defaultData.email,
    phone: initialData?.phone ?? defaultData.phone,
    status: initialData?.status ?? defaultData.status,
  });

  const [error, setError] = useState("");

  const isEditMode = Boolean(initialData?.id);

  const updateField = <K extends keyof DepartementFormData>(
    field: K,
    value: DepartementFormData[K]
  ) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Le nom du département est obligatoire.");
      return;
    }

    if (!formData.code.trim()) {
      setError("Le code du département est obligatoire.");
      return;
    }

    if (!formData.responsable.trim()) {
      setError("Le responsable est obligatoire.");
      return;
    }

    if (
      formData.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    ) {
      setError("Veuillez saisir une adresse email valide.");
      return;
    }

    onSubmit?.(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          {error}
        </Alert>
      )}

      <div className="rounded-xl border bg-card p-6">
        <div className="mb-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Building2 className="h-5 w-5" />
            Informations du département
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            {isEditMode
              ? "Modifier les informations du département."
              : "Créer un nouveau département de l'organisation."}
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Nom du département *
            </label>

            <Input
              value={formData.name}
              onChange={(e) =>
                updateField("name", e.target.value)
              }
              placeholder="Ex. Direction"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Code *
            </label>

            <Input
              value={formData.code}
              onChange={(e) =>
                updateField(
                  "code",
                  e.target.value.toUpperCase()
                )
              }
              placeholder="Ex. DIR"
              maxLength={10}
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4" />
              Description
            </label>

            <textarea
              value={formData.description}
              onChange={(e) =>
                updateField("description", e.target.value)
              }
              placeholder="Décrire le rôle et les responsabilités du département..."
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <div className="mb-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <User className="h-5 w-5" />
            Responsable
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Personne responsable du département.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Nom du responsable *
            </label>

            <Input
              value={formData.responsable}
              onChange={(e) =>
                updateField("responsable", e.target.value)
              }
              placeholder="Nom complet"
            />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4" />
              Email
            </label>

            <Input
              type="email"
              value={formData.email}
              onChange={(e) =>
                updateField("email", e.target.value)
              }
              placeholder="responsable@ndaohifanosika.org"
            />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Phone className="h-4 w-4" />
              Téléphone
            </label>

            <Input
              value={formData.phone}
              onChange={(e) =>
                updateField("phone", e.target.value)
              }
              placeholder="+261 34 00 000 00"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">
            Statut
          </h2>
        </div>

        <div className="max-w-md">
          <label className="mb-2 block text-sm font-medium">
            Statut du département
          </label>

          <Select
            value={formData.status}
            onChange={(e) =>
              updateField(
                "status",
                e.target.value as DepartementStatus
              )
            }
          >
            <option value="active">Actif</option>
            <option value="inactive">Inactif</option>
          </Select>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Annuler
          </Button>
        )}

        <Button type="submit">
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {isEditMode
            ? "Enregistrer les modifications"
            : "Créer le département"}
        </Button>
      </div>
    </form>
  );
}

export default DepartementForm;