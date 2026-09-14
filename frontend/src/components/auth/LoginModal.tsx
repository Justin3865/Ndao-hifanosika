"use client";

import Image from "next/image";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogIn,
  Mail,
  X,
} from "lucide-react";
import { FormEvent } from "react";

type LoginModalProps = {
  loginEmail: string;
  setLoginEmail: (value: string) => void;
  loginPassword: string;
  setLoginPassword: (value: string) => void;
  rememberMe: boolean;
  setRememberMe: (value: boolean) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  isLoading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  onForgot: () => void;
  onRegister: () => void;
};

export default function LoginModal({
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  rememberMe,
  setRememberMe,
  showPassword,
  setShowPassword,
  isLoading,
  onSubmit,
  onClose,
  onForgot,
  onRegister,
}: LoginModalProps) {
  return (
    <div
      className="relative my-auto w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
      role="document"
    >
      <button
        type="button"
        onClick={onClose}
        disabled={isLoading}
        className="absolute right-4 top-4 z-30 rounded-xl bg-white/90 p-2 text-gray-500 shadow hover:text-gray-900"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="bg-gradient-to-br from-blue-700 to-indigo-700 px-6 py-8 text-center text-white sm:px-8">
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

        <h2 className="mt-4 text-2xl font-bold">
          Connexion
        </h2>

        <p className="mt-2 text-sm text-blue-100">
          Accédez à votre espace Ndao Hifanosika
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-5 p-6 sm:p-8"
      >
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Adresse e-mail
          </label>

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-gray-400" />

            <input
              type="email"
              value={loginEmail}
              onChange={(event) =>
                setLoginEmail(event.target.value)
              }
              placeholder="exemple@email.com"
              autoComplete="email"
              disabled={isLoading}
              required
              className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Mot de passe
          </label>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-gray-400" />

            <input
              type={showPassword ? "text" : "password"}
              value={loginPassword}
              onChange={(event) =>
                setLoginPassword(event.target.value)
              }
              placeholder="Votre mot de passe"
              autoComplete="current-password"
              disabled={isLoading}
              required
              className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-12 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
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

        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) =>
                setRememberMe(event.target.checked)
              }
              disabled={isLoading}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />

            Se souvenir de moi
          </label>

          <button
            type="button"
            onClick={onForgot}
            disabled={isLoading}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Mot de passe oublié ?
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Connexion...
            </>
          ) : (
            <>
              <LogIn className="h-5 w-5" />
              Se connecter
            </>
          )}
        </button>

        <div className="border-t border-gray-100 pt-5 text-center">
          <p className="text-sm text-gray-500">
            Vous n'avez pas encore de compte ?
          </p>

          <button
            type="button"
            onClick={onRegister}
            disabled={isLoading}
            className="mt-1 font-semibold text-blue-600 hover:underline"
          >
            Créer un compte
          </button>
        </div>
      </form>
    </div>
  );
}