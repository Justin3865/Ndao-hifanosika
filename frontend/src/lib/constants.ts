// src/lib/constants.ts
export const APP_NAME = "Ndao Hifanosika";
export const APP_DESCRIPTION = "Plateforme de Suivi et Évaluation des Équipes et Bénéficiaires";

// URLs
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
export const AI_API_BASE_URL = process.env.NEXT_PUBLIC_AI_API_URL || "http://localhost:8000";

// Pagination
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

// Dates
export const DATE_FORMAT = "dd/MM/yyyy";
export const DATE_FORMAT_DISPLAY = "dd MMMM yyyy";
export const DATETIME_FORMAT = "dd/MM/yyyy HH:mm";
export const TIME_FORMAT = "HH:mm";

// Statuts
export const PROJECT_STATUSES = {
  planifie: { label: "Planifié", color: "blue" },
  en_cours: { label: "En cours", color: "yellow" },
  cloture: { label: "Clôturé", color: "green" },
};

export const ACTIVITY_STATUSES = {
  planifie: { label: "Planifié", color: "blue" },
  en_cours: { label: "En cours", color: "yellow" },
  termine: { label: "Terminé", color: "green" },
  annule: { label: "Annulé", color: "red" },
};

export const EVALUATION_STATUSES = {
  planifie: { label: "Planifié", color: "blue" },
  en_cours: { label: "En cours", color: "yellow" },
  termine: { label: "Terminé", color: "green" },
  annule: { label: "Annulé", color: "red" },
};

export const MEMBER_STATUSES = {
  actif: { label: "Actif", color: "green" },
  inactif: { label: "Inactif", color: "gray" },
  en_conge: { label: "En congé", color: "yellow" },
};

export const BENEFICIARY_STATUSES = {
  actif: { label: "Actif", color: "green" },
  en_cours: { label: "En cours", color: "yellow" },
  termine: { label: "Terminé", color: "blue" },
  abandon: { label: "Abandon", color: "red" },
};

// Types
export const ACTIVITY_TYPES = [
  { value: "formation", label: "Formation" },
  { value: "atelier", label: "Atelier" },
  { value: "reunion", label: "Réunion" },
  { value: "suivi", label: "Suivi" },
  { value: "autre", label: "Autre" },
];

export const MEMBER_TYPES = [
  { value: "salarie", label: "Salarié" },
  { value: "stagiaire", label: "Stagiaire" },
  { value: "benevole", label: "Bénévole" },
];

export const VULNERABILITY_TYPES = [
  { value: "enfant", label: "Enfant" },
  { value: "femme", label: "Femme vulnérable" },
  { value: "jeune", label: "Jeune" },
  { value: "handicap", label: "Handicap" },
  { value: "aucune", label: "Aucune" },
];

export const GENDER_OPTIONS = [
  { value: "F", label: "Féminin" },
  { value: "M", label: "Masculin" },
];

export const INTERNSHIP_LEVELS = [
  { value: "L3", label: "Licence 3" },
  { value: "M2", label: "Master 2" },
];

// Formatage des statuts
export const formatStatus = (
  status: string,
  statusMap: Record<string, { label: string; color: string }>
): { label: string; color: string } => {
  return statusMap[status] || { label: status, color: "gray" };
};

// Formatage des montants
export const formatCurrency = (amount: number, currency: string = "MGA"): string => {
  return new Intl.NumberFormat("fr-MG", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Formatage des dates
export const formatDate = (date: string | Date, format: string = DATE_FORMAT): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");

  return format
    .replace("dd", day)
    .replace("MM", month)
    .replace("yyyy", year.toString())
    .replace("HH", hours)
    .replace("mm", minutes);
};