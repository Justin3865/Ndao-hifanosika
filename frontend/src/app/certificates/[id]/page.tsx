"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import api from "@/lib/axios";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
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

  const verifyUrl = item ? `${origin}/verify/${item.code}` : "";

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-0">
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
          <div className="relative mx-auto max-w-4xl border-[10px] border-double border-blue-900 bg-white p-12 text-center shadow-xl print:shadow-none">
            {item.revokedAt && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="-rotate-12 rounded-2xl border-8 border-red-500/60 px-10 py-4 text-6xl font-black uppercase text-red-500/60">Révoqué</span>
              </div>
            )}

            <div className="flex justify-center"><Logo size={72} /></div>

            <h1 className="mt-8 text-4xl font-bold uppercase tracking-widest text-blue-900">{HEADLINE[item.type] ?? "Certificat"}</h1>
            <div className="mx-auto mt-4 h-1 w-32 rounded bg-amber-400" />

            <p className="mt-10 text-lg text-gray-600">L&apos;association Ndao Hifanosika certifie que</p>
            <p className="mt-4 text-3xl font-bold text-gray-900">{item.holderName}</p>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-700">
              a accompli avec sérieux la mission suivante : <strong>« {item.title} »</strong>
              {item.startDate || item.endDate ? <>, du <strong>{fmtDate(item.startDate)}</strong> au <strong>{fmtDate(item.endDate)}</strong></> : null}.
            </p>

            {item.description && <p className="mx-auto mt-4 max-w-2xl text-sm italic text-gray-500">{item.description}</p>}

            <div className="mt-14 flex items-end justify-between px-4 text-sm text-gray-700">
              <div className="text-left">
                <QrCode value={verifyUrl || item.code} size={120} />
                <p className="mt-1 text-[11px] text-gray-500">Scannez pour vérifier l&apos;authenticité</p>
              </div>

              <div className="text-center">
                <div className="mb-12 w-48 border-b border-gray-400 pb-1">La Direction</div>
                Ndao Hifanosika
              </div>
            </div>

            <p className="mt-8 text-xs text-gray-500">
              Délivré le {fmtDate(item.createdAt)} — Code <span className="font-mono font-semibold text-blue-900">{item.code}</span>
              <br />
              Vérification : {verifyUrl}
            </p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
