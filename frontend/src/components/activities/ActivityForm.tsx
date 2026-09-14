// src/components/activities/ActivityForm.tsx
"use client";

import { useState } from "react";
import { Activity, Calendar, Clock, Users, Building2, FileText, MessageSquare, User, Check, Plus, Trash2, AlertTriangle, BarChart3, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Alert } from "@/components/ui/Alert";
import { cn } from "@/lib/utils";

export interface ActivityFormData {
  title: string;
  description: string;
  projectId: string;
  date: string;
  time: string;
  endTime: string;
  location: string;
  type: string;
  participants: string;
  organizer: string;
  objectives: string[];
  // Nouveaux champs pour le cahier des charges
  deliverables: string[];
  milestones: { title: string; date: string; status: string }[];
  budgetIndicatif: string;
  budgetSpent: string;
  internshipLevel?: "L3" | "M2";
  tutor?: string;
  establishment?: string;
  internshipSubject?: string;
  internshipStartDate?: string;
  internshipEndDate?: string;
  evaluationGrid?: string;
  reportSummary?: string;
  aiRiskScore?: number;
  aiRecommendations?: string[];
}

export interface ActivityFormProps {
  initialData?: Partial<ActivityFormData>;
  projects: { id: string; name: string }[];
  onSubmit: (data: ActivityFormData) => Promise<void>;
  onCancel?: () => void;
  className?: string;
  isLoading?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  isEditing?: boolean;
}

const activityTypes = [
  { value: "formation", label: "Formation" },
  { value: "atelier", label: "Atelier" },
  { value: "reunion", label: "Réunion" },
  { value: "suivi", label: "Suivi" },
  { value: "stage", label: "Stage" },
  { value: "autre", label: "Autre" },
];

const milestoneStatuses = [
  { value: "planifie", label: "Planifié" },
  { value: "en_cours", label: "En cours" },
  { value: "termine", label: "Terminé" },
  { value: "annule", label: "Annulé" },
];

