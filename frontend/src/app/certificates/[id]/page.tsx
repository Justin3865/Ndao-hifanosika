"use client";

import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, FileText, Loader2, Printer, X } from "lucide-react";
import api from "@/lib/axios";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ORG, orgContactLine } from "@/lib/org";
import { Logo } from "@/components/brand/Logo";
import { QrCode } from "@/components/ui/QrCode";
import { errorMessage, fmtDate } from "@/lib/crud";
import { isSameName } from "@/lib/names";

interface Certificate {
  id: number;
  code: string;
  type: string;
  holderName: string;
  title: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  revokedAt?: string | null;
  expiresAt?: string | null;
  holderBirthDate?: string | null;
  holderBirthPlace?: string | null;
  missionLocation?: string | null;
  /** Thème du stagiaire + département (figés à la délivrance) */
  theme?: string | null;
  departmentName?: string | null;
  mention?: string | null;
  finalScore?: number | null;
  holderCin?: string | null;
  holderCinIssuedAt?: string | null;
  holderCinIssuedPlace?: string | null;
  holderCinDuplicata?: boolean;
  holderCinDuplicataAt?: string | null;
  slogan?: string | null;
  project?: { id: number; name: string; slogan?: string | null } | null;
  partnerLinks?: Array<{
    id: number;
    nameSnapshot: string;
    sloganSnapshot?: string | null;
    logoSnapshot?: string | null;
  }>;
}

const HEADLINE: Record<string, string> = {
  INTERNSHIP: "Certificat de stage",
  VOLUNTEER: "Certificat de bénévolat",
  STAFF: "Certificat de travail",
  TRAINING: "Attestation de formation",
  BENEFICIARY: "Certificat de participation",
};

/** Phrase d'introduction selon le type de certificat */
const WORDING: Record<string, { project: string; title: string; none: string; place: string; dept: string; theme: string }> = {
  INTERNSHIP: {
    dept: "a effectué avec sérieux son stage dans le département :",
    theme: "a effectué avec sérieux son stage intitulé",
    project: "a effectué avec sérieux son stage dans le cadre du projet",
    title: "a effectué avec sérieux le stage suivant :",
    none: "a effectué avec sérieux son stage au sein de l'ONG Ndao Hifanosika.",
    place: "Lieu de stage",
  },
  VOLUNTEER: {
    dept: "a accompli avec dévouement une mission de bénévolat dans le département :",
    theme: "a accompli avec dévouement une mission de bénévolat intitulée",
    project: "a accompli avec dévouement une mission de bénévolat dans le cadre du projet",
    title: "a accompli avec dévouement la mission de bénévolat suivante :",
    none: "a accompli avec dévouement une mission de bénévolat au sein de l'ONG Ndao Hifanosika.",
    place: "Lieu de mission",
  },
  STAFF: {
    dept: "a accompli avec sérieux sa mission dans le département :",
    theme: "a accompli avec sérieux sa mission intitulée",
    project: "a accompli avec sérieux la mission du projet",
    title: "a accompli avec sérieux la mission suivante :",
    none: "a accompli avec sérieux sa mission au sein de l'ONG Ndao Hifanosika.",
    place: "Lieu de mission",
  },
  TRAINING: {
    dept: "a suivi avec assiduité une formation dans le département :",
    theme: "a suivi avec assiduité une formation intitulée",
    project: "a suivi avec assiduité la formation dans le cadre du projet",
    title: "a suivi avec assiduité la formation suivante :",
    none: "a suivi avec assiduité une formation organisée par l'ONG Ndao Hifanosika.",
    place: "Lieu de formation",
  },
  BENEFICIARY: {
    dept: "a bénéficié des actions du département :",
    theme: "a bénéficié de l'action intitulée",
    project: "a bénéficié du projet",
    title: "a bénéficié de l'action suivante :",
    none: "a bénéficié des actions de l'ONG Ndao Hifanosika.",
    place: "Localité",
  },
};

const DEFAULT_WORDING = WORDING.STAFF;

type PdfFormat = "A4" | "A3";

/** Dimensions des pages en paysage (mm) */
const PDF_FORMATS: Record<PdfFormat, { label: string; width: number; height: number }> = {
  A4: { label: "A4 (297 × 210 mm)", width: 297, height: 210 },
  A3: { label: "A3 (420 × 297 mm)", width: 420, height: 297 },
};

/**
 * Génère et télécharge le certificat en PDF au format choisi.
 * Nécessite :  npm install jspdf html-to-image
 */
