"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Printer } from "lucide-react";
import api from "@/lib/axios";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Logo } from "@/components/brand/Logo";
import { errorMessage, fmtDate } from "@/lib/crud";

interface Certificate {
  internshipId: number; internName: string; title: string; project: string;
  supervisor: string | null; startDate?: string | null; endDate?: string | null;
  code: string; verifyUrl: string; qr: string;
}

export default function CertificatePage() {
  const params = useParams<{ id: string }>();
  const [cert, setCert] = useState<Certificate | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/certificates/internship/${params.id}`)
      .then((res) => setCert(res.data?.data ?? null))
      .catch((err) => setError(errorMessage(err, "Certificat indisponible.")));
  }, [params.id]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-0">
        <div className="mx-auto mb-4 flex max-w-4xl justify-end print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!cert}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-800 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            <Printer className="h-4 w-4" /> Imprimer / Enregistrer en PDF
          </button>
        </div>

        {error && <p className="mx-auto max-w-xl rounded-xl bg-amber-50 p-4 text-center text-amber-800">{error}</p>}

        {cert && (
          <div className="mx-auto max-w-4xl border-[10px] border-double border-blue-900 bg-white p-12 text-center shadow-xl print:shadow-none">
            <div className="flex justify-center"><Logo size={72} /></div>
            <h1 className="mt-8 text-4xl font-bold uppercase tracking-widest text-blue-900">Certificat de stage</h1>
            <div className="mx-auto mt-4 h-1 w-32 rounded bg-amber-400" />

            <p className="mt-10 text-lg text-gray-600">L&apos;association Ndao Hifanosika certifie que</p>
            <p className="mt-4 text-3xl font-bold text-gray-900">{cert.internName}</p>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-700">
              a accompli avec succès un stage intitulé <strong>« {cert.title} »</strong>
              {cert.project && cert.project !== cert.title ? ` dans le cadre du projet « ${cert.project} »` : ""}, du{" "}
              <strong>{fmtDate(cert.startDate)}</strong> au <strong>{fmtDate(cert.endDate)}</strong>.
            </p>

            <div className="mt-14 flex items-end justify-between px-8 text-sm text-gray-700">
              <div className="text-left">
                <div className="mb-12 border-b border-gray-400 pb-1">Le tuteur</div>
                {cert.supervisor ?? ""}
              </div>
              <div className="flex flex-col items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cert.qr} alt="QR code de vérification" className="h-32 w-32" />
                <p className="mt-1 text-[11px] text-gray-500">Scannez pour vérifier l&apos;authenticité</p>
              </div>
              <div className="text-right">
                <div className="mb-12 border-b border-gray-400 pb-1">La Direction</div>
                Ndao Hifanosika
              </div>
            </div>

            <p className="mt-8 text-xs text-gray-500">
              Délivré le {new Date().toLocaleDateString("fr-FR")} — Code : <strong>{cert.code}</strong>
            </p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
