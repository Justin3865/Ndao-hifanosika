"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, FileText, Loader2, Mail, Printer, X } from "lucide-react";
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
  /** E-mail du titulaire (lu dans la base de données) : le certificat y est envoyé à la délivrance */
  holderEmail?: string | null;
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
  /** Slogan de chaque projet (nom + slogan), figé à la délivrance */
  projectSlogans?: Array<{ name: string; slogan: string }> | null;
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
    skipFonts: true, // évite le SecurityError « Cannot access rules » (feuilles de style externes)
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

/** État de l'envoi automatique du certificat par e-mail (à la délivrance) */
type MailState = "idle" | "sending" | "sent" | "no_email" | "not_configured" | "failed";

/** Attend que les images (logo, cachet, signature, partenaires) et les polices soient chargées avant la capture. */
async function waitForCertificateAssets(node: HTMLElement) {
  try {
    await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
  } catch {
    /* ignoré */
  }

  const images = Array.from(node.querySelectorAll("img"));

  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) return resolve();
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
          window.setTimeout(resolve, 4000);
        }),
    ),
  );

  await new Promise((resolve) => window.setTimeout(resolve, 150));
}

/**
 * Génère les DEUX PDF (A4 et A3, deux fichiers séparés) du certificat, en base64, pour l'envoi par e-mail.
 * Une seule capture, mêmes dimensions et mêmes marges que « Télécharger PDF » ; JPEG pour garder des pièces jointes légères.
 */
async function buildCertificatePdfsBase64(node: HTMLElement): Promise<{ pdfA4: string; pdfA3: string }> {
  const [{ toJpeg }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);

  const dataUrl = await toJpeg(node, {
    // Le certificat n'utilise que des polices système : on n'embarque pas les polices web, ce qui évite de lire
    // les feuilles de style externes (SecurityError « Cannot access rules » : CSS d'un autre domaine / extension)
    skipFonts: true,
    pixelRatio: 3,
    quality: 0.95,
    backgroundColor: "#ffffff",
    cacheBust: true,
    style: { boxShadow: "none", margin: "0" },
  });

  const ratio = node.offsetWidth / node.offsetHeight;
  const margin = 8;

  const build = (format: PdfFormat) => {
    const page = PDF_FORMATS[format];
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: format.toLowerCase() });
    const maxWidth = page.width - margin * 2;
    const maxHeight = page.height - margin * 2;

    let width = maxWidth;
    let height = width / ratio;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * ratio;
    }

    pdf.addImage(dataUrl, "JPEG", (page.width - width) / 2, (page.height - height) / 2, width, height, undefined, "FAST");

    // « data:application/pdf;filename=generated.pdf;base64,XXXX » → on ne garde que le base64
    const uri = pdf.output("datauristring");
    return uri.slice(uri.indexOf(",") + 1);
  };

  return { pdfA4: build("A4"), pdfA3: build("A3") };
}

