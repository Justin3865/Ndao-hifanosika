// src/components/members/MemberForm.tsx
"use client";

import { useState } from "react";
import { 
  User, Mail, Phone, Briefcase, Building2, Calendar, BookOpen, 
  Target, Check, Plus, Trash2, GraduationCap, Users, Award, 
  BarChart3, AlertTriangle, FileText 
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Alert } from "@/components/ui/Alert";
import { cn } from "@/lib/utils";

export interface MemberFormData {
  name: string;
  email: string;
  phone: string;
  position: string;
  departmentId: string;
  type: string;
  joinDate: string;
  skills: string[];
  objectives: string[];
  // Nouveaux champs
  status: "actif" | "inactif" | "en_conge";
  // Pour les stagiaires
  internshipLevel?: "L3" | "M2";
  tutor?: string;
  establishment?: string;
  internshipSubject?: string;
  internshipStartDate?: string;
  internshipEndDate?: string;
  evaluationGrid?: string;
  // Performance
  performance?: number;
  // Projets assignés
  projectIds?: string[];
  // IA
  aiPerformanceScore?: number;
  aiRiskScore?: number;
  aiRecommendations?: string[];
}

export interface MemberFormProps {
  initialData?: Partial<MemberFormData>;
  departments: { id: string; name: string }[];
  projects?: { id: string; name: string }[];
  onSubmit: (data: MemberFormData) => Promise<void>;
  onCancel?: () => void;
  className?: string;
  isLoading?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  isEditing?: boolean;
}

const memberTypes = [
  { value: "salarie", label: "Salarié" },
  { value: "stagiaire", label: "Stagiaire" },
  { value: "benevole", label: "Bénévole" },
];

const statusOptions = [
  { value: "actif", label: "Actif" },
  { value: "en_conge", label: "En congé" },
  { value: "inactif", label: "Inactif" },
];

const internshipLevels = [
  { value: "L3", label: "Licence 3 (L3)" },
  { value: "M2", label: "Master 2 (M2)" },
];

