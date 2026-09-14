// src/components/beneficiaries/BeneficiaryForm.tsx
"use client";

import { useState } from "react";
import { 
  User, Mail, Phone, Calendar, MapPin, Heart, 
  Check, Plus, Trash2, Target, Award, Users,
  BarChart3, AlertTriangle, GraduationCap, Building2
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Alert } from "@/components/ui/Alert";
import { cn } from "@/lib/utils";

export interface BeneficiaryFormData {
  name: string;
  email: string;
  phone: string;
  age: string;
  gender: string;
  location: string;
  programId: string;
  status: string;
  joinDate: string;
  vulnérabilité: string;
  // Suivi
  objectives: string[];
  skills: string[];
  // Progression
  progress: number;
  performance: number;
  // Évaluations
  evaluationNotes: string;
  // IA
  aiRiskScore?: number;
  aiRecommendations?: string[];
  // Documents
  documents?: string[];
  // Famille (pour les enfants)
  parentName?: string;
  parentPhone?: string;
}

export interface BeneficiaryFormProps {
  initialData?: Partial<BeneficiaryFormData>;
  programs: { id: string; name: string }[];
  onSubmit: (data: BeneficiaryFormData) => Promise<void>;
  onCancel?: () => void;
  className?: string;
  isLoading?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  isEditing?: boolean;
}

const genderOptions = [
  { value: "homme", label: "Homme" },
  { value: "femme", label: "Femme" },
  { value: "enfant", label: "Enfant" },
];

const statusOptions = [
  { value: "actif", label: "Actif" },
  { value: "en_cours", label: "En cours" },
  { value: "termine", label: "Terminé" },
  { value: "en_attente", label: "En attente" },
  { value: "abandon", label: "Abandon" },
];

