"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Printer,
  X,
} from "lucide-react";
import { AppLayout } from "@/components/layout";
import { InsightHeader, State, useInsight } from "@/components/insights/parts";
import { Logo } from "@/components/brand/Logo";
import { ORG, orgContactLine } from "@/lib/org";

/* ---------------------------------------------------------
   Données renvoyées par GET /api/ai/summary
   Les champs facultatifs (anomalies, indicators, details) sont affichés
   automatiquement dès que le backend les fournit.
--------------------------------------------------------- */
type Anomaly =
  | string
  | { title?: string; project?: string; message?: string; severity?: string };

interface Summary {
  headline: string;
  highlights: string[];
  recommendations: string[];
  generatedAt: string;
  method: string;
  anomalies?: Anomaly[];
  indicators?: { label: string; value: string | number }[];
  details?: string | string[];
}

const anomalyText = (item: Anomaly) =>
  typeof item === "string"
    ? item
    : [item.title ?? item.project, item.message].filter(Boolean).join(" — ");

/* ---------------------------------------------------------
   PDF / impression : formats en portrait (mm)
--------------------------------------------------------- */
type PdfFormat = "A4" | "A3";

const PDF_FORMATS: Record<PdfFormat, { label: string; width: number; height: number }> = {
  A4: { label: "A4 (210 × 297 mm)", width: 210, height: 297 },
  A3: { label: "A3 (297 × 420 mm)", width: 297, height: 420 },
};

/** Nécessite :  npm install jspdf html-to-image */
async function downloadSummaryPdf(node: HTMLElement, format: PdfFormat, fileName: string) {
  const [{ toPng }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);

  const dataUrl = await toPng(node, {
    pixelRatio: 2.5,
    backgroundColor: "#ffffff",
    cacheBust: true,
    style: { boxShadow: "none", margin: "0" },
  });

  const page = PDF_FORMATS[format];
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: format.toLowerCase() });

  // La synthèse occupe toute la largeur de la page ; si elle est plus haute, elle continue sur la page suivante
  const ratio = node.offsetWidth / node.offsetHeight;
  const width = page.width;
  const height = width / ratio;

  if (height <= page.height + 0.5) {
    pdf.addImage(dataUrl, "PNG", 0, 0, width, height);
  } else {
    const pages = Math.ceil(height / page.height - 0.001);

    for (let i = 0; i < pages; i++) {
      if (i > 0) pdf.addPage();
      pdf.addImage(dataUrl, "PNG", 0, -i * page.height, width, height);
    }
  }

  pdf.save(fileName);
}

