"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  Plus,
  Trash2,
  Save,
  X,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Alert } from "@/components/ui/Alert";

import type {
  Project,
  ProjectStatus,
} from "./ProjectTable";

export interface ProjectFormData {
  name: string;
  description: string;
  donor: string;

  startDate: string;
  endDate: string;

  budget: number;

  status: ProjectStatus;

  objectives: string[];

  responsible: string;
}

interface ProjectFormProps {
  initialData?: Partial<Project>;

  onSubmit: (
    data: ProjectFormData
  ) => Promise<void> | void;

  onCancel?: () => void;

  loading?: boolean;

  mode?: "create" | "edit";
}

export default function ProjectForm({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
  mode = "create",
}: ProjectFormProps) {
  // ============================================================
  // STATES
  // ============================================================

  const [name, setName] = useState(
    initialData?.name ?? ""
  );

  const [description, setDescription] = useState(
    initialData?.description ?? ""
  );

  const [donor, setDonor] = useState(
    initialData?.donor ?? ""
  );

  const [startDate, setStartDate] = useState(
    initialData?.startDate ?? ""
  );

  const [endDate, setEndDate] = useState(
    initialData?.endDate ?? ""
  );

  const [budget, setBudget] = useState(
    initialData?.budget ?? 0
  );

  const [status, setStatus] = useState<ProjectStatus>(
    initialData?.status ?? "planifie"
  );

  const [responsible, setResponsible] = useState(
    initialData?.responsible ?? ""
  );

  const [objectives, setObjectives] = useState<string[]>(
    initialData?.objectives?.length
      ? initialData.objectives
      : [""]
  );

  const [errors, setErrors] = useState<
    Record<string, string>
  >({});

  // ============================================================
  // SYNCHRONISATION DES DONNÉES INITIALES
  // ============================================================

  useEffect(() => {
    if (!initialData) {
      return;
    }

    setName(initialData.name ?? "");

    setDescription(
      initialData.description ?? ""
    );

    setDonor(
      initialData.donor ?? ""
    );

    setStartDate(
      initialData.startDate ?? ""
    );

    setEndDate(
      initialData.endDate ?? ""
    );

    setBudget(
      initialData.budget ?? 0
    );

    setStatus(
      initialData.status ?? "planifie"
    );

    setResponsible(
      initialData.responsible ?? ""
    );

    setObjectives(
      initialData.objectives?.length
        ? initialData.objectives
        : [""]
    );
  }, [initialData]);

  // ============================================================
  // OBJECTIFS
  // ============================================================

  function updateObjective(
    index: number,
    value: string
  ) {
    setObjectives((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? value
          : item
      )
    );
  }

  function addObjective() {
    setObjectives((current) => [
      ...current,
      "",
    ]);
  }

  function removeObjective(
    index: number
  ) {
    setObjectives((current) => {
      const updated = current.filter(
        (_, itemIndex) =>
          itemIndex !== index
      );

      return updated.length > 0
        ? updated
        : [""];
    });
  }

  // ============================================================
  // VALIDATION
  // ============================================================

  function validate() {
    const nextErrors: Record<
      string,
      string
    > = {};

    // Nom
    if (!name.trim()) {
      nextErrors.name =
        "Le nom du projet est obligatoire.";
    }

    // Description
    if (!description.trim()) {
      nextErrors.description =
        "La description est obligatoire.";
    }

    // Bailleur
    if (!donor.trim()) {
      nextErrors.donor =
        "Le bailleur est obligatoire.";
    }

    // Date début
    if (!startDate) {
      nextErrors.startDate =
        "La date de début est obligatoire.";
    }

    // Date fin
    if (!endDate) {
      nextErrors.endDate =
        "La date de fin est obligatoire.";
    }

    // Vérification des dates
    if (
      startDate &&
      endDate &&
      new Date(startDate) >
        new Date(endDate)
    ) {
      nextErrors.endDate =
        "La date de fin doit être après la date de début.";
    }

    // Budget
    if (
      Number.isNaN(Number(budget)) ||
      Number(budget) < 0
    ) {
      nextErrors.budget =
        "Le budget ne peut pas être négatif.";
    }

    // Responsable
    if (!responsible.trim()) {
      nextErrors.responsible =
        "Le responsable du projet est obligatoire.";
    }

    // Objectifs
    const validObjectives =
      objectives.filter(
        (objective) =>
          objective.trim().length > 0
      );

    if (
      validObjectives.length === 0
    ) {
      nextErrors.objectives =
        "Ajoutez au moins un objectif.";
    }

    setErrors(nextErrors);

    return (
      Object.keys(nextErrors).length === 0
    );
  }

  // ============================================================
  // SUBMIT
  // ============================================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const isValid = validate();

    if (!isValid) {
      return;
    }

    const data: ProjectFormData = {
      name: name.trim(),

      description:
        description.trim(),

      donor: donor.trim(),

      startDate,

      endDate,

      budget: Number(budget),

      status,

      responsible:
        responsible.trim(),

      objectives:
        objectives
          .map((objective) =>
            objective.trim()
          )
          .filter(Boolean),
    };

    await onSubmit(data);
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* ========================================================
          ERREUR GÉNÉRALE
      ======================================================== */}

      {Object.keys(errors).length > 0 && (
        <Alert variant="danger">
          Veuillez corriger les erreurs
          du formulaire avant de continuer.
        </Alert>
      )}

      {/* ========================================================
          INFORMATIONS GÉNÉRALES
      ======================================================== */}

      <Card>
        <CardHeader>
          <CardTitle>
            Informations générales
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* NOM */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Nom du projet *
            </label>

            <Input
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
              placeholder="Ex. Maison Digitale"
            />

            {errors.name && (
              <p className="mt-1 text-sm text-red-600">
                {errors.name}
              </p>
            )}
          </div>

          {/* DESCRIPTION */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Description *
            </label>

            <Textarea
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              placeholder="Décrivez le projet..."
              rows={5}
            />

            {errors.description && (
              <p className="mt-1 text-sm text-red-600">
                {errors.description}
              </p>
            )}
          </div>

          {/* BAILLEUR + RESPONSABLE */}
          <div className="grid gap-5 md:grid-cols-2">
            {/* BAILLEUR */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Bailleur / partenaire *
              </label>

              <Input
                value={donor}
                onChange={(event) =>
                  setDonor(
                    event.target.value
                  )
                }
                placeholder="Ex. Orange Madagascar"
              />

              {errors.donor && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.donor}
                </p>
              )}
            </div>

            {/* RESPONSABLE */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Responsable *
              </label>

              <Input
                value={responsible}
                onChange={(event) =>
                  setResponsible(
                    event.target.value
                  )
                }
                placeholder="Nom du responsable"
              />

              {errors.responsible && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.responsible}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================
          PLANIFICATION ET BUDGET
      ======================================================== */}

      <Card>
        <CardHeader>
          <CardTitle>
            Planification et budget
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-5 md:grid-cols-3">
            {/* DATE DE DÉBUT */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Date de début *
              </label>

              <Input
                type="date"
                value={startDate}
                onChange={(event) =>
                  setStartDate(
                    event.target.value
                  )
                }
              />

              {errors.startDate && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.startDate}
                </p>
              )}
            </div>

            {/* DATE DE FIN */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Date de fin *
              </label>

              <Input
                type="date"
                value={endDate}
                onChange={(event) =>
                  setEndDate(
                    event.target.value
                  )
                }
              />

              {errors.endDate && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.endDate}
                </p>
              )}
            </div>

            {/* BUDGET */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Budget prévisionnel (MGA) *
              </label>

              <Input
                type="number"
                min="0"
                value={budget}
                onChange={(event) =>
                  setBudget(
                    Number(
                      event.target.value
                    )
                  )
                }
              />

              {errors.budget && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.budget}
                </p>
              )}
            </div>
          </div>

          {/* STATUT */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Statut *
            </label>

            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target
                    .value as ProjectStatus
                )
              }
              className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
            >
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
        </CardContent>
      </Card>

      {/* ========================================================
          OBJECTIFS DU PROJET
      ======================================================== */}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Objectifs du projet
            </CardTitle>

            <Button
              type="button"
              variant="outline"
              onClick={addObjective}
            >
              <Plus className="mr-2 h-4 w-4" />
              Ajouter
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {objectives.map(
            (objective, index) => (
              <div
                key={index}
                className="flex gap-2"
              >
                <Input
                  value={objective}
                  onChange={(event) =>
                    updateObjective(
                      index,
                      event.target.value
                    )
                  }
                  placeholder={`Objectif ${
                    index + 1
                  }`}
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    removeObjective(
                      index
                    )
                  }
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            )
          )}

          {errors.objectives && (
            <p className="text-sm text-red-600">
              {errors.objectives}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ========================================================
          ACTIONS
      ======================================================== */}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {/* ANNULER */}
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            <X className="mr-2 h-4 w-4" />
            Annuler
          </Button>
        )}

        {/* ENREGISTRER */}
        <Button
          type="submit"
          disabled={loading}
        >
          <Save className="mr-2 h-4 w-4" />

          {loading
            ? "Enregistrement..."
            : mode === "edit"
              ? "Enregistrer les modifications"
              : "Créer le projet"}
        </Button>
      </div>
    </form>
  );
}