/** Cachet officiel : déposez l'image (PNG fond transparent) dans frontend/public/images/cachet.png. */
function Cachet() {
  const [missing, setMissing] = useState(false);

  if (missing) {
    return (
      <div className="flex h-36 w-36 items-center justify-center rounded-full border-2 border-dashed border-blue-900/50 px-5 text-center text-[11px] font-semibold uppercase leading-tight text-blue-900/60">
        Cachet officiel de l&apos;ONG
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/images/cachet.png" alt="Cachet officiel de l'association" onError={() => setMissing(true)} className="h-36 w-36 object-contain" />;
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
  /** Arrivée depuis « Délivrer le certificat » (?deliver=1) : envoi automatique par e-mail */
  const [deliver, setDeliver] = useState(false);
  const [mailState, setMailState] = useState<MailState>("idle");
  const [mailTo, setMailTo] = useState("");
  const [mailError, setMailError] = useState("");
  const [quickDownload, setQuickDownload] = useState<PdfFormat | null>(null);
  const deliverStarted = useRef(false);

  useEffect(() => {
    setOrigin(window.location.origin);

    if (new URLSearchParams(window.location.search).get("deliver") === "1") setDeliver(true);

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
    // Stagiaire & co : nom du projet seul (son slogan est toujours imprimé dessous) ; bénéficiaire : « nom : slogan »
    return label ? `${label}${item.type === "BENEFICIARY" && item.slogan ? ` : ${item.slogan}` : ""}` : null;
  })();

  /** Slogans toujours imprimés sous les logos (nom du projet au-dessus, slogan en dessous), sauf bénéficiaire avec « nom : slogan » */
  const showSlogans = !!item && (item.type !== "BENEFICIARY" || !projectMission);

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

  /** Génère les PDF A4 + A3 et les envoie à l'e-mail du titulaire (lu dans la base de données) */
  const sendByEmail = async () => {
    const node = document.getElementById("certificate-sheet");
    if (!node || !item) return;

    setMailState("sending");
    setMailError("");

    try {
      await waitForCertificateAssets(node);
      const pdfs = await buildCertificatePdfsBase64(node);
      const res = await api.post(`/certificates/${item.id}/send-email`, pdfs, { timeout: 120000 });
      const data = res.data ?? {};

      setMailTo(String(data.email ?? item.holderEmail ?? ""));

      if (data.sent) setMailState("sent");
      else if (data.reason === "NO_EMAIL") setMailState("no_email");
      else if (data.reason === "MAIL_NOT_CONFIGURED") setMailState("not_configured");
      else {
        setMailError(data.detail ? String(data.detail) : "");
        setMailState("failed");
      }
    } catch (err) {
      console.error("Erreur envoi e-mail certificat:", err);
      setMailError(errorMessage(err, "L'envoi par e-mail a échoué."));
      setMailState("failed");
    }
  };

  /** Téléchargement direct (bandeau de délivrance) : même PDF que « Télécharger PDF » */
  const quickDownloadPdf = async (fmt: PdfFormat) => {
    const node = document.getElementById("certificate-sheet");
    if (!node || !item) return;

    setQuickDownload(fmt);
    setPdfError("");

    try {
      await waitForCertificateAssets(node);
      await downloadCertificatePdf(node, fmt, `certificat-${item.code}-${fmt}.pdf`);
    } catch (err) {
      console.error("Erreur PDF:", err);
      setPdfError("Impossible de générer le PDF.");
    } finally {
      setQuickDownload(null);
    }
  };

  // Juste après la délivrance : envoi automatique à l'e-mail du titulaire (une seule fois), ou signal s'il n'en a pas
  useEffect(() => {
    if (!deliver || !item || deliverStarted.current) return;
    deliverStarted.current = true;

    // L'adresse est retirée de l'URL : un rafraîchissement de la page ne renvoie pas l'e-mail
    window.history.replaceState(window.history.state, "", window.location.pathname);

    if (item.revokedAt) return;

    if (!item.holderEmail?.trim()) {
      setMailState("no_email");
      return;
    }

    setMailTo(item.holderEmail.trim());
    void sendByEmail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliver, item]);

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
      setPdfError("Impossible de générer le PDF.");
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


        {/* Délivrance : état de l'envoi automatique par e-mail (A4 + A3) */}
        {item && mailState !== "idle" && (
          <div className="mx-auto mb-4 max-w-4xl print:hidden" role="status" aria-live="polite">
            {mailState === "sending" && (
              <div className="flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-medium" style={{ backgroundColor: "#1d4ed8", border: "2px solid #bfdbfe", color: "#ffffff" }}>
                <Loader2 className="h-5 w-5 shrink-0 animate-spin" style={{ color: "#ffffff" }} />
                <span>
                  Envoi du certificat en PDF (A4 et A3) à <strong>{mailTo}</strong>…
                </span>
              </div>
            )}

            {mailState === "sent" && (
              <div className="flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-medium" style={{ backgroundColor: "#1d4ed8", border: "2px solid #bfdbfe", color: "#ffffff" }}>
                <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: "#ffffff" }} />
                <span>
                  Certificat envoyé par e-mail à <strong>{mailTo}</strong> : un fichier PDF A4 et un fichier PDF A3 en pièces jointes.
                </span>
              </div>
            )}

            {(mailState === "no_email" || mailState === "not_configured" || mailState === "failed") && (
              <div className="rounded-2xl px-5 py-4 text-sm font-medium" style={{ backgroundColor: "#1d4ed8", border: "2px solid #bfdbfe", color: "#ffffff" }}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "#ffffff" }} />
                  <div className="space-y-1">
                    {mailState === "no_email" && (
                      <>
                        <p className="font-semibold">Aucune adresse e-mail dans la base de données pour {item.holderName}.</p>
                        <p>Envoi automatique impossible. Téléchargez-le et remettez-le à la personne.</p>
                      </>
                    )}
                    {mailState === "not_configured" && (
                      <>
                        <p className="font-semibold">L&apos;envoi d&apos;e-mail n&apos;est pas configuré sur le serveur.</p>
                        <p>Le certificat n&apos;a pas été envoyé à {mailTo || "l'adresse du titulaire"}. Téléchargez-le ici (voir SMTP_USER / SMTP_PASS).</p>
                      </>
                    )}
                    {mailState === "failed" && (
                      <>
                        <p className="font-semibold">L&apos;envoi à {mailTo || "l'adresse du titulaire"} a échoué.</p>
                        <p>{mailError || "Réessayez, ou téléchargez le certificat ici."}</p>
                      </>
                    )}
                    {pdfError && <p className="font-bold" style={{ color: "#fecaca" }}>{pdfError}</p>}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 pl-8">
                  {(Object.keys(PDF_FORMATS) as PdfFormat[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => void quickDownloadPdf(key)}
                      disabled={quickDownload !== null}
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition hover:opacity-80 disabled:opacity-60"
                      style={{ backgroundColor: "#ffffff", border: "2px solid #ffffff", color: "#1d4ed8" }}
                    >
                      {quickDownload === key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      Télécharger {key}
                    </button>
                  ))}

                  {mailState === "failed" && (
                    <button
                      type="button"
                      onClick={() => void sendByEmail()}
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition hover:opacity-80"
                      style={{ backgroundColor: "#ffffff", border: "2px solid #ffffff", color: "#1d4ed8" }}
                    >
                      <Mail className="h-4 w-4" /> Réessayer l&apos;envoi
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

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
                  {/* Logos : 4 par ligne (Ndao Hifanosika en premier, puis les partenaires), la 5e va à la ligne suivante */}
                  <div className="flex flex-col items-center gap-y-4">
                    {(() => {
                      type HeaderLogo = { key: string; kind: "org" } | { key: string; kind: "partner"; partner: NonNullable<Certificate["partnerLinks"]>[number] };
                      const logos: HeaderLogo[] = [
                        { key: "org", kind: "org" },
                        ...(item.partnerLinks ?? []).map((partner): HeaderLogo => ({ key: `p${partner.id}`, kind: "partner", partner })),
                      ];
                      const rows: HeaderLogo[][] = [];
                      for (let i = 0; i < logos.length; i += 4) rows.push(logos.slice(i, i + 4));

                      return rows.map((row, r) => (
                        <div key={r} className="flex items-start justify-center gap-x-5">
                          {row.map((logo, i) => (
                            <Fragment key={logo.key}>
                              {i > 0 && <span className="h-14 w-px self-start bg-[#1B9AA0]/40" aria-hidden="true" />}
                              {logo.kind === "org" ? (
                                <div className="flex w-[130px] flex-col items-center">
                                  <div className="flex h-14 items-center justify-center">
                                    <Logo print size={56} withText={false} />
                                  </div>
                                  <p className="mt-1 text-[11px] font-semibold text-[#0A4A70]">Ndao Hifanosika</p>
                                  <p className="text-[10px] text-gray-500">« Suivi &amp; Évaluation »</p>
                                </div>
                              ) : (
                                <div className="flex w-[130px] flex-col items-center">
                                  <div className="flex h-14 w-full items-center justify-center">
                                    {logo.partner.logoSnapshot ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={logo.partner.logoSnapshot} alt={logo.partner.nameSnapshot} className="max-h-14 max-w-[120px] object-contain" />
                                    ) : (
                                      <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#0F6BA0] text-lg font-bold text-[#0F6BA0]">
                                        {logo.partner.nameSnapshot.slice(0, 2).toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-1 text-[11px] font-semibold text-gray-800">{logo.partner.nameSnapshot}</p>
                                  {logo.partner.sloganSnapshot && <p className="text-[10px] italic text-gray-500">« {logo.partner.sloganSnapshot} »</p>}
                                </div>
                              )}
                            </Fragment>
                          ))}
                        </div>
                      ));
                    })()}
                  </div>

                  {/* Slogans : juste sous les logos, un par projet (nom du projet au-dessus, son slogan en dessous) */}
                  {showSlogans && item.projectSlogans && item.projectSlogans.length > 0 ? (
                    <div className="mx-auto mt-3 flex max-w-3xl flex-wrap items-start justify-center gap-x-6 gap-y-2">
                      {item.projectSlogans.map((ps, i) => (
                        <div key={`${ps.name}-${i}`} className="flex flex-col items-center">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{ps.name}</span>
                          <span className="font-serif text-sm italic text-[#1B9AA0]">« {ps.slogan} »</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    item.slogan && showSlogans && (
                      <div className="mx-auto mt-3 flex max-w-2xl flex-col items-center">
                        {item.project?.name && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{item.project.name}</span>
                        )}
                        <span className="font-serif text-sm italic text-[#1B9AA0]">« {item.slogan} »</span>
                      </div>
                    )
                  )}

                  <p className="mt-2 text-[11px] text-gray-500">{ORG.name} — {ORG.address}</p>
                  {orgContactLine() && <p className="text-[11px] text-gray-500">{orgContactLine()}</p>}

                  {/* Titre */}
                  <h1 className="mt-4 text-4xl font-extrabold uppercase tracking-[0.18em] text-[#0F6BA0]">
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
                  {/* Titulaire */}
                  <p className="mt-4 text-sm text-gray-600">L&apos;ONG Ndao Hifanosika certifie que</p>
                  <p className="mx-auto mt-1 w-fit border-b-2 border-[#1B9AA0]/50 max-w-full px-6 pb-1 font-serif text-3xl font-bold text-[#0A4A70] [overflow-wrap:anywhere]">
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
                        {/* Heure alignée à droite : les secondes tombent sous le dernier chiffre de la date (« 6 » de 2026) */}
                        <p className="mt-0.5 text-right text-[11px] text-gray-500">
                          à <strong className="font-mono text-gray-700">{formatIssued(item.createdAt).time}</strong>
                        </p>
                      </div>
                      <div className="flex items-center gap-5">
                        {/* Cachet réduit à 144 px, décalé à droite de 56 px et remonté de 22 px :
                            son bord inférieur est aligné sur la ligne « Ndao Hifanosika ». */}
                        <div className="relative -my-6 translate-x-[calc(3.5rem+0.5cm)] -translate-y-[22px]">
                          <Cachet />
                        </div>
                        <div className="text-center text-xs">
                          {/* Espace réservé à la signature de la Direction (image : public/images/signature.png) */}
                          <div className="flex h-16 w-48 items-end justify-center border-b border-gray-400 pb-0.5">
                            <Signature />
                          </div>
                          <p className="mt-1 font-semibold text-gray-800">Le responsable</p>
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
