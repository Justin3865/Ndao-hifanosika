
"use client";

import Image from "next/image";
import { FormEvent } from "react";
import { Loader2, Mail, X } from "lucide-react";

type ForgotPasswordModalProps = {
  forgotEmail: string;
  setForgotEmail: (value: string) => void;
  isLoading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  onLogin: () => void;
};

export default function ForgotPasswordModal({
  forgotEmail,
  setForgotEmail,
  isLoading,
  onSubmit,
  onClose,
  onLogin,
}: ForgotPasswordModalProps) {
  return (
    <div className="relative my-auto w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
      <button
        type="button"
        onClick={onClose}
        disabled={isLoading}
        aria-label="Fermer"
        className="absolute right-4 top-4 z-30 rounded-xl bg-white/90 p-2 text-gray-500 shadow hover:text-gray-900 disabled:opacity-50"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="bg-gradient-to-br from-blue-600 to-cyan-600 px-6 py-8 text-center text-white sm:px-8">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-xl ring-4 ring-white/20">
          <Image
            src="/logos/ndao-hifanosika.png"
            alt="Logo Ndao Hifanosika"
            width={80}
            height={80}
            className="h-20 w-20 rounded-full object-contain"
            priority
          />
        </div>

        <h2 className="mt-4 text-2xl font-bold">
          Mot de passe oublié ?
        </h2>

        <p className="mt-2 text-sm text-blue-50">
          Recevez un lien sécurisé par e-mail.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5 p-6 sm:p-8">
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm leading-6 text-blue-700">
            Saisissez l’adresse e-mail associée à votre compte.
            Si un compte existe pour cette adresse, vous recevrez
            un lien pour créer un nouveau mot de passe.
            Vérifiez également votre dossier de courriers indésirables.
          </p>
        </div>

        <div>
          <label
            htmlFor="forgot-email"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Adresse e-mail
          </label>

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-gray-400" />

            <input
              id="forgot-email"
              name="email"
              type="email"
              value={forgotEmail}
              onChange={(event) =>
                setForgotEmail(event.target.value)
              }
              placeholder="exemple@email.com"
              autoComplete="email"
              disabled={isLoading}
              required
              className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-gray-100"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Envoi du lien...
            </>
          ) : (
            <>
              <Mail className="h-5 w-5" />
              Envoyer le lien
            </>
          )}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={onLogin}
            disabled={isLoading}
            className="text-sm font-semibold text-blue-600 hover:underline disabled:opacity-50"
          >
            ← Retour à la connexion
          </button>
        </div>
      </form>
    </div>
  );
}
