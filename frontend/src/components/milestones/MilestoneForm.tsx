// src/components/milestones/MilestoneForm.tsx
"use client";

import { useState } from "react";
import { Target, Calendar, Building2, FileText, Check, Plus, Trash2, Users, Award, BarChart3, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Alert } from "@/components/ui/Alert";
import { cn } from "@/lib/utils";

export interface MilestoneFormData {
  title: string;
  description: string;
  projectId: string;
  targetDate: string;
  actualDate?: string;
  objectives: string[];
  deliverables: string[];
  // Nouveaux champs pour le cahier des charges
  status: "planifie" | "en_cours" | "termine" | "retard";
  progress: number;
  responsibleTeam?: string;
  beneficiariesCount?: number;
  budgetIndicatif?: string;
  budgetSpent?: string;
  aiRiskScore?: number;
  aiRecommendations?: string[];
  // Pour les bénéficiaires
  beneficiaryIds?: string[];
  // Pour les membres
  memberIds?: string[];
  // Documents
  attachments?: string[];
}

export interface MilestoneFormProps {
  initialData?: Partial<MilestoneFormData>;
  projects: { id: string; name: string }[];
  beneficiaries?: { id: string; name: string; program: string }[];
  members?: { id: string; name: string; role: string }[];
  onSubmit: (data: MilestoneFormData) => Promise<void>;
  onCancel?: () => void;
  className?: string;
  isLoading?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  isEditing?: boolean;
}

const statusOptions = [
  { value: "planifie", label: "Planifié" },
  { value: "en_cours", label: "En cours" },
  { value: "termine", label: "Terminé" },
  { value: "retard", label: "En retard" },
];

