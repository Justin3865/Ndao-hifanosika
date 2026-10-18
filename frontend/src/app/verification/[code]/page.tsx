"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BadgeCheck, Loader2, ShieldAlert, ShieldX } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { fmtDate } from "@/lib/crud";
import { API_URL } from "@/lib/socket";

interface Result {
  status: "VALID" | "REVOKED" | "NOT_FOUND";
  data?: {
    code: string;
    holderName: string;
    title: string;
    startDate?: string | null;
    endDate?: string | null;
    issuedAt: string;
  };
}

export default function VerifyCertificatePage() {
  const params = useParams<{ code: string }>();
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/public/certificates/${encodeURIComponent(params.code)}`)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        setResult({ status: json.status ?? "NOT_FOUND", data: json.data });
      })
      .catch(() => setResult({ status: "NOT_FOUND" }));
  }, [params.code]);

  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-blue-950 via-blue-900 to-blue-700 px-4 py-12">
      <Logo light size={48} />

      <div className="mt-10 w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
        {!result && <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-700" />}

        {result?.status === "VALID" && result.data && (
          <>
            <BadgeCheck className="mx-auto h-16 w-16 text-green-600" />
            <h1 className="mt-3 text-2xl font-bold text-green-700">Certificat authentique</h1>
            <p className="mt-6 text-sm text-gray-500">Délivré à</p>
            <p className="text-2xl font-bold text-gray-900">{result.data.holderName}</p>
            <p className="mt-3 text-gray-700">« {result.data.title} »</p>
            <p className="mt-2 text-sm text-gray-500">
              {result.data.startDate || result.data.endDate ? `${fmtDate(result.data.startDate)} → ${fmtDate(result.data.endDate)} · ` : ""}
              délivré le {fmtDate(result.data.issuedAt)}
            </p>
            <p className="mt-5 font-mono text-xs text-blue-900">{result.data.code}</p>
          </>
        )}

        {result?.status === "REVOKED" && (
          <>
            <ShieldAlert className="mx-auto h-16 w-16 text-amber-500" />
            <h1 className="mt-3 text-2xl font-bold text-amber-700">Certificat révoqué</h1>
            <p className="mt-3 text-sm text-gray-600">Ce certificat a été annulé par Ndao Hifanosika et n&apos;est plus valable.</p>
          </>
        )}

        {result?.status === "NOT_FOUND" && (
          <>
            <ShieldX className="mx-auto h-16 w-16 text-red-500" />
            <h1 className="mt-3 text-2xl font-bold text-red-700">Certificat introuvable</h1>
            <p className="mt-3 text-sm text-gray-600">Ce code ne correspond à aucun certificat délivré par Ndao Hifanosika.</p>
          </>
        )}
      </div>
    </main>
  );
}
