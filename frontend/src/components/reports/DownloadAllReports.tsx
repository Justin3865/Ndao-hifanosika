"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import api from "@/lib/axios";
import { downloadReportPdf, type ReportPdfFormat } from "@/lib/reportPdf";
import { PdfFormatDialog } from "./PdfFormatDialog";
import { ImpactPage, OverviewPage, type DashboardData, type EvaluationReport, type ZoneRow } from "./ReportPdfSheets";

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

async function waitForImages(root: HTMLElement) {
  await Promise.all(
    Array.from(root.querySelectorAll("img")).map(
      (img) =>
        img.complete ||
        new Promise<void>((resolve) => {
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        })
    )
  );
}

/**
 * Bouton « Télécharger tout » de la page Rapports : un seul PDF (A4 ou A3)
 * avec le rapport général puis le rapport d'impact, au même style que le certificat.
 */
export function DownloadAllReports({ dashboard, evaluation }: { dashboard: DashboardData | null; evaluation: EvaluationReport | null }) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ReportPdfFormat>("A4");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [zones, setZones] = useState<ZoneRow[]>([]);
  const holder = useRef<HTMLDivElement>(null);

  // Zones d'intervention (rapport d'impact)
  useEffect(() => {
    api.get("/tracking/zones").then((r) => setZones(r.data?.data ?? [])).catch(() => setZones([]));
  }, []);

  const handleDownload = async () => {
    setBusy(true);
    setError("");

    try {
      await nextFrame();
      await nextFrame();

      const root = holder.current;
      if (!root) throw new Error("Rendu indisponible");

      await waitForImages(root);

      const pages = Array.from(root.querySelectorAll<HTMLElement>("[data-report-page]"));
      const stamp = new Date().toISOString().slice(0, 10);

      await downloadReportPdf(pages, format, `rapports-${stamp}-${format}.pdf`);
      setOpen(false);
    } catch (err) {
      console.error("Erreur PDF:", err);
      setError("Impossible de générer le PDF. Vérifiez que « jspdf » et « html-to-image » sont installés (npm install).");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        disabled={!dashboard}
        className="inline-flex items-center gap-2 rounded-xl border border-blue-800 bg-white px-5 py-2.5 text-sm font-medium text-blue-800 hover:bg-blue-50 disabled:opacity-40"
      >
        <Download className="h-4 w-4" />
        Télécharger tout
      </button>

      {open && (
        <PdfFormatDialog
          title="Télécharger tout"
          description="Un seul PDF : rapport général + rapport d'impact (bailleurs)."
          format={format}
          onFormatChange={setFormat}
          busy={busy}
          error={error}
          onConfirm={handleDownload}
          onClose={() => setOpen(false)}
        />
      )}

      {/* Pages rendues hors écran pour la capture */}
      <div ref={holder} aria-hidden="true" style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }}>
        <OverviewPage dashboard={dashboard} evaluation={evaluation} />
        <ImpactPage dashboard={dashboard} evaluation={evaluation} zones={zones} />
      </div>
    </>
  );
}