/* ---------------------------------------------------------
   Bloc de section (couleurs fixes : la feuille reste claire même en mode sombre)
--------------------------------------------------------- */
function Section({
  title,
  color = "#0F6BA0",
  children,
}: {
  title: string;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7 text-left [break-inside:avoid]">
      <div className="flex items-center gap-3">
        <span className="h-5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        <h3 className="text-xs font-extrabold uppercase tracking-[0.18em] sm:text-sm" style={{ color }}>
          {title}
        </h3>
      </div>
      <div className="mt-2 h-px w-full bg-[#dbe7f1]" />
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function AiSummaryPage() {
  const { data, loading, error } = useInsight<Summary>("/ai/summary");

  const [showFormat, setShowFormat] = useState(false);
  const [mode, setMode] = useState<"pdf" | "print">("pdf");
  const [format, setFormat] = useState<PdfFormat>("A4");
  const [printFormat, setPrintFormat] = useState<PdfFormat>("A4");
  const [downloading, setDownloading] = useState(false);
  const [pdfError, setPdfError] = useState("");

  const openFormat = (next: "pdf" | "print") => {
    setMode(next);
    setPdfError("");
    setShowFormat(true);
  };

  const handlePrint = () => {
    setPrintFormat(format);
    setShowFormat(false);
    window.setTimeout(() => window.print(), 150);
  };

  const handleDownload = async () => {
    const node = document.getElementById("summary-sheet");
    if (!node) return;

    setDownloading(true);
    setPdfError("");

    try {
      await downloadSummaryPdf(node, format, `synthese-intelligente-${format}.pdf`);
      setShowFormat(false);
    } catch (err) {
      console.error("Erreur PDF:", err);
      setPdfError("Impossible de générer le PDF. Vérifiez que « jspdf » et « html-to-image » sont installés (npm install).");
    } finally {
      setDownloading(false);
    }
  };

  const details = data?.details ? (Array.isArray(data.details) ? data.details : [data.details]) : [];

  return (
    <AppLayout>
      {/* Impression : seule la feuille est imprimée (ni menu, ni en-tête) */}
      <style>{`
        @page { size: ${printFormat} portrait; margin: 0; }
        @media print {
          html, body { height: auto !important; margin: 0 !important; background: #ffffff !important; }
          body * { visibility: hidden !important; }
          #summary-sheet, #summary-sheet * { visibility: visible !important; }
          #summary-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="mx-auto w-full min-w-0 max-w-4xl space-y-5 overflow-x-hidden">
        <InsightHeader title="Synthèse intelligente" subtitle="Résumé automatique de la situation globale." />

        <State loading={loading} error={error}>
          {data && (
            <>
              <div className="flex flex-wrap justify-end gap-3 print:hidden">
                <button
                  type="button"
                  onClick={() => openFormat("print")}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#0F6BA0] bg-[#ffffff] px-5 py-2.5 text-sm font-semibold text-[#0F6BA0] transition hover:bg-[#eaf3fa]"
                >
                  <Printer className="h-4 w-4" /> Imprimer
                </button>
                <button
                  type="button"
                  onClick={() => openFormat("pdf")}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0F6BA0] px-5 py-2.5 text-sm font-semibold text-[#ffffff] transition hover:bg-[#0c5784]"
                >
                  <Download className="h-4 w-4" /> Télécharger PDF
                </button>
              </div>

              {/* ================= FEUILLE (toujours claire) ================= */}
              <div
                id="summary-sheet"
                className="relative mx-auto w-full max-w-4xl overflow-hidden bg-[#ffffff] text-[#111827] shadow-xl"
                style={{ colorScheme: "light" }}
              >
                <div className="m-2 border-[3px] border-[#0F6BA0] p-1.5 sm:m-3">
                  <div className="relative border border-[#1B9AA0]/60 px-5 py-6 sm:px-10 sm:py-8">
                    {/* Ornements d'angle (rose du logo) */}
                    <span className="pointer-events-none absolute -left-px -top-px h-7 w-7 border-l-4 border-t-4 border-[#E4156C]" />
                    <span className="pointer-events-none absolute -right-px -top-px h-7 w-7 border-r-4 border-t-4 border-[#E4156C]" />
                    <span className="pointer-events-none absolute -bottom-px -left-px h-7 w-7 border-b-4 border-l-4 border-[#E4156C]" />
                    <span className="pointer-events-none absolute -bottom-px -right-px h-7 w-7 border-b-4 border-r-4 border-[#E4156C]" />

                    {/* Filigrane */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/logos/ndao-hifanosika.png"
                      alt=""
                      aria-hidden="true"
                      className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 max-w-[70%] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.05]"
                    />

                    <div className="relative z-10 text-center">
                      {/* En-tête */}
                      <div className="flex justify-center">
                        <Logo print size={56} />
                      </div>
                      <p className="mt-2 text-[11px] text-[#6b7280] [overflow-wrap:anywhere]">
                        {ORG.name} — {ORG.address}
                      </p>
                      {orgContactLine() && (
                        <p className="text-[11px] text-[#6b7280] [overflow-wrap:anywhere]">{orgContactLine()}</p>
                      )}

                      {/* Titre */}
                      <h1 className="mt-5 text-2xl font-extrabold uppercase tracking-[0.2em] text-[#0F6BA0] sm:text-3xl sm:tracking-[0.25em]">
                        Synthèse intelligente
                      </h1>
                      <div className="mx-auto mt-2 flex h-1 w-40 overflow-hidden rounded-full">
                        <span className="h-full flex-1 bg-[#0F6BA0]" />
                        <span className="h-full flex-1 bg-[#1B9AA0]" />
                        <span className="h-full flex-1 bg-[#E4156C]" />
                      </div>
                      <p className="mx-auto mt-3 w-fit rounded-full bg-[#0F6BA0]/10 px-4 py-0.5 text-xs font-semibold text-[#0A4A70]">
                        Analyse &amp; Évaluation — {new Date(data.generatedAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>

                    <div className="relative z-10">
                      {/* Résumé global */}
                      <Section title="Résumé global" color="#E4156C">
                        <p className="rounded-xl border-l-4 border-[#E4156C] bg-[#E4156C]/5 px-4 py-3 text-base font-bold leading-7 text-[#0A4A70] [overflow-wrap:anywhere] sm:text-lg">
                          {data.headline}
                        </p>
                      </Section>

                      {/* Points clés */}
                      {data.highlights?.length > 0 && (
                        <Section title="Points clés" color="#0F6BA0">
                          <ul className="space-y-2.5">
                            {data.highlights.map((line, i) => (
                              <li key={`${i}-${line}`} className="flex gap-3 text-sm leading-6 text-[#374151]">
                                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#E4156C]" />
                                <span className="min-w-0 [overflow-wrap:anywhere]">{line}</span>
                              </li>
                            ))}
                          </ul>
                        </Section>
                      )}

                      {/* Anomalies / points critiques (si fournies par l'API) */}
                      {data.anomalies && data.anomalies.length > 0 && (
                        <Section title="Anomalies / points critiques" color="#E4156C">
                          <ul className="space-y-2">
                            {data.anomalies.map((item, i) => (
                              <li
                                key={i}
                                className="flex gap-3 rounded-xl bg-[#E4156C]/10 p-3 text-sm leading-6 text-[#9d174d]"
                              >
                                <AlertTriangle className="mt-1 h-4 w-4 shrink-0" />
                                <span className="min-w-0 [overflow-wrap:anywhere]">{anomalyText(item)}</span>
                              </li>
                            ))}
                          </ul>
                        </Section>
                      )}

                      {/* Recommandations */}
                      {data.recommendations?.length > 0 && (
                        <Section title="Recommandations" color="#1B9AA0">
                          <ul className="space-y-2.5">
                            {data.recommendations.map((line, i) => (
                              <li
                                key={`${i}-${line}`}
                                className="flex gap-3 rounded-xl bg-[#1B9AA0]/10 p-3 text-sm leading-6 text-[#0A4A70]"
                              >
                                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#1B9AA0]" />
                                <span className="min-w-0 [overflow-wrap:anywhere]">{line}</span>
                              </li>
                            ))}
                          </ul>
                        </Section>
                      )}

                      {/* Indicateurs (si fournis par l'API) */}
                      {data.indicators && data.indicators.length > 0 && (
                        <Section title="Indicateurs" color="#0F6BA0">
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {data.indicators.map((item, i) => (
                              <div
                                key={`${i}-${item.label}`}
                                className="rounded-xl border border-[#0F6BA0]/20 px-3 py-3 text-center"
                              >
                                <p className="text-xl font-extrabold text-[#0A4A70] sm:text-2xl">{item.value}</p>
                                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">
                                  {item.label}
                                </p>
                              </div>
                            ))}
                          </div>
                        </Section>
                      )}

                      {/* Analyse détaillée (si fournie par l'API) */}
                      {details.length > 0 && (
                        <Section title="Analyse détaillée" color="#0F6BA0">
                          <div className="space-y-2 text-sm leading-6 text-[#374151]">
                            {details.map((paragraph, i) => (
                              <p key={i} className="[overflow-wrap:anywhere]">
                                {paragraph}
                              </p>
                            ))}
                          </div>
                        </Section>
                      )}

                      {/* Pied */}
                      <div className="mt-8 border-t border-[#dbe7f1] pt-4 text-center text-[11px] leading-5 text-[#6b7280]">
                        <p>
                          Généré le <strong className="text-[#374151]">{new Date(data.generatedAt).toLocaleString("fr-FR")}</strong>
                          {" — "}
                          <span className="[overflow-wrap:anywhere]">{data.method}</span>
                        </p>
                        <p>Document établi automatiquement à partir des données réelles de {ORG.name}.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </State>
      </div>

      {/* Choix du format */}
      {showFormat && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 px-4 print:hidden"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <FileText className="h-5 w-5 text-blue-800" />
                {mode === "print" ? "Format d'impression" : "Choisir le format"}
              </h2>
              <button
                type="button"
                onClick={() => !downloading && setShowFormat(false)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {(Object.keys(PDF_FORMATS) as PdfFormat[]).map((key) => (
                <div
                  key={key}
                  role="radio"
                  aria-checked={format === key}
                  tabIndex={0}
                  onClick={() => setFormat(key)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setFormat(key)}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm transition ${
                    format === key ? "border-blue-800 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                      format === key ? "border-blue-800" : "border-gray-400"
                    }`}
                  >
                    {format === key && <span className="h-2 w-2 rounded-full bg-blue-800" />}
                  </span>
                  <span className="font-semibold text-gray-900">{PDF_FORMATS[key].label}</span>
                </div>
              ))}
            </div>

            {pdfError && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{pdfError}</p>}

            <button
              type="button"
              onClick={mode === "print" ? handlePrint : handleDownload}
              disabled={downloading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-800 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-900 disabled:opacity-60"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "print" ? (
                <Printer className="h-4 w-4" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {downloading ? "Génération..." : mode === "print" ? `Imprimer en ${format}` : "Télécharger le PDF"}
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
