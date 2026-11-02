// src/lib/crud.ts
// Couche générique CRUD branchée sur l'API réelle (aucune donnée mock).

import type { ReactNode } from "react";
import api from "@/lib/axios";

/* ---------- Types de configuration ---------- */

export type FieldType =
  | "text"
  | "email"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "checkbox"
  | "geo"
  | "zonehierarchy"
  | "identity"
  | "newperson"
  | "matricule"
  | "partners"
  | "participants"
  | "projects";

export interface Option {
  value: string;
  label: string;
}

export type LookupKind =
  | "projects"
  | "departments"
  | "students"
  | "tutors"
  | "users"
  | "grids"
  | "zones";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: Option[];
  lookup?: LookupKind;
  /** Valeur par défaut à la création */
  defaultValue?: string | boolean;
  /** type "geo" : noms des champs API (défaut : <name>Latitude / <name>Longitude / <name>Altitude) */
  geoNames?: { lat: string; lng: string; alt?: string };
  hideOnEdit?: boolean;
  hideOnCreate?: boolean;
  min?: number;
  max?: number;
  full?: boolean;
  /** type "text" : n'accepte que des chiffres, au plus N */
  digitsOnly?: number;
  /** Texte d'aide affiché sous le champ */
  hint?: string;
  /** Champ « âge » : nom du champ date de naissance dont il est déduit (non modifiable si la date est saisie) */
  ageFrom?: string;
  /** type "identity" : nom du champ « select » qui contient l'identifiant de la personne */
  identityOf?: string;
  /** Champ obligatoire SAUF si le bloc « newperson » de ce nom est rempli */
  requiredUnless?: string;
  /** Champ date : doit être STRICTEMENT postérieur à la date du champ nommé (ex. fin > début) */
  after?: string;
  /** Champ « statut » : se règle seul d'après les dates { start, end } tant que l'utilisateur ne l'a pas choisi */
  statusFromDates?: { start: string; end: string };
  /** Champ « select » d'un encadrant : fixé sur la personne connectée quand c'est un tuteur */
  lockForTutor?: boolean;
  /** Champ « select » d'un encadrant : propose « + Ajouter un tuteur » (ADMIN, RH, COORDINATOR) */
  allowAddTutor?: boolean;
  /** Champ « select » : ajoute l'option « Autre… » qui ouvre une saisie libre stockée dans un autre champ */
  otherText?: { name: string; label: string; placeholder?: string };
  /** Champ calculé automatiquement : affiché en lecture seule (non modifiable) */
  readOnly?: boolean;
  /** Texte affiché dans un champ en lecture seule tant qu'il n'a pas de valeur */
  readOnlyPlaceholder?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Item = any;

export interface ColumnDef {
  header: string;
  /** `group` : les éléments du même groupe (voir `groupBy`) quand la colonne est fusionnée */
  render: (item: Item, group?: Item[]) => ReactNode;
  /** Colonne fusionnée (rowSpan) sur les lignes consécutives d'un même groupe (voir `groupBy` de la config) */
  group?: boolean;
}

export interface DetailRow {
  label: string;
  value: ReactNode;
}

export interface ResourceConfig {
  title: string;
  subtitle?: string;
  singular: string;
  basePath: string;
  endpoint: string;
  listKey: string;
  itemKey: string;
  columns: ColumnDef[];
  fields: FieldDef[];
  detail: (item: Item) => DetailRow[];
  titleOf: (item: Item) => string;
  searchOf: (item: Item) => string;
  statusFilter?: { field: string; options: Option[] };
  createRoles: string[];
  editRoles: string[];
  deleteRoles: string[];
  deleteMode?: "delete" | "deactivate";
  /** Libellé du bouton de suppression (ex. « Révoquer ») */
  deleteLabel?: string;
  createHref?: string;
  /** Regroupe les lignes consécutives de même clé : les colonnes `group` ne s'affichent qu'une fois par groupe */
  groupBy?: (item: Item) => string;
  /** Une seule ligne par clé : les éléments suivants de même clé sont masqués (le premier est gardé, `_hiddenCount` = nombre masqués) */
  uniqueBy?: (item: Item) => string;
  /** Bloc supplémentaire affiché sous la fiche détail */
  extra?: (item: Item) => ReactNode;
  /** Boutons supplémentaires dans la colonne Actions de la liste (reçoit le rôle connecté) */
  rowActions?: (item: Item, role: string) => ReactNode;
  /** Bloc affiché entre la recherche et le tableau de la liste (reçoit les éléments filtrés) */
  listExtra?: (items: Item[]) => ReactNode;
  /** Tableau compact qui s'adapte à la largeur disponible (aucune barre de défilement horizontale) */
  fitWidth?: boolean;
  /** Contenu des cellules centré (horizontalement et verticalement), titres compris */
  centerCells?: boolean;
}

