"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Printer } from "lucide-react";
import api from "@/lib/axios";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Logo } from "@/components/brand/Logo";
import { errorMessage, fmtDate } from "@/lib/crud";

interface Internship {
  id: number;
  title: string;
  status: string;
  institution?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  student?: { firstName: string; lastName: string };
  supervisor?: { firstName: string; lastName: string } | null;
  project?: { name: string } | null;
}

export default function CertificatePage() {
  const params = useParams<{ id: string }>();
  const [item, setItem] = useState<Internship | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/internships/${params.id}`)
      .then((res) => setItem(res.data?.data ?? null))
      .catch((err) => setError(errorMessage(err, "Stage introuvable.")));
  }, [params.id]);

  const ready = item?.status === "COMPLETED";

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-0">
        <div className="mx-auto mb-4 flex max-w-4xl justify-end print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!ready}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-800 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            <Printer className="h-4 w-4" /> Imprimer / Enregistrer en PDF
          </button>
        </div>

        {error && <p className="text-center text-red-600">{error}</p>}

        {item && !ready && (
          <p className="mx-auto max-w-xl rounded-xl bg-amber-50 p-4 text-center text-amber-800">
            Le certificat n&apos;est disponible que lorsque le stage est « Terminé » (statut actuel : {item.status}).
          </p>
        )}

        {item && ready && (
          <div className="mx-auto max-w-4xl border-[10px] border-double border-blue-900 bg-white p-12 text-center shadow-xl print:shadow-none">
            <div className="flex justify-center"><Logo size={72} /></div>

            <h1 className="mt-8 text-4xl font-bold uppercase tracking-widest text-blue-900">Certificat de stage</h1>
            <div className="mx-auto mt-4 h-1 w-32 rounded bg-amber-400" />

            <p className="mt-10 text-lg text-gray-600">L&apos;association Ndao Hifanosika certifie que</p>
            <p className="mt-4 text-3xl font-bold text-gray-900">
              {item.student?.firstName} {item.student?.lastName}
            </p>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-700">
              {item.institution ? `étudiant(e) à « ${item.institution} », ` : ""}
              a effectué un stage intitulé <strong>« {item.title} »</strong>
              {item.project?.name ? ` dans le cadre du projet « ${item.project.name} »` : ""}, du{" "}
              <strong>{fmtDate(item.startDate)}</strong> au <strong>{fmtDate(item.endDate)}</strong>.
            </p>

            <div className="mt-16 flex justify-between px-8 text-sm text-gray-700">
              <div>
                <div className="mb-12 border-b border-gray-400 pb-1">Le tuteur</div>
                {item.supervisor ? `${item.supervisor.firstName} ${item.supervisor.lastName}` : ""}
              </div>
              <div>
                <div className="mb-12 border-b border-gray-400 pb-1">La Direction</div>
                Ndao Hifanosika
              </div>
            </div>

            <p className="mt-10 text-xs text-gray-400">
              Délivré le {new Date().toLocaleDateString("fr-FR")} — Référence STG-{String(item.id).padStart(4, "0")}
            </p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
