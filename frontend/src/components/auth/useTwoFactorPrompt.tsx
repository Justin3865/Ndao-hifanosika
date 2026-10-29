"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { ShieldCheck, X } from "lucide-react";

/**
 * Fenêtre « Code de vérification » pour la connexion.
 * const { ask, prompt } = useTwoFactorPrompt();  →  postLogin(email, password, ask)  →  {prompt} dans le JSX
 */
export function useTwoFactorPrompt(): { ask: (error?: string) => Promise<string>; prompt: ReactNode } {
  const pending = useRef<{ resolve: (c: string) => void; reject: (e: Error) => void } | null>(null);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const ask = useCallback(
    (message?: string) =>
      new Promise<string>((resolve, reject) => {
        pending.current = { resolve, reject };
        setCode("");
        setError(message ?? "");
        setOpen(true);
      }),
    [],
  );

  const submit = () => {
    const p = pending.current;
    pending.current = null;
    setOpen(false);
    p?.resolve(code.trim());
  };

  const cancel = () => {
    const p = pending.current;
    pending.current = null;
    setOpen(false);
    p?.reject(new Error("Connexion annulée."));
  };

  const prompt: ReactNode = open ? (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="h-5 w-5 text-blue-400" /> Vérification en 2 étapes</h2>
          <button type="button" onClick={cancel} aria-label="Fermer" className="rounded-lg p-1.5 hover:bg-white/10"><X className="h-5 w-5" /></button>
        </div>
        <p className="mt-3 text-sm text-slate-300">Saisissez le code à 6 chiffres de votre application d&apos;authentification, ou un code de secours.</p>
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && code.trim().length >= 6 && submit()}
          autoComplete="one-time-code"
          placeholder="123 456"
          className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center font-mono text-xl tracking-widest outline-none focus:border-blue-500"
        />
        {error && <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
        <button
          type="button"
          disabled={code.trim().length < 6}
          onClick={submit}
          className="mt-5 w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          Vérifier
        </button>
      </div>
    </div>
  ) : null;

  return { ask, prompt };
}