async function downloadCertificatePdf(node: HTMLElement, format: PdfFormat, fileName: string) {
  const [{ toPng }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);

  // Capture nette du certificat (sans l'ombre de l'écran)
  const dataUrl = await toPng(node, {
    pixelRatio: 3,
    backgroundColor: "#ffffff",
    cacheBust: true,
    style: { boxShadow: "none", margin: "0" },
  });

  const page = PDF_FORMATS[format];
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: format.toLowerCase() });

  // Le certificat occupe la page en gardant ses proportions, centré avec une petite marge
  const margin = 8;
  const maxWidth = page.width - margin * 2;
  const maxHeight = page.height - margin * 2;
  const ratio = node.offsetWidth / node.offsetHeight;

  let width = maxWidth;
  let height = width / ratio;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }

  pdf.addImage(dataUrl, "PNG", (page.width - width) / 2, (page.height - height) / 2, width, height);
  pdf.save(fileName);
}

/** Cachet officiel : déposez l'image (PNG fond transparent) dans frontend/public/images/cachet.png. */
function Cachet() {
  const [missing, setMissing] = useState(false);

  if (missing) {
    return (
      <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-blue-900/50 px-3 text-center text-[9px] font-semibold uppercase leading-tight text-blue-900/60">
        Cachet officiel de l&apos;ONG
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/images/cachet.png" alt="Cachet officiel de l'association" onError={() => setMissing(true)} className="h-24 w-24 object-contain" />;
}

/**
 * Signature de la Direction : déposez l'image (PNG fond transparent) dans
 * frontend/public/images/signature.png. Sans fichier, l'espace reste vide pour signer à la main.
 */
function Signature() {
  const [missing, setMissing] = useState(false);

  if (missing) return null;

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src="/images/signature.png"
      alt="Signature de la Direction"
      onError={() => setMissing(true)}
      className="max-h-16 max-w-full object-contain"
    />
  );
}

/**
 * Date et heure d'émission à l'heure de Madagascar (UTC+3, sans heure d'été).
 * Calcul direct sur l'instant UTC (+3 h) : ne dépend ni du fuseau de l'ordinateur ni du navigateur.
 */
function formatIssued(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };

  const mg = new Date(d.getTime() + 3 * 60 * 60 * 1000);
  const two = (n: number) => String(n).padStart(2, "0");

  return {
    date: `${two(mg.getUTCDate())}/${two(mg.getUTCMonth() + 1)}/${mg.getUTCFullYear()}`,
    time: `${two(mg.getUTCHours())}:${two(mg.getUTCMinutes())}:${two(mg.getUTCSeconds())}`,
  };
}

