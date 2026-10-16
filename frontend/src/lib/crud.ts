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
  | "checkbox";

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
  | "grids";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: Option[];
  lookup?: LookupKind;
  hideOnEdit?: boolean;
  hideOnCreate?: boolean;
  min?: number;
  max?: number;
  full?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Item = any;

export interface ColumnDef {
  header: string;
  render: (item: Item) => ReactNode;
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
  createHref?: string;
  /** Bloc supplémentaire affiché sous la fiche détail */
  extra?: (item: Item) => ReactNode;
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
): Promise<void> {
  if (id === null) {
    await api.post(config.endpoint, payload);
  } else {
    await api.put(`${config.endpoint}/${id}`, payload);
  }
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
