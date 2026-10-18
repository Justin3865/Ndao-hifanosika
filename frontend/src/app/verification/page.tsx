"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export default function VerifyIndexPage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (code.trim()) router.push(`/verify/${encodeURIComponent(code.trim().toUpperCase())}`);
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-blue-950 via-blue-900 to-blue-700 px-4 py-12">
      <Logo light size={48} />
      <form onSubmit={submit} className="mt-10 w-full max-w-md space-y-4 rounded-3xl bg-white p-8 shadow-2xl">
        <h1 className="text-xl font-bold text-gray-900">Vérifier un certificat</h1>
        <p className="text-sm text-gray-600">Saisissez le code inscrit sur le certificat (ou scannez son QR code).</p>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="NH-2026-XXXXXXXX" className="w-full rounded-xl border border-gray-300 px-4 py-3 font-mono uppercase outline-none focus:border-blue-600" />
        <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-800 py-3 font-semibold text-white"><Search className="h-4 w-4" /> Vérifier</button>
      </form>
    </main>
  );
}