export function MilestoneForm({
  initialData = {},
  projects,
  beneficiaries = [],
  members = [],
  onSubmit,
  onCancel,
  className,
  isLoading = false,
  submitLabel = "Créer le jalon",
  cancelLabel = "Annuler",
  isEditing = false,
}: MilestoneFormProps) {
  const [formData, setFormData] = useState<MilestoneFormData>({
    title: initialData.title || "",
    description: initialData.description || "",
    projectId: initialData.projectId || "",
    targetDate: initialData.targetDate || "",
    actualDate: initialData.actualDate || "",
    objectives: initialData.objectives || [""],
    deliverables: initialData.deliverables || [""],
    status: initialData.status || "planifie",
    progress: initialData.progress || 0,
    responsibleTeam: initialData.responsibleTeam || "",
    beneficiariesCount: initialData.beneficiariesCount || 0,
    budgetIndicatif: initialData.budgetIndicatif || "",
    budgetSpent: initialData.budgetSpent || "",
    aiRiskScore: initialData.aiRiskScore || 0,
    aiRecommendations: initialData.aiRecommendations || [],
    beneficiaryIds: initialData.beneficiaryIds || [],
    memberIds: initialData.memberIds || [],
    attachments: initialData.attachments || [],
  });
  const [errors, setErrors] = useState<Partial<Record<keyof MilestoneFormData, string>>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAISection, setShowAISection] = useState(false);

  const projectOptions = projects.map(p => ({ value: p.id, label: p.name }));
  const beneficiaryOptions = beneficiaries.map(b => ({ value: b.id, label: `${b.name} (${b.program})` }));
  const memberOptions = members.map(m => ({ value: m.id, label: `${m.name} - ${m.role}` }));

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof MilestoneFormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Le titre est requis";
    }
    if (!formData.description.trim()) {
      newErrors.description = "La description est requise";
    }
    if (!formData.projectId) {
      newErrors.projectId = "Le projet est requis";
    }
    if (!formData.targetDate) {
      newErrors.targetDate = "La date cible est requise";
    }
    if (formData.progress < 0 || formData.progress > 100) {
      newErrors.progress = "La progression doit être entre 0 et 100";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validate()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      setGeneralError("Une erreur est survenue. Veuillez réessayer.");
    }
  };

  const addField = (field: "objectives" | "deliverables") => {
    setFormData({ ...formData, [field]: [...formData[field], ""] });
  };

  const removeField = (field: "objectives" | "deliverables", index: number) => {
    if (formData[field].length > 1) {
      setFormData({
        ...formData,
        [field]: formData[field].filter((_, i) => i !== index),
      });
    }
  };

  const updateField = (field: "objectives" | "deliverables", index: number, value: string) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData({ ...formData, [field]: newArray });
  };

  const addBeneficiary = (id: string) => {
    if (!formData.beneficiaryIds?.includes(id)) {
      setFormData({
        ...formData,
        beneficiaryIds: [...(formData.beneficiaryIds || []), id],
      });
    }
  };

  const removeBeneficiary = (id: string) => {
    setFormData({
      ...formData,
      beneficiaryIds: formData.beneficiaryIds?.filter(b => b !== id) || [],
    });
  };

  const addMember = (id: string) => {
    if (!formData.memberIds?.includes(id)) {
      setFormData({
        ...formData,
        memberIds: [...(formData.memberIds || []), id],
      });
    }
  };

  const removeMember = (id: string) => {
    setFormData({
      ...formData,
      memberIds: formData.memberIds?.filter(m => m !== id) || [],
    });
  };

  // Générer des insights IA (simulation)
  const generateAIInsights = () => {
    setFormData({
      ...formData,
      aiRiskScore: Math.floor(Math.random() * 100),
      aiRecommendations: [
        "Ce jalon est critique pour la réussite du projet",
        "Une attention particulière est nécessaire sur les livrables",
        "Le planning actuel semble réaliste",
      ],
    });
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-6", className)}>
      {generalError && (
        <Alert variant="danger">
          {generalError}
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <Input
            id="title"
            label="Titre du jalon"
            placeholder="Ex: Lancement du programme, Clôture du projet..."
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            error={errors.title}
            required
            icon={<Target className="h-4 w-4" />}
          />
        </div>

        <div className="md:col-span-2">
          <Textarea
            id="description"
            label="Description"
            placeholder="Décrivez le jalon, son importance et les attentes..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            error={errors.description}
            required
            rows={3}
          />
        </div>

        <Select
          id="projectId"
          label="Projet"
          options={projectOptions}
          placeholder="Sélectionnez un projet"
          value={formData.projectId}
          onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
          error={errors.projectId}
          required
          icon={<Building2 className="h-4 w-4" />}
        />

        <Select
          id="status"
          label="Statut"
          options={statusOptions}
          placeholder="Sélectionnez un statut"
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
        />

        <Input
          id="targetDate"
          type="date"
          label="Date cible"
          value={formData.targetDate}
          onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
          error={errors.targetDate}
          required
          icon={<Calendar className="h-4 w-4" />}
        />

        <Input
          id="actualDate"
          type="date"
          label="Date réelle (si terminé)"
          value={formData.actualDate}
          onChange={(e) => setFormData({ ...formData, actualDate: e.target.value })}
        />

        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Progression</label>
            <span className="text-sm font-medium">{formData.progress}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={formData.progress}
            onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          {errors.progress && (
            <p className="text-sm text-red-500 mt-1">{errors.progress}</p>
          )}
        </div>

        <Input
          id="responsibleTeam"
          label="Équipe responsable"
          placeholder="Nom de l'équipe ou responsable"
          value={formData.responsibleTeam}
          onChange={(e) => setFormData({ ...formData, responsibleTeam: e.target.value })}
          icon={<Users className="h-4 w-4" />}
        />

        <Input
          id="beneficiariesCount"
          type="number"
          label="Nombre de bénéficiaires"
          placeholder="0"
          value={formData.beneficiariesCount}
          onChange={(e) => setFormData({ ...formData, beneficiariesCount: parseInt(e.target.value) || 0 })}
          icon={<Users className="h-4 w-4" />}
        />

        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Objectifs du jalon</label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => addField("objectives")}
              className="text-primary"
            >
              <Plus className="h-4 w-4 mr-1" />
              Ajouter un objectif
            </Button>
          </div>
          <div className="space-y-2">
            {formData.objectives.map((objective, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    placeholder={`Objectif ${index + 1}`}
                    value={objective}
                    onChange={(e) => updateField("objectives", index, e.target.value)}
                  />
                </div>
                {formData.objectives.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeField("objectives", index)}
                    className="h-10 w-10 text-muted-foreground hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Livrables attendus</label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => addField("deliverables")}
              className="text-primary"
            >
              <Plus className="h-4 w-4 mr-1" />
              Ajouter un livrable
            </Button>
          </div>
          <div className="space-y-2">
            {formData.deliverables.map((deliverable, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    placeholder={`Livrable ${index + 1}`}
                    value={deliverable}
                    onChange={(e) => updateField("deliverables", index, e.target.value)}
                  />
                </div>
                {formData.deliverables.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeField("deliverables", index)}
                    className="h-10 w-10 text-muted-foreground hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Section Avancée */}
        <div className="md:col-span-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full justify-center"
          >
            {showAdvanced ? "Masquer les options avancées" : "Afficher les options avancées"}
          </Button>
        </div>

        {showAdvanced && (
          <>
            {/* Budget */}
            <div className="md:col-span-2">
              <h4 className="text-sm font-medium mb-3">Budget</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  id="budgetIndicatif"
                  type="number"
                  label="Budget indicatif (Ar)"
                  placeholder="0"
                  value={formData.budgetIndicatif}
                  onChange={(e) => setFormData({ ...formData, budgetIndicatif: e.target.value })}
                  icon={<Building2 className="h-4 w-4" />}
                />
                <Input
                  id="budgetSpent"
                  type="number"
                  label="Budget dépensé (Ar)"
                  placeholder="0"
                  value={formData.budgetSpent}
                  onChange={(e) => setFormData({ ...formData, budgetSpent: e.target.value })}
                />
              </div>
            </div>

            {/* Bénéficiaires */}
            {beneficiaries.length > 0 && (
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Bénéficiaires concernés</label>
                  <Select
                    options={beneficiaryOptions}
                    placeholder="Ajouter un bénéficiaire"
                    onChange={(e) => addBeneficiary(e.target.value)}
                    className="w-48"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.beneficiaryIds?.map((id) => {
                    const beneficiary = beneficiaries.find(b => b.id === id);
                    return beneficiary ? (
                      <div key={id} className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-lg text-sm">
                        <span>{beneficiary.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeBeneficiary(id)}
                          className="h-5 w-5 text-muted-foreground hover:text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* Membres */}
            {members.length > 0 && (
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Membres assignés</label>
                  <Select
                    options={memberOptions}
                    placeholder="Ajouter un membre"
                    onChange={(e) => addMember(e.target.value)}
                    className="w-48"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.memberIds?.map((id) => {
                    const member = members.find(m => m.id === id);
                    return member ? (
                      <div key={id} className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-lg text-sm">
                        <span>{member.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMember(id)}
                          className="h-5 w-5 text-muted-foreground hover:text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* Section IA */}
            <div className="md:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAISection(!showAISection)}
                className="w-full justify-center"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                {showAISection ? "Masquer les insights IA" : "Générer des insights IA"}
              </Button>
            </div>

            {showAISection && (
              <div className="md:col-span-2 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium">Insights Intelligence Artificielle</h4>
                  <Button
                    type="button"
                    size="sm"
                    onClick={generateAIInsights}
                    className="text-xs"
                  >
                    <BarChart3 className="h-3 w-3 mr-1" />
                    Générer
                  </Button>
                </div>
                
                {formData.aiRiskScore > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Score de risque</span>
                      <span className={cn(
                        "font-medium",
                        formData.aiRiskScore > 70 ? "text-red-600" :
                        formData.aiRiskScore > 40 ? "text-yellow-600" :
                        "text-green-600"
                      )}>
                        {formData.aiRiskScore}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={cn(
                          "h-2 rounded-full transition-all",
                          formData.aiRiskScore > 70 ? "bg-red-500" :
                          formData.aiRiskScore > 40 ? "bg-yellow-500" :
                          "bg-green-500"
                        )}
                        style={{ width: `${formData.aiRiskScore}%` }}
                      />
                    </div>
                  </div>
                )}

                {formData.aiRecommendations && formData.aiRecommendations.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Recommandations:</p>
                    <ul className="space-y-1">
                      {formData.aiRecommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-primary">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/50">
        <Button
          type="submit"
          fullWidth
          isLoading={isLoading}
          loadingText="Enregistrement..."
          leftIcon={<Check className="h-4 w-4" />}
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