export default function CertificatePage() {
  const params = useParams<{ id: string }>();
  const [item, setItem] = useState<Certificate | null>(null);
  const [error, setError] = useState("");
  const [origin, setOrigin] = useState("");
  const [showFormat, setShowFormat] = useState(false);
  const [mode, setMode] = useState<"pdf" | "print">("pdf");
  const [printFormat, setPrintFormat] = useState<PdfFormat>("A4");
  const [format, setFormat] = useState<PdfFormat>("A4");
  const [downloading, setDownloading] = useState(false);
  const [pdfError, setPdfError] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);

    api
      .get(`/certificates/${params.id}`)
      .then((res) => setItem(res.data?.data ?? null))
      .catch((err) => setError(errorMessage(err, "Certificat introuvable.")));
  }, [params.id]);

  /**
   * Mission liée à un projet : « nom du projet : slogan ».
   * Vrai pour un bénéficiaire, ou quand l'intitulé est vide, le nom du titulaire ou celui du projet.
   */
  const projectMission = (() => {
    if (!item) return null;

    const name = item.title?.trim();
    const projectName = item.project?.name?.trim();
    const isProjectTitle =
      item.type === "BENEFICIARY" || !name || isSameName(name, item.holderName) || (!!projectName && name.startsWith(projectName));

    if (!isProjectTitle) return null;

    const label = name && !isSameName(name, item.holderName) ? name : projectName;
    return label ? `${label}${item.slogan ? ` : ${item.slogan}` : ""}` : null;
  })();

  /** Département et/ou thème saisis : phrase « … dans le département : X intitulé « thème » » (sauf bénéficiaire) */
  const deptName = item?.departmentName?.trim() || "";
  const themeText = item?.theme?.trim() || "";
  const hasDeptTheme = !!item && item.type !== "BENEFICIARY" && (!!deptName || !!themeText);

  const verifyUrl = item ? `${origin}/verification/${item.code}` : "";

  /** Impression : on applique le format choisi (A4/A3) à la page d'impression, puis on ouvre la fenêtre d'impression */
  const handlePrint = () => {
    setPrintFormat(format);
    setShowFormat(false);
    window.setTimeout(() => window.print(), 150);
  };

  const handleDownload = async () => {
    const node = document.getElementById("certificate-sheet");
    if (!node || !item) return;

    setDownloading(true);
    setPdfError("");

    try {
      await downloadCertificatePdf(node, format, `certificat-${item.code}-${format}.pdf`);
      setShowFormat(false);
    } catch (err) {
      console.error("Erreur PDF:", err);
      setPdfError("Impossible de générer le PDF. Vérifiez que « jspdf » et « html-to-image » sont installés (npm install).");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-100 p-6 print:min-h-0 print:bg-white print:px-12 print:py-8">
        {/* Impression : marge de page à 0 => le navigateur n'ajoute plus l'URL, la date ni le titre en haut/bas */}
        <style>{`
          @page { size: ${printFormat} landscape; margin: 0; }
          @media print {
            html, body { height: auto !important; margin: 0 !important; }
            .cert-sheet { zoom: ${printFormat === "A3" ? 1.3 : 0.92}; break-inside: avoid; page-break-inside: avoid; }
          }
        `}</style>
        <div className="mx-auto mb-4 flex max-w-4xl items-center justify-between print:hidden">
          <Link href="/certificates" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Link>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setMode("print");
                setPdfError("");
                setShowFormat(true);
              }}
              disabled={!item}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-800 bg-white px-5 py-2.5 text-sm font-semibold text-blue-800 transition hover:bg-blue-50 disabled:opacity-40"
            >
              <Printer className="h-4 w-4" /> Imprimer
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("pdf");
                setPdfError("");
                setShowFormat(true);
              }}
              disabled={!item}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:opacity-40"
            >
              <Download className="h-4 w-4" /> Télécharger PDF
            </button>
          </div>
        </div>

        {error && <p className="text-center text-red-600">{error}</p>}

        {item && (
          <div
            id="certificate-sheet"
            className="cert-sheet relative mx-auto max-w-4xl overflow-hidden bg-white text-center shadow-xl print:shadow-none"
          >
            {/* Cadre : liseré bleu du logo + filet turquoise */}
            <div className="m-3 border-[3px] border-[#0F6BA0] p-1.5">
              <div className="relative border border-[#1B9AA0]/60 px-10 py-6">
                {/* Ornements d'angle (rose du logo) */}
                <span className="pointer-events-none absolute -left-px -top-px h-7 w-7 border-l-4 border-t-4 border-[#E4156C]" />
                <span className="pointer-events-none absolute -right-px -top-px h-7 w-7 border-r-4 border-t-4 border-[#E4156C]" />
                <span className="pointer-events-none absolute -bottom-px -left-px h-7 w-7 border-b-4 border-l-4 border-[#E4156C]" />
                <span className="pointer-events-none absolute -bottom-px -right-px h-7 w-7 border-b-4 border-r-4 border-[#E4156C]" />

                {/* Filigrane : logo en transparence */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logos/ndao-hifanosika.png"
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.05]"
                />

                {item.revokedAt && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center">
                    <span className="-rotate-12 rounded-2xl border-8 border-red-500/60 px-10 py-4 text-6xl font-black uppercase text-red-500/60">Révoqué</span>
                  </div>
                )}

                <div className="relative z-10">
                  {/* En-tête */}
                  {/* Logos alignés sur une même ligne : Ndao Hifanosika à gauche, puis les partenaires vers la droite */}
                  <div className="flex flex-wrap items-start justify-center gap-x-8 gap-y-4">
                    <div className="flex w-[150px] flex-col items-center">
                      <div className="flex h-14 items-center justify-center">
                        <Logo print size={56} withText={false} />
                      </div>
                      <p className="mt-1 text-[11px] font-semibold text-[#0A4A70]">Ndao Hifanosika</p>
                      <p className="text-[10px] text-gray-500">Suivi &amp; Évaluation</p>
                    </div>

                    {item.partnerLinks?.map((partner) => (
                      <Fragment key={partner.id}>
                        <span className="h-14 w-px self-start bg-[#1B9AA0]/40" aria-hidden="true" />
                        <div className="flex w-[150px] flex-col items-center">
                          <div className="flex h-14 w-full items-center justify-center">
                            {partner.logoSnapshot ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={partner.logoSnapshot} alt={partner.nameSnapshot} className="max-h-14 max-w-[130px] object-contain" />
                            ) : (
                              <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#0F6BA0] text-lg font-bold text-[#0F6BA0]">
                                {partner.nameSnapshot.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-[11px] font-semibold text-gray-800">{partner.nameSnapshot}</p>
                          {partner.sloganSnapshot && <p className="text-[10px] italic text-gray-500">« {partner.sloganSnapshot} »</p>}
                        </div>
                      </Fragment>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-gray-500">{ORG.name} — {ORG.address}</p>
                  {orgContactLine() && <p className="text-[11px] text-gray-500">{orgContactLine()}</p>}

                  {/* Titre */}
                  <h1 className="mt-4 text-3xl font-extrabold uppercase tracking-[0.25em] text-[#0F6BA0]">
                    {HEADLINE[item.type] ?? "Certificat"}
                  </h1>
                  <div className="mx-auto mt-2 flex h-1 w-40 overflow-hidden rounded-full">
                    <span className="h-full flex-1 bg-[#0F6BA0]" />
                    <span className="h-full flex-1 bg-[#1B9AA0]" />
                    <span className="h-full flex-1 bg-[#E4156C]" />
                  </div>
                  <p className="mx-auto mt-2 w-fit rounded-full bg-[#0F6BA0]/10 px-4 py-0.5 font-mono text-xs font-semibold text-[#0A4A70]">
                    N° {item.code}
                  </p>
                  {item.slogan && !projectMission && (
                    <p className="mx-auto mt-2 max-w-2xl font-serif text-sm italic text-[#1B9AA0]">« {item.slogan} »</p>
                  )}

                  {/* Titulaire */}
                  <p className="mt-4 text-sm text-gray-600">L&apos;ONG Ndao Hifanosika certifie que</p>
                  <p className="mx-auto mt-1 w-fit border-b-2 border-[#1B9AA0]/50 px-6 pb-1 font-serif text-4xl font-bold text-[#0A4A70]">
                    {item.holderName}
                  </p>

                  {(item.holderBirthDate || item.holderBirthPlace) && (
                    <p className="mt-2 text-sm italic text-gray-600">
                      Né(e){item.holderBirthDate ? <> le <strong className="not-italic text-gray-800">{fmtDate(item.holderBirthDate)}</strong></> : null}
                      {item.holderBirthPlace ? <> à <strong className="not-italic text-gray-800">{item.holderBirthPlace}</strong></> : null}
                    </p>
                  )}

                  {item.holderCin && (
                    <p className="mt-1 text-sm italic text-gray-600">
                      CIN n° <strong className="not-italic text-gray-800">{item.holderCin.replace(/(\d{3})(?=\d)/g, "$1 ")}</strong>
                      {item.holderCinIssuedAt ? <> délivrée le <strong className="not-italic text-gray-800">{fmtDate(item.holderCinIssuedAt)}</strong></> : null}
                      {item.holderCinIssuedPlace ? <> à <strong className="not-italic text-gray-800">{item.holderCinIssuedPlace}</strong></> : null}
                      {item.holderCinDuplicata ? <> (duplicata{item.holderCinDuplicataAt ? <> du <strong className="not-italic text-gray-800">{fmtDate(item.holderCinDuplicataAt)}</strong></> : null})</> : null}
                    </p>
                  )}

                  {/* Mission : sans cadre ni remplissage */}
                  {/* Si l'intitulé n'est que le nom du titulaire, on ne le répète pas */}
                  {hasDeptTheme ? (
                    <>
                      <p className="mt-3 text-sm text-gray-600">
                        {deptName ? (WORDING[item.type] ?? DEFAULT_WORDING).dept : (WORDING[item.type] ?? DEFAULT_WORDING).theme}
                      </p>
                      {deptName && <p className="mx-auto mt-1 max-w-2xl px-5 text-lg font-bold text-[#0A4A70]">{deptName}</p>}
                      {deptName && themeText && <p className="mt-1 text-sm text-gray-600">intitulé</p>}
                      {themeText && <p className="mx-auto mt-1 max-w-2xl px-5 pb-1 text-lg font-bold text-[#0A4A70]">« {themeText} »</p>}
                      {projectMission && (
                        <p className="mx-auto mt-1 max-w-2xl text-xs text-gray-500">
                          Projet : <span className="font-semibold text-gray-700">« {projectMission} »</span>
                        </p>
                      )}
                    </>
                  ) : projectMission ? (
                    <>
                      <p className="mt-3 text-sm text-gray-600">{(WORDING[item.type] ?? DEFAULT_WORDING).project}</p>
                      <p className="mx-auto mt-1 max-w-2xl px-5 py-2 text-lg font-bold text-[#0A4A70]">
                        « {projectMission} »
                      </p>
                    </>
                  ) : item.title && !isSameName(item.title, item.holderName) ? (
                    <>
                      <p className="mt-3 text-sm text-gray-600">{(WORDING[item.type] ?? DEFAULT_WORDING).title}</p>
                      <p className="mx-auto mt-1 max-w-2xl px-5 py-2 text-lg font-bold text-[#0A4A70]">
                        « {item.title} »
                      </p>
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-gray-600">{(WORDING[item.type] ?? DEFAULT_WORDING).none}</p>
                  )}

                  {/* Détails : période · lieu de mission (sans contour) */}
                  <div className="mx-auto mt-3 flex max-w-2xl flex-wrap items-stretch justify-center gap-6">
                    {(item.startDate || item.endDate) && (
                      <div className="min-w-[200px] flex-1 px-4 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#0F6BA0]">Période</p>
                        <p className="text-sm font-semibold text-gray-800">
                          du {fmtDate(item.startDate)} au {fmtDate(item.endDate)}
                        </p>
                      </div>
                    )}
                    {item.missionLocation && (
                      <div className="min-w-[200px] flex-1 px-4 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1B9AA0]">{(WORDING[item.type] ?? DEFAULT_WORDING).place}</p>
                        <p className="text-sm font-semibold text-gray-800">{item.missionLocation.replace(/\s+[—–-]\s+/g, " / ")}</p>
                      </div>
                    )}
                    {item.mention && (
                      <div className="min-w-[200px] flex-1 px-4 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#0F6BA0]">Mention</p>
                        <p className="text-sm font-bold text-gray-900">
                          {item.mention}
                          {typeof item.finalScore === "number" && (
                            <span className="ml-1 text-xs font-semibold text-gray-500">({item.finalScore.toFixed(1).replace(".", ",")}/20)</span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  {item.description && <p className="mx-auto mt-2 max-w-2xl text-xs italic text-gray-500">{item.description}</p>}

                  <p className="mx-auto mt-3 max-w-2xl text-xs text-gray-600">
                    En foi de quoi, le présent certificat lui est délivré pour servir et valoir ce que de droit.
                  </p>

                  {/* Bas : QR · cachet · signature */}
                  <div className="mt-4 flex items-end justify-between px-2 text-sm text-gray-700">
                    <div className="text-left">
                      <QrCode value={verifyUrl || item.code} size={92} />
                      <p className="mt-1 text-[10px] text-gray-500">Scannez pour vérifier l&apos;authenticité</p>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                      {/* Date + heure : minutes et secondes comprises */}
                      <div className="text-center text-xs">
                        <p>Fait à {ORG.city}, le <strong>{formatIssued(item.createdAt).date}</strong></p>
                        <p className="mt-0.5 text-[11px] text-gray-500">
                          à <strong className="font-mono text-gray-700">{formatIssued(item.createdAt).time}</strong>
                        </p>
                      </div>
                      <div className="flex items-center gap-5">
                        <Cachet />
                        <div className="text-center text-xs">
                          {/* Espace réservé à la signature de la Direction (image : public/images/signature.png) */}
                          <div className="flex h-16 w-48 items-end justify-center border-b border-gray-400 pb-0.5">
                            <Signature />
                          </div>
                          <p className="mt-1 font-semibold text-gray-800">La Direction</p>
                          <p className="text-gray-500">{ORG.name}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Choix du format PDF */}
        {showFormat && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 px-4 print:hidden">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                  <FileText className="h-5 w-5 text-blue-800" /> {mode === "print" ? "Format d'impression" : "Choisir le format"}
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
                  <label
                    key={key}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm transition ${
                      format === key ? "border-blue-800 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="pdf-format"
                      value={key}
                      checked={format === key}
                      onChange={() => setFormat(key)}
                      className="accent-blue-800"
                    />
                    <span className="font-semibold text-gray-900">{PDF_FORMATS[key].label}</span>
                  </label>
                ))}
              </div>

              {pdfError && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{pdfError}</p>}

              <button
                type="button"
                onClick={mode === "print" ? handlePrint : handleDownload}
                disabled={downloading}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-800 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-900 disabled:opacity-60"
              >
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "print" ? <Printer className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                {downloading ? "Génération..." : mode === "print" ? `Imprimer en ${format}` : "Télécharger le PDF"}
              </button>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