/* ---------- Appels API ---------- */

export async function listItems(config: ResourceConfig): Promise<Item[]> {
  const res = await api.get(config.endpoint);
  return res.data?.[config.listKey] ?? [];
}

export async function getItem(
  config: ResourceConfig,
  id: string | number
): Promise<Item> {
  const res = await api.get(`${config.endpoint}/${id}`);
  return res.data?.[config.itemKey];
}

export async function saveItem(
  config: ResourceConfig,
  id: string | number | null,
  payload: Record<string, unknown>
): Promise<Item | undefined> {
  const res =
    id === null
      ? await api.post(config.endpoint, payload)
      : await api.put(`${config.endpoint}/${id}`, payload);

  return res.data?.[config.itemKey];
}

export async function removeItem(
  config: ResourceConfig,
  id: string | number
): Promise<void> {
  if (config.deleteMode === "deactivate") {
    await api.patch(`${config.endpoint}/${id}/deactivate`);
  } else {
    await api.delete(`${config.endpoint}/${id}`);
  }
}

export interface LookupItem {
  id: number;
  label: string;
}

export async function fetchLookup(kind: LookupKind): Promise<LookupItem[]> {
  const res = await api.get(`/lookups/${kind}`);
  return res.data?.data ?? [];
}

export function errorMessage(error: unknown, fallback: string): string {
  const message = (
    error as { response?: { data?: { message?: string } } }
  )?.response?.data?.message;

  return message || fallback;
}

/* ---------- Formatage ---------- */

export function fmtDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fr-FR");
}

export function fmtMoney(value?: number | string | null): string {
  if (value === null || value === undefined || value === "") return "—";
  return `${Number(value).toLocaleString("fr-FR")} Ar`;
}

export function fmtDateTime(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  ACTIVE: "Actif",
  COMPLETED: "Terminé",
  SUSPENDED: "Suspendu",
  PLANNED: "Planifié",
  IN_PROGRESS: "En cours",
  CANCELLED: "Annulé",
  SUBMITTED: "Soumis",
  VALIDATED: "Validé",
  PENDING: "En attente",
  INACTIVE: "Inactif",
  REJECTED: "Rejeté",
  CLOSED: "Clôturée",
  VALID: "Valide",
  REVOKED: "Révoqué",
};

export const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  COMPLETED: "bg-green-100 text-green-700",
  VALIDATED: "bg-green-100 text-green-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  PLANNED: "bg-blue-100 text-blue-700",
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  INACTIVE: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-red-100 text-red-700",
  SUSPENDED: "bg-red-100 text-red-700",
  REJECTED: "bg-red-100 text-red-700",
  CLOSED: "bg-gray-200 text-gray-700",
  VALID: "bg-green-100 text-green-700",
  REVOKED: "bg-red-100 text-red-700",
};

export const statusOptions = (values: string[]): Option[] =>
  values.map((value) => ({ value, label: STATUS_LABELS[value] ?? value }));

/** Export CSV (compatible Excel : BOM UTF-8 + séparateur point-virgule). */
export function exportCsv(
  filename: string,
  fields: FieldDef[],
  rows: Item[]
): void {
  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };

  const header = ["ID", ...fields.map((field) => field.label)].map(escape).join(";");

  const body = rows.map((row) =>
    [row.id, ...fields.map((field) => row[field.name])].map(escape).join(";")
  );

  const blob = new Blob(["\uFEFF" + [header, ...body].join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/* ---------- Budget : visible seulement par les rôles de pilotage ---------- */

/** Rôles autorisés à voir (et modifier) les budgets. Les autres (stagiaires, tuteurs, DSI, RH, COM) ne les voient pas. */
export const BUDGET_ROLES = ["ADMIN", "DIRECTION", "DAF", "COORDINATOR"];

export const canSeeBudget = (role?: string | null): boolean =>
  BUDGET_ROLES.includes((role ?? "").toUpperCase());

/** Libellés / noms de champs financiers à masquer. */
export const isBudgetLabel = (label?: string): boolean => /budget/i.test(label ?? "");
export const isBudgetField = (name?: string): boolean => /budget/i.test(name ?? "");
