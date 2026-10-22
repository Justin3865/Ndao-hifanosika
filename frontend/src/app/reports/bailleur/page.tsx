"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, Printer } from "lucide-react";
import api from "@/lib/axios";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PdfFormatDialog } from "@/components/reports/PdfFormatDialog";
import { ImpactReport, type DashboardData, type EvaluationReport, type ZoneRow } from "@/components/reports/ReportPdfSheets";
import { downloadReportPdf, type ReportPdfFormat } from "@/lib/reportPdf";

/** Rapport d'impact (bailleurs) : même présentation que le certificat (cadre, logo, filigrane, A4/A3). */
export default function DonorReportPage() {
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [ev, setEv] = useState<EvaluationReport | null>(null);
  const [zones, setZones] = useState<ZoneRow[]>([]);

  const [showFormat, setShowFormat] = useState(false);
  const [mode, setMode] = useState<"pdf" | "print">("pdf");
  const [format, setFormat] = useState<ReportPdfFormat>("A4");
  const [printFormat, setPrintFormat] = useState<ReportPdfFormat>("A4");
  const [busy, setBusy] = useState(false);
  const [pdfError, setPdfError] = useState("");

  useEffect(() => {
    api.get("/reports/dashboard").then((r) => setDash(r.data?.data ?? null)).catch(() => undefined);
    api.get("/reports/evaluations").then((r) => setEv(r.data?.data ?? null)).catch(() => undefined);
    api.get("/tracking/zones").then((r) => setZones(r.data?.data ?? [])).catch(() => undefined);
  }, []);

  const open = (next: "pdf" | "print") => {
    setMode(next);
    setPdfError("");
    setShowFormat(true);
  };

  /** Impression : format choisi appliqué à la page, marge 0 (pas d'URL ni de date imprimées par le navigateur) */
  const handlePrint = () => {
    setPrintFormat(format);
    setShowFormat(false);
    window.setTimeout(() => window.print(), 150);
  };

  const handleDownload = async () => {
    // Toutes les pages du rapport (1 seule tant que le contenu tient, puis une page de plus quand elle est pleine)
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-report-page]"));
    if (nodes.length === 0) return;

    setBusy(true);
    setPdfError("");

    try {
      await downloadReportPdf(nodes, format, `rapport-impact-${new Date().toISOString().slice(0, 10)}-${format}.pdf`);
      setShowFormat(false);
    } catch (err) {
      console.error("Erreur PDF:", err);
      setPdfError("Impossible de générer le PDF. Vérifiez que « jspdf » et « html-to-image » sont installés (npm install).");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-100 p-6 print:min-h-0 print:bg-white print:p-0">
        <style>{`
          @page { size: ${printFormat} portrait; margin: 0; }
          @media print {
            html, body { height: auto !important; margin: 0 !important; background: #fff !important; }
            .report-sheet { zoom: ${printFormat === "A3" ? 1.39 : 0.97}; box-shadow: none !important; }
            .report-page-wrap { break-after: page; page-break-after: always; }
            .report-page-wrap:last-of-type { break-after: auto; page-break-after: auto; }
          }
        `}</style>

        <div className="mx-auto mb-4 flex max-w-[794px] items-center justify-between print:hidden">
          <Link href="/reports" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Link>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => open("print")}
              disabled={!dash}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-800 bg-white px-5 py-2.5 text-sm font-semibold text-blue-800 transition hover:bg-blue-50 disabled:opacity-40"
            >
              <Printer className="h-4 w-4" /> Imprimer
            </button>
            <button
              type="button"
              onClick={() => open("pdf")}
              disabled={!dash}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:opacity-40"
            >
              <Download className="h-4 w-4" /> Télécharger PDF
            </button>
          </div>
        </div>

        <div className="overflow-x-auto print:overflow-visible">
          <div className="mx-auto w-fit space-y-6 print:space-y-0">
            <ImpactReport dashboard={dash} evaluation={ev} zones={zones} />
          </div>
        </div>

        {showFormat && (
          <PdfFormatDialog
            mode={mode}
            format={format}
            onFormatChange={setFormat}
            busy={busy}
            error={pdfError}
            onConfirm={mode === "print" ? handlePrint : handleDownload}
            onClose={() => setShowFormat(false)}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}