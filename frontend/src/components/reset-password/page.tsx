
"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { KeyRound, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
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

    if (!token) {
      setError(
        "Le lien de réinitialisation est incomplet. Demandez un nouveau lien."
      );
      return;
    }

    if (password.length < 12 || password.length > 128) {
      setError(
        "Le mot de passe doit contenir entre 12 et 128 caractères."
      );
      return;
    }

    if (password !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      const response = await authService.resetPassword(
        token,
        password
      );

      setMessage(
        response?.message ||
          "Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter."
      );

      setPassword("");
      setConfirmation("");
    } catch (e: unknown) {
      const err = e as {
        response?: {
          data?: {
            message?: string;
          };
        };
        message?: string;
      };

      setError(
        err.response?.data?.message ||
          err.message ||
          "Impossible de réinitialiser le mot de passe. Le lien est peut-être invalide ou expiré."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <KeyRound className="h-8 w-8 text-blue-700" />
          </div>
        </div>

        <h1 className="text-center text-2xl font-bold text-slate-900">
          Nouveau mot de passe
        </h1>

        <p className="mt-2 text-center text-sm leading-6 text-slate-600">
          Choisissez un nouveau mot de passe sécurisé pour votre
          compte Ndao Hifanosika.
        </p>

        {!token && (
          <div
            role="alert"
            className="mt-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>
              Le lien de réinitialisation ne contient pas de jeton
              valide. Demandez un nouveau lien depuis la page de
              connexion.
            </p>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mt-6 flex gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p>{message}</p>
          </div>
        )}

        {!message && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="new-password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Nouveau mot de passe
              </label>

              <input
                id="new-password"
                name="new-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                disabled={loading || !token}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                placeholder="12 caractères minimum"
              />

              <p className="mt-1 text-xs text-slate-500">
                Utilisez entre 12 et 128 caractères.
              </p>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Confirmer le mot de passe
              </label>

              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
                value={confirmation}
                onChange={(event) =>
                  setConfirmation(event.target.value)
                }
                disabled={loading || !token}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                placeholder="Confirmez le mot de passe"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Réinitialisation...
                </>
              ) : (
                "Réinitialiser le mot de passe"
              )}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm">
          <Link
            href="/login"
            className="font-medium text-blue-700 hover:underline"
          >
            ← Retour à la connexion
          </Link>
        </p>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
