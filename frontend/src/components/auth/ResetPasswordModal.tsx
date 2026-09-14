"use client";

import Image from "next/image";
import {
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  Loader2,
  X,
} from "lucide-react";
import { FormEvent } from "react";

type ResetPasswordModalProps = {
  newPassword: string;
  setNewPassword: (value: string) => void;
  confirmNewPassword: string;
  setConfirmNewPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (value: boolean) => void;
  isLoading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
};

export default function ResetPasswordModal({
  newPassword,
  setNewPassword,
  confirmNewPassword,
  setConfirmNewPassword,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  isLoading,
  onSubmit,
  onClose,
}: ResetPasswordModalProps) {
  return (
    <div className="relative my-auto w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
      <button
        type="button"
        onClick={onClose}
        disabled={isLoading}
        className="absolute right-4 top-4 z-30 rounded-xl bg-white/90 p-2 text-gray-500 shadow hover:text-gray-900"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="bg-gradient-to-br from-blue-700 to-cyan-600 px-6 py-8 text-center text-white sm:px-8">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-xl ring-4 ring-white/20">
          <Image
            src="/logos/ndao-hifanosika.png"
            alt="Logo Ndao Hifanosika"
            width={80}
            height={80}
            className="h-20 w-20 rounded-full object-contain"
          />
        </div>

        <h2 className="mt-4 text-2xl font-bold">
          Nouveau mot de passe
        </h2>

        <p className="mt-2 text-sm text-blue-50">
          Choisissez votre nouveau mot de passe
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-5 p-6 sm:p-8"
      >
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Nouveau mot de passe
          </label>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-gray-400" />

            <input
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(event) =>
                setNewPassword(event.target.value)
              }
              placeholder="Minimum 8 caractères"
              autoComplete="new-password"
              minLength={8}
              disabled={isLoading}
              required
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
            Confirmer le nouveau mot de passe
          </label>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-gray-400" />

            <input
              type={
                showConfirmPassword
                  ? "text"
                  : "password"
              }
              value={confirmNewPassword}
              onChange={(event) =>
                setConfirmNewPassword(
                  event.target.value
                )
              }
              placeholder="Confirmez le nouveau mot de passe"
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

        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

            <p className="text-sm leading-6 text-blue-700">
              Votre mot de passe doit contenir au minimum 8 caractères.
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
              Modification...
            </>
          ) : (
            <>
              <ShieldCheck className="h-5 w-5" />
              Modifier le mot de passe
            </>
          )}
        </button>
      </form>
    </div>
  );
}