// src/lib/exportTable.ts
/** Export de tableaux en CSV (séparateur « ; », BOM UTF-8) ou en Excel (SpreadsheetML, plusieurs feuilles). */
export type Cell = string | number | boolean | null | undefined;
export interface ExportSheet {
  name: string;
  headers: string[];
  rows: Cell[][];
}

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const csvCell = (v: Cell) => `"${(v === null || v === undefined ? "" : String(v)).replace(/"/g, '""')}"`;

/** Un seul fichier CSV ; si plusieurs feuilles, chacune est précédée de son titre et séparée par une ligne vide. */
export function exportSheetsCsv(filename: string, sheets: ExportSheet[]): void {
  const lines: string[] = [];
  sheets.forEach((sheet, index) => {
    if (index > 0) lines.push("");
    if (sheets.length > 1) lines.push(csvCell(sheet.name));
    lines.push(sheet.headers.map(csvCell).join(";"));
    sheet.rows.forEach((row) => lines.push(row.map(csvCell).join(";")));
  });
  save(new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" }), filename);
}

const xml = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function xmlCell(v: Cell, bold = false): string {
  const style = bold ? ' ss:StyleID="h"' : "";
  if (typeof v === "number" && Number.isFinite(v)) return `<Cell${style}><Data ss:Type="Number">${v}</Data></Cell>`;
  const text = v === null || v === undefined ? "" : String(v);
  return `<Cell${style}><Data ss:Type="String">${xml(text)}</Data></Cell>`;
}

/** Fichier Excel (.xls, ouvert directement par Excel / LibreOffice) avec une feuille par tableau. */
export function exportSheetsExcel(filename: string, sheets: ExportSheet[]): void {
  const used = new Set<string>();
  const worksheets = sheets
    .map((sheet, index) => {
      let name = sheet.name.replace(/[\\/?*[\]:]/g, " ").slice(0, 31).trim() || `Feuille ${index + 1}`;
      while (used.has(name.toLowerCase())) name = `${name.slice(0, 28)} ${index + 1}`;
      used.add(name.toLowerCase());
      const head = `<Row>${sheet.headers.map((h) => xmlCell(h, true)).join("")}</Row>`;
      const body = sheet.rows.map((row) => `<Row>${row.map((c) => xmlCell(c)).join("")}</Row>`).join("");
      return `<Worksheet ss:Name="${xml(name)}"><Table>${head}${body}</Table></Worksheet>`;
    })
    .join("");

  const doc =
    `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>` +
    `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">` +
    `<Styles><Style ss:ID="h"><Font ss:Bold="1"/><Interior ss:Color="#E5E7EB" ss:Pattern="Solid"/></Style></Styles>` +
    `${worksheets}</Workbook>`;

  save(new Blob([doc], { type: "application/vnd.ms-excel;charset=utf-8;" }), filename);
}