export function ActivityForm({
  initialData = {},
  projects,
  onSubmit,
  onCancel,
  className,
  isLoading = false,
  submitLabel = "Créer l'activité",
  cancelLabel = "Annuler",
  isEditing = false,
}: ActivityFormProps) {
  const [formData, setFormData] = useState<ActivityFormData>({
    title: initialData.title || "",
    description: initialData.description || "",
    projectId: initialData.projectId || "",
    date: initialData.date || "",
    time: initialData.time || "",
    endTime: initialData.endTime || "",
    location: initialData.location || "",
    type: initialData.type || "",
    participants: initialData.participants || "",
    organizer: initialData.organizer || "",
    objectives: initialData.objectives || [""],
    deliverables: initialData.deliverables || [""],
    milestones: initialData.milestones || [{ title: "", date: "", status: "planifie" }],
    budgetIndicatif: initialData.budgetIndicatif || "",
    budgetSpent: initialData.budgetSpent || "",
    internshipLevel: initialData.internshipLevel || undefined,
    tutor: initialData.tutor || "",
    establishment: initialData.establishment || "",
    internshipSubject: initialData.internshipSubject || "",
    internshipStartDate: initialData.internshipStartDate || "",
    internshipEndDate: initialData.internshipEndDate || "",
    evaluationGrid: initialData.evaluationGrid || "",
    reportSummary: initialData.reportSummary || "",
    aiRiskScore: initialData.aiRiskScore || 0,
    aiRecommendations: initialData.aiRecommendations || [],
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ActivityFormData, string>>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAISection, setShowAISection] = useState(false);

  const isStage = formData.type === "stage";
  const projectOptions = projects.map(p => ({ value: p.id, label: p.name }));

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ActivityFormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Le titre est requis";
    }
    if (!formData.description.trim()) {
      newErrors.description = "La description est requise";
    }
    if (!formData.projectId) {
      newErrors.projectId = "Le projet est requis";
    }
    if (!formData.date) {
      newErrors.date = "La date est requise";
    }
    if (!formData.time) {
      newErrors.time = "L'heure de début est requise";
    }
    if (!formData.endTime) {
      newErrors.endTime = "L'heure de fin est requise";
    }
    if (!formData.type) {
      newErrors.type = "Le type d'activité est requis";
    }
    if (!formData.participants || parseInt(formData.participants) <= 0) {
      newErrors.participants = "Le nombre de participants est requis";
    }
    if (!formData.organizer.trim()) {
      newErrors.organizer = "L'organisateur est requis";
    }

    // Validation spécifique pour les stages
    if (isStage) {
      if (!formData.internshipLevel) {
        newErrors.internshipLevel = "Le niveau du stage est requis";
      }
      if (!formData.tutor?.trim()) {
        newErrors.tutor = "Le tuteur est requis";
      }
      if (!formData.establishment?.trim()) {
        newErrors.establishment = "L'établissement est requis";
      }
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

  // Objectives handlers
  const addObjective = () => {
    setFormData({ ...formData, objectives: [...formData.objectives, ""] });
  };

  const removeObjective = (index: number) => {
    if (formData.objectives.length > 1) {
      setFormData({
        ...formData,
        objectives: formData.objectives.filter((_, i) => i !== index),
      });
    }
  };

  const updateObjective = (index: number, value: string) => {
    const newObjectives = [...formData.objectives];
    newObjectives[index] = value;
    setFormData({ ...formData, objectives: newObjectives });
  };

  // Deliverables handlers
  const addDeliverable = () => {
    setFormData({ ...formData, deliverables: [...formData.deliverables, ""] });
  };

  const removeDeliverable = (index: number) => {
    if (formData.deliverables.length > 1) {
      setFormData({
        ...formData,
        deliverables: formData.deliverables.filter((_, i) => i !== index),
      });
    }
  };

  const updateDeliverable = (index: number, value: string) => {
    const newDeliverables = [...formData.deliverables];
    newDeliverables[index] = value;
    setFormData({ ...formData, deliverables: newDeliverables });
  };

  // Milestones handlers
  const addMilestone = () => {
    setFormData({
      ...formData,
      milestones: [...formData.milestones, { title: "", date: "", status: "planifie" }],
    });
  };

  const removeMilestone = (index: number) => {
    if (formData.milestones.length > 1) {
      setFormData({
        ...formData,
        milestones: formData.milestones.filter((_, i) => i !== index),
      });
    }
  };

  const updateMilestone = (index: number, field: string, value: string) => {
    const newMilestones = [...formData.milestones];
    newMilestones[index] = { ...newMilestones[index], [field]: value };
    setFormData({ ...formData, milestones: newMilestones });
  };

  // Generate AI insights (simulation)
  const generateAIInsights = () => {
    setFormData({
      ...formData,
      aiRiskScore: Math.floor(Math.random() * 100),
      aiRecommendations: [
        "Suivi régulier recommandé pour ce bénéficiaire",
        "Participation active observée dans les dernières sessions",
        "Progression positive dans les compétences clés",
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
            label="Titre de l'activité"
            placeholder="Ex: Atelier de formation, Réunion de suivi..."
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            error={errors.title}
            required
            icon={<Activity className="h-4 w-4" />}
          />
        </div>

        <div className="md:col-span-2">
          <Textarea
            id="description"
            label="Description"
            placeholder="Décrivez l'activité, son objectif et son déroulement..."
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
          id="type"
          label="Type d'activité"
          options={activityTypes}
          placeholder="Sélectionnez un type"
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          error={errors.type}
          required
        />

        <Input
          id="date"
          type="date"
          label="Date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          error={errors.date}
          required
          icon={<Calendar className="h-4 w-4" />}
        />

        <Input
          id="time"
          type="time"
          label="Heure de début"
          value={formData.time}
          onChange={(e) => setFormData({ ...formData, time: e.target.value })}
          error={errors.time}
          required
          icon={<Clock className="h-4 w-4" />}
        />

        <Input
          id="endTime"
          type="time"
          label="Heure de fin"
          value={formData.endTime}
          onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
          error={errors.endTime}
          required
          icon={<Clock className="h-4 w-4" />}
        />

        <div className="md:col-span-2">
          <Input
            id="location"
            label="Lieu"
            placeholder="Ex: Salle de conférence, En ligne..."
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            icon={<MessageSquare className="h-4 w-4" />}
          />
        </div>

        <Input
          id="participants"
          type="number"
          label="Nombre de participants"
          placeholder="0"
          value={formData.participants}
          onChange={(e) => setFormData({ ...formData, participants: e.target.value })}
          error={errors.participants}
          required
          icon={<Users className="h-4 w-4" />}
        />

        <Input
          id="organizer"
          label="Organisateur"
          placeholder="Nom de l'organisateur"
          value={formData.organizer}
          onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
          error={errors.organizer}
          required
          icon={<User className="h-4 w-4" />}
        />

        {/* Section Stage */}
        {isStage && (
          <>
            <Select
              id="internshipLevel"
              label="Niveau du stagiaire"
              options={[
                { value: "L3", label: "Licence 3 (L3)" },
                { value: "M2", label: "Master 2 (M2)" },
              ]}
              placeholder="Sélectionnez le niveau"
              value={formData.internshipLevel || ""}
              onChange={(e) => setFormData({ ...formData, internshipLevel: e.target.value as "L3" | "M2" })}
              error={errors.internshipLevel}
              required
            />
            <Input
              id="tutor"
              label="Tuteur de stage"
              placeholder="Nom du tuteur"
              value={formData.tutor}
              onChange={(e) => setFormData({ ...formData, tutor: e.target.value })}
              error={errors.tutor}
              required
            />
            <div className="md:col-span-2">
              <Input
                id="establishment"
                label="Établissement"
                placeholder="Nom de l'établissement"
                value={formData.establishment}
                onChange={(e) => setFormData({ ...formData, establishment: e.target.value })}
                error={errors.establishment}
                required
              />
            </div>
            <div className="md:col-span-2">
              <Input
                id="internshipSubject"
                label="Sujet du stage"
                placeholder="Sujet ou thème du stage"
                value={formData.internshipSubject}
                onChange={(e) => setFormData({ ...formData, internshipSubject: e.target.value })}
              />
            </div>
            <Input
              id="internshipStartDate"
              type="date"
              label="Date de début du stage"
              value={formData.internshipStartDate}
              onChange={(e) => setFormData({ ...formData, internshipStartDate: e.target.value })}
            />
            <Input
              id="internshipEndDate"
              type="date"
              label="Date de fin du stage"
              value={formData.internshipEndDate}
              onChange={(e) => setFormData({ ...formData, internshipEndDate: e.target.value })}
            />
            <div className="md:col-span-2">
              <Textarea
                id="evaluationGrid"
                label="Grille d'évaluation"
                placeholder="Critères d'évaluation du stage..."
                value={formData.evaluationGrid}
                onChange={(e) => setFormData({ ...formData, evaluationGrid: e.target.value })}
                rows={3}
              />
            </div>
          </>
        )}

        {/* Section Objectifs */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Objectifs de l'activité</label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addObjective}
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
                    onChange={(e) => updateObjective(index, e.target.value)}
                  />
                </div>
                {formData.objectives.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeObjective(index)}
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

            {/* Deliverables */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Livrables attendus</label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addDeliverable}
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
                        onChange={(e) => updateDeliverable(index, e.target.value)}
                        icon={<FileText className="h-4 w-4" />}
                      />
                    </div>
                    {formData.deliverables.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDeliverable(index)}
                        className="h-10 w-10 text-muted-foreground hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Milestones */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Jalons (Milestones)</label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addMilestone}
                  className="text-primary"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter un jalon
                </Button>
              </div>
              <div className="space-y-3">
                {formData.milestones.map((milestone, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg">
                    <Input
                      placeholder="Titre du jalon"
                      value={milestone.title}
                      onChange={(e) => updateMilestone(index, "title", e.target.value)}
                    />
                    <Input
                      type="date"
                      placeholder="Date"
                      value={milestone.date}
                      onChange={(e) => updateMilestone(index, "date", e.target.value)}
                    />
                    <div className="flex items-center gap-2">
                      <Select
                        options={milestoneStatuses}
                        value={milestone.status}
                        onChange={(e) => updateMilestone(index, "status", e.target.value)}
                        className="flex-1"
                      />
                      {formData.milestones.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMilestone(index)}
                          className="h-10 w-10 text-muted-foreground hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

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
              <>
                <div className="md:col-span-2 p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium">Insights Intelligence Artificielle</h4>
                    <Button
                      type="button"
                      size="sm"
                      onClick={generateAIInsights}
                      className="text-xs"
                    >
                      <Download className="h-3 w-3 mr-1" />
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

                <div className="md:col-span-2">
                  <Textarea
                    id="reportSummary"
                    label="Synthèse du rapport"
                    placeholder="Synthèse narrative des résultats..."
                    value={formData.reportSummary}
                    onChange={(e) => setFormData({ ...formData, reportSummary: e.target.value })}
                    rows={4}
                  />
                </div>
              </>
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