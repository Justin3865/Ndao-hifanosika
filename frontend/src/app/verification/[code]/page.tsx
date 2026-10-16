"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BadgeCheck, ShieldX } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

/** Page PUBLIQUE ouverte par le scan du QR code du certificat. */
export default function VerificationPage() {
  const { code } = useParams<{ code: string }>();
  const [state, setState] = useState<"loading" | "valid" | "invalid">("loading");
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`${API}/public/certificates/${encodeURIComponent(code)}`)
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.valid) { setData(j.data); setState("valid"); } else setState("invalid");
      })
      .catch(() => setState("invalid"));
  }, [code]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
        {state === "loading" && <p className="text-gray-500">Vérification en cours…</p>}
        {state === "valid" && data && (
          <>
            <BadgeCheck className="mx-auto h-16 w-16 text-green-600" />
            <h1 className="mt-4 text-2xl font-bold text-gray-900">Certificat authentique</h1>
            <p className="mt-6 text-xl font-semibold">{data.internName}</p>
            <p className="mt-2 text-gray-600">{data.project}</p>
            <p className="mt-2 text-sm text-gray-500">Du {fmt(data.startDate)} au {fmt(data.endDate)}</p>
            <p className="mt-6 text-xs text-gray-400">Code : {data.code} — délivré par Ndao Hifanosika</p>
          </>
        )}
        {state === "invalid" && (
          <>
            <ShieldX className="mx-auto h-16 w-16 text-red-600" />
            <h1 className="mt-4 text-2xl font-bold text-gray-900">Certificat non reconnu</h1>
            <p className="mt-3 text-gray-600">Ce code ne correspond à aucun certificat délivré par Ndao Hifanosika.</p>
          </>
        )}
      </div>
    </main>
  );
}
