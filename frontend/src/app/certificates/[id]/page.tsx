"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import api from "@/lib/axios";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ORG, orgContactLine } from "@/lib/org";
import { Logo } from "@/components/brand/Logo";
import { QrCode } from "@/components/ui/QrCode";
import { errorMessage, fmtDate } from "@/lib/crud";

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
}

const HEADLINE: Record<string, string> = {
  INTERNSHIP: "Certificat de stage",
  VOLUNTEER: "Certificat de bénévolat",
  STAFF: "Certificat de travail",
  TRAINING: "Attestation de formation",
};

/** Cachet officiel : déposez l'image (PNG fond transparent) dans frontend/public/images/cachet.png. */
function Cachet() {
  const [missing, setMissing] = useState(false);

  if (missing) {
    return (
      <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-blue-900/50 px-3 text-center text-[9px] font-semibold uppercase leading-tight text-blue-900/60">
        Cachet officiel de l&apos;association
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/images/cachet.png" alt="Cachet officiel de l'association" onError={() => setMissing(true)} className="h-24 w-24 object-contain" />;
}

export default function CertificatePage() {
  const params = useParams<{ id: string }>();
  const [item, setItem] = useState<Certificate | null>(null);
  const [error, setError] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);

    api
      .get(`/certificates/${params.id}`)
      .then((res) => setItem(res.data?.data ?? null))
      .catch((err) => setError(errorMessage(err, "Certificat introuvable.")));
  }, [params.id]);

  const verifyUrl = item ? `${origin}/verification/${item.code}` : "";

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-100 p-6 print:min-h-0 print:bg-white print:px-12 print:py-8">
        {/* Impression : marge de page à 0 => le navigateur n'ajoute plus l'URL, la date ni le titre en haut/bas */}
        <style>{`
          @page { size: A4 landscape; margin: 0; }
          @media print {
            html, body { height: auto !important; margin: 0 !important; }
            .cert-sheet { zoom: 0.92; break-inside: avoid; page-break-inside: avoid; }
          }
        `}</style>
        <div className="mx-auto mb-4 flex max-w-4xl items-center justify-between print:hidden">
          <Link href="/certificates" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Link>
          <button type="button" onClick={() => window.print()} disabled={!item} className="inline-flex items-center gap-2 rounded-xl bg-blue-800 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40">
            <Printer className="h-4 w-4" /> Imprimer / PDF
          </button>
        </div>

        {error && <p className="text-center text-red-600">{error}</p>}

        {item && (
          <div className="cert-sheet relative mx-auto max-w-4xl border-[8px] border-double border-blue-900 bg-white px-10 py-7 text-center shadow-xl print:shadow-none">
            {item.revokedAt && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="-rotate-12 rounded-2xl border-8 border-red-500/60 px-10 py-4 text-6xl font-black uppercase text-red-500/60">Révoqué</span>
              </div>
            )}

            <div className="flex justify-center"><Logo size={56} /></div>
            <p className="mt-2 text-lg font-bold uppercase tracking-wide text-blue-900">{ORG.name}</p>
            <p className="text-[11px] text-gray-500">{ORG.tagline} — {ORG.address}</p>
            {orgContactLine() && <p className="text-[11px] text-gray-500">{orgContactLine()}</p>}

            <h1 className="mt-5 text-3xl font-bold uppercase tracking-widest text-blue-900">{HEADLINE[item.type] ?? "Certificat"}</h1>
            <div className="mx-auto mt-2 h-1 w-28 rounded bg-amber-400" />
            <p className="mt-1 font-mono text-xs font-semibold text-blue-900">N° {item.code}</p>

            <p className="mt-5 text-base text-gray-600">L&apos;association Ndao Hifanosika certifie que</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{item.holderName}</p>

            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-gray-700">
              a accompli avec sérieux la mission suivante : <strong>« {item.title} »</strong>
              {item.startDate || item.endDate ? <>, du <strong>{fmtDate(item.startDate)}</strong> au <strong>{fmtDate(item.endDate)}</strong></> : null}.
            </p>

            {item.description && <p className="mx-auto mt-2 max-w-2xl text-xs italic text-gray-500">{item.description}</p>}

            <p className="mx-auto mt-3 max-w-2xl text-xs text-gray-600">
              En foi de quoi, le présent certificat lui est délivré pour servir et valoir ce que de droit.
            </p>

            <div className="mt-5 flex items-end justify-between px-2 text-sm text-gray-700">
              <div className="text-left">
                <QrCode value={verifyUrl || item.code} size={96} />
                <p className="mt-1 text-[10px] text-gray-500">Scannez pour vérifier l&apos;authenticité</p>
              </div>

              <div className="flex flex-col items-center gap-1">
                <p className="text-xs">Fait à {ORG.city}, le <strong>{fmtDate(item.createdAt)}</strong></p>
                <div className="flex items-center gap-5">
                  <Cachet />
                  <div className="text-center text-xs">
                    <div className="mb-10 w-44 border-b border-gray-400 pb-1">La Direction</div>
                    {ORG.name}
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-4 border-t border-gray-200 pt-2 text-[10px] text-gray-500">
              Vérification : {verifyUrl} — {ORG.name}, {ORG.address}{orgContactLine() ? ` — ${orgContactLine()}` : ""}
            </p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
