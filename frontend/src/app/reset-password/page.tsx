"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import authService from "@/services/auth.service";

function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!token) return setError("Le lien de réinitialisation est incomplet.");
    if (password.length < 12) return setError("Le mot de passe doit contenir au moins 12 caractères.");
    if (password !== confirmation) return setError("Les deux mots de passe ne correspondent pas.");
    setLoading(true);
    try {
      const response = await authService.resetPassword(token, password);
      setMessage(response?.message || "Mot de passe réinitialisé. Vous pouvez vous connecter.");
      setPassword("");
      setConfirmation("");
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || "Impossible de réinitialiser le mot de passe. Le lien est peut-être expiré.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-slate-50">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">Nouveau mot de passe</h1>
        <p className="mt-2 text-sm text-slate-600">Choisissez un mot de passe d’au moins 12 caractères.</p>
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</p>}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700">Nouveau mot de passe
            <input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
          </label>
          <label className="block text-sm font-medium text-slate-700">Confirmer le mot de passe
            <input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
          </label>
          <button type="submit" disabled={loading || !token} className="w-full rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white disabled:opacity-50">{loading ? "Réinitialisation…" : "Réinitialiser le mot de passe"}</button>
        </form>
        <p className="mt-5 text-sm"><Link href="/login" className="font-medium text-blue-700 hover:underline">Retour à la connexion</Link></p>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  // useSearchParams() exige une frontière Suspense pour que la page puisse être pré-rendue au build.
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
