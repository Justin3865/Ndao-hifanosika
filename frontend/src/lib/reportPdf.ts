// src/lib/reportPdf.ts
// PDF multi-pages des rapports (même principe que le PDF des certificats).
// Nécessite : npm install jspdf html-to-image

export type ReportPdfFormat = "A4" | "A3";

/** Dimensions des pages en portrait (mm) */
export const REPORT_PDF_FORMATS: Record<ReportPdfFormat, { label: string; width: number; height: number }> = {
  A4: { label: "A4 (210 × 297 mm)", width: 210, height: 297 },
  A3: { label: "A3 (297 × 420 mm)", width: 297, height: 420 },
};

/** Une page du PDF par nœud, dans l'ordre. */
export async function downloadReportPdf(nodes: HTMLElement[], format: ReportPdfFormat, fileName: string) {
  if (nodes.length === 0) throw new Error("Aucune page à générer");

  const [{ toPng }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
  const page = REPORT_PDF_FORMATS[format];
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: format.toLowerCase() });
  const margin = 6;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    const dataUrl = await toPng(node, {
      pixelRatio: 3,
      backgroundColor: "#ffffff",
      cacheBust: true,
      style: { boxShadow: "none", margin: "0" },
    });

    // Proportions conservées, centré avec une petite marge
    const maxWidth = page.width - margin * 2;
    const maxHeight = page.height - margin * 2;
    const ratio = node.offsetWidth / node.offsetHeight;

    let width = maxWidth;
    let height = width / ratio;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * ratio;
    }

    if (i > 0) pdf.addPage(format.toLowerCase(), "portrait");
    pdf.addImage(dataUrl, "PNG", (page.width - width) / 2, (page.height - height) / 2, width, height, undefined, "FAST");
  }

  pdf.save(fileName);
}