export function MemberForm({
  initialData = {},
  departments,
  projects = [],
  onSubmit,
  onCancel,
  className,
  isLoading = false,
  submitLabel = "Créer le membre",
  cancelLabel = "Annuler",
  isEditing = false,
}: MemberFormProps) {
  const [formData, setFormData] = useState<MemberFormData>({
    name: initialData.name || "",
    email: initialData.email || "",
    phone: initialData.phone || "",
    position: initialData.position || "",
    departmentId: initialData.departmentId || "",
    type: initialData.type || "",
    joinDate: initialData.joinDate || "",
    skills: initialData.skills || [""],
    objectives: initialData.objectives || [""],
    status: initialData.status || "actif",
    internshipLevel: initialData.internshipLevel || undefined,
    tutor: initialData.tutor || "",
    establishment: initialData.establishment || "",
    internshipSubject: initialData.internshipSubject || "",
    internshipStartDate: initialData.internshipStartDate || "",
    internshipEndDate: initialData.internshipEndDate || "",
    evaluationGrid: initialData.evaluationGrid || "",
    performance: initialData.performance || 0,
    projectIds: initialData.projectIds || [],
    aiPerformanceScore: initialData.aiPerformanceScore || 0,
    aiRiskScore: initialData.aiRiskScore || 0,
    aiRecommendations: initialData.aiRecommendations || [],
  });
  const [errors, setErrors] = useState<Partial<Record<keyof MemberFormData, string>>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAISection, setShowAISection] = useState(false);

  const isStagiaire = formData.type === "stagiaire";
  const departmentOptions = departments.map(d => ({ value: d.id, label: d.name }));
  const projectOptions = projects.map(p => ({ value: p.id, label: p.name }));

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof MemberFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Le nom est requis";
    }
    if (!formData.email.trim()) {
      newErrors.email = "L'email est requis";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email invalide";
    }
    if (!formData.position.trim()) {
      newErrors.position = "Le poste est requis";
    }
    if (!formData.departmentId) {
      newErrors.departmentId = "Le département est requis";
    }
    if (!formData.type) {
      newErrors.type = "Le type de membre est requis";
    }
    if (!formData.joinDate) {
      newErrors.joinDate = "La date d'arrivée est requise";
    }

    // Validation spécifique pour les stagiaires
    if (isStagiaire) {
      if (!formData.internshipLevel) {
        newErrors.internshipLevel = "Le niveau du stage est requis";
      }
      if (!formData.tutor?.trim()) {
        newErrors.tutor = "Le tuteur est requis";
      }
      if (!formData.establishment?.trim()) {
        newErrors.establishment = "L'établissement est requis";
      }
      if (!formData.internshipStartDate) {
        newErrors.internshipStartDate = "La date de début du stage est requise";
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

  const addField = (field: "skills" | "objectives") => {
    setFormData({ ...formData, [field]: [...formData[field], ""] });
  };

  const removeField = (field: "skills" | "objectives", index: number) => {
    if (formData[field].length > 1) {
      setFormData({
        ...formData,
        [field]: formData[field].filter((_, i) => i !== index),
      });
    }
  };

  const updateField = (field: "skills" | "objectives", index: number, value: string) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData({ ...formData, [field]: newArray });
  };

  const addProject = (id: string) => {
    if (!formData.projectIds?.includes(id)) {
      setFormData({
        ...formData,
        projectIds: [...(formData.projectIds || []), id],
      });
    }
  };

  const removeProject = (id: string) => {
    setFormData({
      ...formData,
      projectIds: formData.projectIds?.filter(p => p !== id) || [],
    });
  };

  // Générer des insights IA
  const generateAIInsights = () => {
    setFormData({
      ...formData,
      aiPerformanceScore: Math.floor(Math.random() * 30) + 60,
      aiRiskScore: Math.floor(Math.random() * 100),
      aiRecommendations: [
        "Performance solide dans les compétences techniques",
        "Opportunité de développement en leadership",
        "Bonnes aptitudes en communication",
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
            placeholder="Jean Rakoto"
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
          placeholder="jean@ndao-hifanosika.org"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          icon={<Phone className="h-4 w-4" />}
        />

        <Input
          id="position"
          label="Poste / Fonction"
          placeholder="Ex: Responsable DSI, Coordinateur..."
          value={formData.position}
          onChange={(e) => setFormData({ ...formData, position: e.target.value })}
          error={errors.position}
          required
          icon={<Briefcase className="h-4 w-4" />}
        />

        <Select
          id="departmentId"
          label="Département"
          options={departmentOptions}
          placeholder="Sélectionnez un département"
          value={formData.departmentId}
          onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
          error={errors.departmentId}
          required
          icon={<Building2 className="h-4 w-4" />}
        />

        <Select
          id="type"
          label="Type de membre"
          options={memberTypes}
          placeholder="Sélectionnez un type"
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          error={errors.type}
          required
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
          id="joinDate"
          type="date"
          label="Date d'arrivée"
          value={formData.joinDate}
          onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
          error={errors.joinDate}
          required
          icon={<Calendar className="h-4 w-4" />}
        />

        {/* Section Stage */}
        {isStagiaire && (
          <>
            <div className="md:col-span-2">
              <h4 className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-3 flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Informations du stage
              </h4>
            </div>
            <Select
              id="internshipLevel"
              label="Niveau du stagiaire"
              options={internshipLevels}
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
              error={errors.internshipStartDate}
              required
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

        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Compétences</label>
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
                    icon={<BookOpen className="h-4 w-4" />}
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
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Objectifs individuels</label>
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
            {/* Performance */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Performance (%)</label>
                <span className="text-sm font-medium">{formData.performance || 0}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.performance || 0}
                onChange={(e) => setFormData({ ...formData, performance: parseInt(e.target.value) })}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            {/* Projets assignés */}
            {projects.length > 0 && (
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Projets assignés</label>
                  <Select
                    options={projectOptions}
                    placeholder="Ajouter un projet"
                    onChange={(e) => addProject(e.target.value)}
                    className="w-48"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.projectIds?.map((id) => {
                    const project = projects.find(p => p.id === id);
                    return project ? (
                      <div key={id} className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-lg text-sm">
                        <span>{project.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeProject(id)}
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
                
                {formData.aiPerformanceScore > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Score de performance</span>
                      <span className="font-medium text-green-600">
                        {formData.aiPerformanceScore}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-green-500"
                        style={{ width: `${formData.aiPerformanceScore}%` }}
                      />
                    </div>
                  </div>
                )}

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