// src/lib/exportFormats.ts
// Choix du format d'export (JSON / CSV / Excel) : fichier AJOUTÉ, aucun fichier existant n'est modifié ici.
// Réutilise le générateur .xlsx sans dépendance (src/lib/xlsx.ts) et saveBlob (src/lib/gaps.ts).

import { buildXlsx, XLSX_MIME, type XlsxCell, type XlsxSheet } from "./xlsx";
import { saveBlob } from "./gaps";

export type ExportFormat = "xlsx" | "csv" | "json";

export const EXPORT_FORMATS: { id: ExportFormat; label: string; hint: string }[] = [
  { id: "xlsx", label: "Excel (.xlsx)", hint: "Classeur Excel (une feuille par jeu de données)" },
  { id: "csv", label: "CSV", hint: "Texte séparé par « ; », s'ouvre dans Excel" },
  { id: "json", label: "JSON", hint: "Format portable pour les bailleurs et outils externes" },
];

export type ExportRow = Record<string, unknown>;

const toCell = (value: unknown): XlsxCell => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return value as string | number | boolean;
};

/** Colonnes = union ordonnée des clés de toutes les lignes. */
export function columnsOf(rows: ExportRow[]): string[] {
  const seen = new Set<string>();
  for (const row of rows) for (const key of Object.keys(row)) seen.add(key);
  return [...seen];
}

/** Transforme des lignes JSON en feuille (en-têtes + cellules). */
export function rowsToSheet(name: string, rows: ExportRow[]): XlsxSheet {
  const headers = columnsOf(rows);
  if (headers.length === 0) return { name, headers: ["Aucune donnée"], rows: [] };
  return { name, headers, rows: rows.map((row) => headers.map((h) => toCell(row[h]))) };
}

const csvEscape = (value: XlsxCell): string => {
  const text = value === null || value === undefined ? "" : value instanceof Date ? value.toISOString() : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

/** CSV identique au reste de l'application : séparateur « ; » + BOM UTF-8 (accents corrects dans Excel). */
export function sheetToCsv(sheet: XlsxSheet): string {
  const lines = [sheet.headers.map(csvEscape).join(";"), ...sheet.rows.map((row) => row.map(csvEscape).join(";"))];
  return "\uFEFF" + lines.join("\r\n");
}

/** Enregistre une feuille en CSV ou en Excel. `baseName` = nom du fichier sans extension. */
export function saveSheetAs(format: "csv" | "xlsx", baseName: string, sheet: XlsxSheet): void {
  if (format === "csv") {
    saveBlob(new Blob([sheetToCsv(sheet)], { type: "text/csv;charset=utf-8;" }), `${baseName}.csv`);
  } else {
    saveBlob(new Blob([buildXlsx([sheet]) as BlobPart], { type: XLSX_MIME }), `${baseName}.xlsx`);
  }
}

/** Un seul classeur Excel avec une feuille par jeu de données. */
export function saveWorkbook(baseName: string, sheets: XlsxSheet[]): void {
  saveBlob(new Blob([buildXlsx(sheets) as BlobPart], { type: XLSX_MIME }), `${baseName}.xlsx`);
}

/** Enregistre un objet en JSON lisible. */
export function saveJson(baseName: string, payload: unknown): void {
  saveBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8;" }), `${baseName}.json`);
}
