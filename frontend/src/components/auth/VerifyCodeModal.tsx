"use client";

import Image from "next/image";
import {
  Loader2,
  Mail,
  ShieldCheck,
  X,
} from "lucide-react";
import { FormEvent } from "react";

type VerifyCodeModalProps = {
  forgotEmail: string;
  resetCode: string;
  setResetCode: (value: string) => void;
  isLoading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  onBack: () => void;
};

export default function VerifyCodeModal({
  forgotEmail,
  resetCode,
  setResetCode,
  isLoading,
  onSubmit,
  onClose,
  onBack,
}: VerifyCodeModalProps) {
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

      <div className="bg-gradient-to-br from-blue-700 to-indigo-700 px-6 py-8 text-center text-white sm:px-8">
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
          Code de vérification
        </h2>

        <p className="mt-2 text-sm text-blue-100">
          Vérifiez votre adresse e-mail
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-5 p-6 sm:p-8"
      >
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex gap-3">
            <Mail className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

            <p className="text-sm leading-6 text-blue-700">
              Un code à 6 chiffres a été envoyé à :
              <br />
              <strong>{forgotEmail}</strong>
            </p>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-center text-sm font-medium text-gray-700">
            Entrez le code reçu
          </label>

          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={resetCode}
            onChange={(event) =>
              setResetCode(
                event.target.value
                  .replace(/\D/g, "")
                  .slice(0, 6)
              )
            }
            placeholder="000000"
            disabled={isLoading}
            required
            className="w-full rounded-xl border border-gray-300 px-4 py-4 text-center text-2xl font-bold tracking-[0.5em] outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <button
          type="submit"
          disabled={
            isLoading || resetCode.length !== 6
          }
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Vérification...
            </>
          ) : (
            <>
              <ShieldCheck className="h-5 w-5" />
              Vérifier le code
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="w-full text-sm font-semibold text-blue-600 hover:underline"
        >
          ← Renvoyer un nouveau code
        </button>
      </form>
    </div>
  );
}