export function BeneficiaryForm({
  initialData = {},
  programs,
  onSubmit,
  onCancel,
  className,
  isLoading = false,
  submitLabel = "Créer le bénéficiaire",
  cancelLabel = "Annuler",
  isEditing = false,
}: BeneficiaryFormProps) {
  const [formData, setFormData] = useState<BeneficiaryFormData>({
    name: initialData.name || "",
    email: initialData.email || "",
    phone: initialData.phone || "",
    age: initialData.age || "",
    gender: initialData.gender || "",
    location: initialData.location || "",
    programId: initialData.programId || "",
    status: initialData.status || "actif",
    joinDate: initialData.joinDate || "",
    vulnérabilité: initialData.vulnérabilité || "",
    objectives: initialData.objectives || [""],
    skills: initialData.skills || [""],
    progress: initialData.progress || 0,
    performance: initialData.performance || 0,
    evaluationNotes: initialData.evaluationNotes || "",
    aiRiskScore: initialData.aiRiskScore || 0,
    aiRecommendations: initialData.aiRecommendations || [],
    documents: initialData.documents || [],
    parentName: initialData.parentName || "",
    parentPhone: initialData.parentPhone || "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof BeneficiaryFormData, string>>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAISection, setShowAISection] = useState(false);
  const [showFamilySection, setShowFamilySection] = useState(false);

  const isEnfant = formData.gender === "enfant";
  const programOptions = programs.map(p => ({ value: p.id, label: p.name }));

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof BeneficiaryFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Le nom est requis";
    }
    if (!formData.gender) {
      newErrors.gender = "Le genre est requis";
    }
    if (!formData.programId) {
      newErrors.programId = "Le programme est requis";
    }
    if (!formData.joinDate) {
      newErrors.joinDate = "La date d'inscription est requise";
    }
    if (!formData.status) {
      newErrors.status = "Le statut est requis";
    }

    // Validation pour les enfants
    if (isEnfant) {
      if (!formData.parentName?.trim()) {
        newErrors.parentName = "Le nom du parent/tuteur est requis";
      }
      if (!formData.parentPhone?.trim()) {
        newErrors.parentPhone = "Le téléphone du parent/tuteur est requis";
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

  const addField = (field: "objectives" | "skills") => {
    setFormData({ ...formData, [field]: [...formData[field], ""] });
  };

  const removeField = (field: "objectives" | "skills", index: number) => {
    if (formData[field].length > 1) {
      setFormData({
        ...formData,
        [field]: formData[field].filter((_, i) => i !== index),
      });
    }
  };

  const updateField = (field: "objectives" | "skills", index: number, value: string) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData({ ...formData, [field]: newArray });
  };

  // Générer des insights IA
  const generateAIInsights = () => {
    setFormData({
      ...formData,
      aiRiskScore: Math.floor(Math.random() * 100),
      aiRecommendations: [
        "Suivi régulier recommandé pour ce bénéficiaire",
        "Participation active dans les sessions",
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
            id="name"
            label="Nom complet"
            placeholder="Nom du bénéficiaire"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            required
            icon={<User className="h-4 w-4" />}
          />
        </div>

        <Input
          id="email"
          type="email"
          label="Email"
          placeholder="email@exemple.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          icon={<Mail className="h-4 w-4" />}
        />

        <Input
          id="phone"
          type="tel"
          label="Téléphone"
          placeholder="+261 34 12 345 67"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          icon={<Phone className="h-4 w-4" />}
        />

        <Select
          id="gender"
          label="Genre"
          options={genderOptions}
          placeholder="Sélectionnez le genre"
          value={formData.gender}
          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
          error={errors.gender}
          required
        />

        <Input
          id="age"
          type="number"
          label="Âge"
          placeholder="Ex: 25"
          value={formData.age}
          onChange={(e) => setFormData({ ...formData, age: e.target.value })}
          icon={<User className="h-4 w-4" />}
        />

        <Input
          id="location"
          label="Localisation"
          placeholder="Ville / Région"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          icon={<MapPin className="h-4 w-4" />}
        />

        <Select
          id="programId"
          label="Programme"
          options={programOptions}
          placeholder="Sélectionnez un programme"
          value={formData.programId}
          onChange={(e) => setFormData({ ...formData, programId: e.target.value })}
          error={errors.programId}
          required
          icon={<Building2 className="h-4 w-4" />}
        />

        <Select
          id="status"
          label="Statut"
          options={statusOptions}
          placeholder="Sélectionnez un statut"
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          error={errors.status}
          required
        />

        <Input
          id="joinDate"
          type="date"
          label="Date d'inscription"
          value={formData.joinDate}
          onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
          error={errors.joinDate}
          required
          icon={<Calendar className="h-4 w-4" />}
        />

        <div className="md:col-span-2">
          <Textarea
            id="vulnérabilité"
            label="Situation de vulnérabilité (si applicable)"
            placeholder="Décrivez la situation de vulnérabilité..."
            value={formData.vulnérabilité}
            onChange={(e) => setFormData({ ...formData, vulnérabilité: e.target.value })}
            icon={<Heart className="h-4 w-4" />}
            rows={2}
          />
        </div>

        {/* Section Famille pour les enfants */}
        {isEnfant && (
          <div className="md:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFamilySection(!showFamilySection)}
              className="w-full justify-center"
            >
              {showFamilySection ? "Masquer les infos parentales" : "Afficher les infos parentales"}
            </Button>
          </div>
        )}

        {showFamilySection && isEnfant && (
          <>
            <div className="md:col-span-2">
              <h4 className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-3 flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Informations parentales / Tutelle
              </h4>
            </div>
            <div className="md:col-span-2">
              <Input
                id="parentName"
                label="Nom du parent / tuteur"
                placeholder="Nom complet"
                value={formData.parentName}
                onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                error={errors.parentName}
                required
                icon={<User className="h-4 w-4" />}
              />
            </div>
            <Input
              id="parentPhone"
              label="Téléphone du parent / tuteur"
              placeholder="+261 34 12 345 67"
              value={formData.parentPhone}
              onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
              error={errors.parentPhone}
              required
              icon={<Phone className="h-4 w-4" />}
            />
          </>
        )}

        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Objectifs du bénéficiaire</label>
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
                    icon={<Target className="h-4 w-4" />}
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
            <label className="text-sm font-medium">Compétences acquises</label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => addField("skills")}
              className="text-primary"
            >
              <Plus className="h-4 w-4 mr-1" />
              Ajouter une compétence
            </Button>
          </div>
          <div className="space-y-2">
            {formData.skills.map((skill, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    placeholder={`Compétence ${index + 1}`}
                    value={skill}
                    onChange={(e) => updateField("skills", index, e.target.value)}
                    icon={<Award className="h-4 w-4" />}
                  />
                </div>
                {formData.skills.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeField("skills", index)}
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
          <Textarea
            id="evaluationNotes"
            label="Notes d'évaluation"
            placeholder="Commentaires sur la progression, points d'attention..."
            value={formData.evaluationNotes}
            onChange={(e) => setFormData({ ...formData, evaluationNotes: e.target.value })}
            rows={3}
          />
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
            {/* Progression */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Progression (%)</label>
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
            </div>

            {/* Performance */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Performance (%)</label>
                <span className="text-sm font-medium">{formData.performance}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.performance}
                onChange={(e) => setFormData({ ...formData, performance: parseInt(e.target.value) })}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
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
                      <span>Score de risque d'abandon</span>
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