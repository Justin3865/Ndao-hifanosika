"use client";

import Image from "next/image";
import {
  Eye,
  EyeOff,
  Info,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  X,
} from "lucide-react";
import { FormEvent } from "react";

type RegisterModalProps = {
  registerNom: string;
  setRegisterNom: (value: string) => void;
  registerPrenom: string;
  setRegisterPrenom: (value: string) => void;
  registerEmail: string;
  setRegisterEmail: (value: string) => void;
  registerPassword: string;
  setRegisterPassword: (value: string) => void;
  registerConfirmPassword: string;
  setRegisterConfirmPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (value: boolean) => void;
  isLoading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  onLogin: () => void;
};

export default function RegisterModal({
  registerNom,
  setRegisterNom,
  registerPrenom,
  setRegisterPrenom,
  registerEmail,
  setRegisterEmail,
  registerPassword,
  setRegisterPassword,
  registerConfirmPassword,
  setRegisterConfirmPassword,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  isLoading,
  onSubmit,
  onClose,
  onLogin,
}: RegisterModalProps) {
  return (
    <div className="relative my-auto w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
      <button
        type="button"
        onClick={onClose}
        disabled={isLoading}
        className="absolute right-4 top-4 z-30 rounded-xl bg-white/90 p-2 text-gray-500 shadow hover:text-gray-900"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="bg-gradient-to-br from-blue-700 to-indigo-700 px-6 py-8 text-center text-white sm:px-10">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-xl ring-4 ring-white/20">
          <Image
            src="/logos/ndao-hifanosika.png"
            alt="Logo Ndao Hifanosika"
            width={80}
            height={80}
            priority
            className="h-20 w-20 rounded-full object-contain"
          />
        </div>

        <h2 className="mt-4 text-2xl font-bold sm:text-3xl">
          Créer un compte
        </h2>

        <p className="mt-2 text-sm text-blue-100">
          Rejoignez la plateforme Ndao Hifanosika
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-5 p-6 sm:p-10"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Nom
            </label>

            <input
              type="text"
              value={registerNom}
              onChange={(event) =>
                setRegisterNom(event.target.value)
              }
              placeholder="Votre nom"
              disabled={isLoading}
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Prénom
            </label>

            <input
              type="text"
              value={registerPrenom}
              onChange={(event) =>
                setRegisterPrenom(event.target.value)
              }
              placeholder="Votre prénom"
              disabled={isLoading}
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Adresse e-mail
          </label>

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-gray-400" />

            <input
              type="email"
              value={registerEmail}
              onChange={(event) =>
                setRegisterEmail(event.target.value)
              }
              placeholder="exemple@email.com"
              autoComplete="email"
              disabled={isLoading}
              required
              className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Mot de passe
            </label>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-gray-400" />

              <input
                type={showPassword ? "text" : "password"}
                value={registerPassword}
                onChange={(event) =>
                  setRegisterPassword(event.target.value)
                }
                placeholder="Minimum 8 caractères"
                autoComplete="new-password"
                disabled={isLoading}
                required
                minLength={8}
                className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-12 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Confirmer le mot de passe
            </label>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-gray-400" />

              <input
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                value={registerConfirmPassword}
                onChange={(event) =>
                  setRegisterConfirmPassword(
                    event.target.value
                  )
                }
                placeholder="Confirmez le mot de passe"
                autoComplete="new-password"
                disabled={isLoading}
                required
                className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-12 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    !showConfirmPassword
                  )
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

            <p className="text-sm leading-6 text-blue-700">
              Après votre inscription, votre compte sera placé en
              attente. Un administrateur devra le vérifier et
              l'activer avant votre première connexion.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Création du compte...
            </>
          ) : (
            <>
              <ShieldCheck className="h-5 w-5" />
              Créer mon compte
            </>
          )}
        </button>

        <div className="text-center text-sm text-gray-500">
          Vous avez déjà un compte ?

          <button
            type="button"
            onClick={onLogin}
            disabled={isLoading}
            className="ml-1 font-semibold text-blue-600 hover:underline"
          >
            Se connecter
          </button>
        </div>
      </form>
    </div>
  );
}