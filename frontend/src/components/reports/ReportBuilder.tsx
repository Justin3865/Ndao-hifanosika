// src/components/reports/ReportBuilder.tsx
"use client";

import { useState } from "react";
import { FileText, Calendar, Building2, Users, BarChart3, Check, Plus, Trash2, Eye, Download, FileSpreadsheet, File, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { Alert } from "@/components/ui/Alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export interface ReportSection {
  id: string;
  title: string;
  selected: boolean;
}

export interface ReportBuilderProps {
  projects: { id: string; name: string }[];
  onSubmit: (data: ReportBuilderData) => Promise<void>;
  onPreview?: (data: ReportBuilderData) => void;
  className?: string;
  isLoading?: boolean;
}

export interface ReportBuilderData {
  title: string;
  type: string;
  projectId: string;
  period: string;
  description: string;
  format: string;
  sections: ReportSection[];
  includeCharts: boolean;
  includeMetrics: boolean;
}

const reportTypes = [
  { value: "projet", label: "Projet" },
  { value: "beneficiaire", label: "Bénéficiaires" },
  { value: "membre", label: "Membres" },
  { value: "global", label: "Consolidé" },
  { value: "bailleur", label: "Bailleur" },
];

const formatOptions = [
  { value: "pdf", label: "PDF", icon: FileText },
  { value: "excel", label: "Excel", icon: FileSpreadsheet },
  { value: "word", label: "Word", icon: File },
];

const defaultSections: ReportSection[] = [
  { id: "1", title: "Résumé exécutif", selected: true },
  { id: "2", title: "Activités réalisées", selected: true },
  { id: "3", title: "Indicateurs de performance", selected: true },
  { id: "4", title: "Évaluation des bénéficiaires", selected: false },
  { id: "5", title: "Recommandations", selected: true },
  { id: "6", title: "Annexes", selected: false },
];

export function ReportBuilder({
  projects,
  onSubmit,
  onPreview,
  className,
  isLoading = false,
}: ReportBuilderProps) {
  const [formData, setFormData] = useState<ReportBuilderData>({
    title: "",
    type: "",
    projectId: "",
    period: "",
    description: "",
    format: "pdf",
    sections: defaultSections,
    includeCharts: true,
    includeMetrics: true,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ReportBuilderData, string>>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const projectOptions = projects.map(p => ({ value: p.id, label: p.name }));

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ReportBuilderData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Le titre est requis";
    }
    if (!formData.type) {
      newErrors.type = "Le type de rapport est requis";
    }
    if (!formData.period.trim()) {
      newErrors.period = "La période est requise";
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

  const toggleSection = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === id ? { ...section, selected: !section.selected } : section
      ),
    }));
  };

  const selectedSections = formData.sections.filter((s) => s.selected).length;

  return (
    <div className={cn("space-y-6", className)}>
      {generalError && (
        <Alert variant="danger">
          {generalError}
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulaire principal */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations du rapport</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                id="title"
                label="Titre du rapport"
                placeholder="Ex: Rapport trimestriel - Maison Digitale"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                error={errors.title}
                required
                icon={<FileText className="h-4 w-4" />}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  id="type"
                  label="Type de rapport"
                  options={reportTypes}
                  placeholder="Sélectionnez un type"
                  value={formData.type}
                  onChange={(e) => {
                    setFormData({ ...formData, type: e.target.value, projectId: "" });
                  }}
                  error={errors.type}
                  required
                />

                <Select
                  id="projectId"
                  label="Projet"
                  options={projectOptions}
                  placeholder="Sélectionnez un projet"
                  value={formData.projectId}
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  disabled={!["projet", "beneficiaire", "bailleur"].includes(formData.type)}
                  icon={<Building2 className="h-4 w-4" />}
                />
              </div>

              <Input
                id="period"
                label="Période"
                placeholder="Ex: Trimestre 1 2025"
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                error={errors.period}
                required
                icon={<Calendar className="h-4 w-4" />}
              />

              <Textarea
                id="description"
                label="Description"
                placeholder="Décrivez le contenu du rapport..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />

              <div>
                <label className="text-sm font-medium block mb-2">Format</label>
                <div className="flex gap-2">
                  {formatOptions.map((format) => {
                    const Icon = format.icon;
                    return (
                      <button
                        key={format.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, format: format.value })}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all",
                          formData.format === format.value
                            ? "border-primary bg-primary/5"
                            : "border-input hover:border-primary/50"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-sm font-medium">{format.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sections */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Sections du rapport</span>
                <Badge variant="outline">
                  {selectedSections}/{formData.sections.length} sélectionnées
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {formData.sections.map((section) => (
                  <Checkbox
                    key={section.id}
                    label={section.title}
                    checked={section.selected}
                    onCheckedChange={() => toggleSection(section.id)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Options supplémentaires</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Checkbox
                label="Inclure des graphiques"
                description="Ajouter des graphiques d'analyse"
                checked={formData.includeCharts}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, includeCharts: checked as boolean })
                }
              />
              <Checkbox
                label="Inclure les métriques clés"
                description="Ajouter les indicateurs de performance"
                checked={formData.includeMetrics}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, includeMetrics: checked as boolean })
                }
              />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onPreview?.(formData)}
              leftIcon={<Eye className="h-4 w-4" />}
              fullWidth
            >
              Aperçu
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              isLoading={isLoading}
              loadingText="Génération..."
              leftIcon={<FileText className="h-4 w-4" />}
              fullWidth
            >
              Générer le rapport
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}