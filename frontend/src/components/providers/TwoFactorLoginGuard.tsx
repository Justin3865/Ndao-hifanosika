"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { KeyRound, Loader2, ShieldCheck, X } from "lucide-react";

/**
 * Deuxième étape de connexion (code de l'application d'authentification).
 *
 * Les formulaires de connexion appellent POST /auth/login avec fetch. Quand le compte a activé la
 * 2FA, le serveur répond « requiresTwoFactor » : ce composant intercepte cette réponse, demande le
 * code dans une fenêtre, renvoie la requête avec le code, puis rend la réponse finale au formulaire,
 * comme si la connexion s'était faite en une seule étape. Aucun formulaire n'a besoin d'être modifié.
 */

const LOGIN_URL = /\/auth\/login(?:\?.*)?$/;
const MAX_ATTEMPTS = 10;

interface Dialog {
  open: boolean;
  error: string;
  busy: boolean;
}

export function TwoFactorLoginGuard() {
  const [dialog, setDialog] = useState<Dialog>({ open: false, error: "", busy: false });
  const [code, setCode] = useState("");
  const [backup, setBackup] = useState(false);
  const resolver = useRef<((value: string | null) => void) | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const original = window.fetch.bind(window);

    const ask = (error: string) =>
      new Promise<string | null>((resolve) => {
        resolver.current = resolve;
        setCode("");
        setDialog({ open: true, error, busy: false });
      });

    const guarded: typeof fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = (init?.method ?? (typeof input === "object" && "method" in input ? input.method : "GET")).toUpperCase();

      if (method !== "POST" || !LOGIN_URL.test(url) || typeof init?.body !== "string") {
        return original(input, init);
      }

      let payload: Record<string, unknown>;

      try {
        payload = JSON.parse(init.body) as Record<string, unknown>;
      } catch {
        return original(input, init);
      }

      let response = await original(input, init);

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        const data = (await response.clone().json().catch(() => null)) as { requiresTwoFactor?: boolean; twoFactorInvalid?: boolean; message?: string } | null;

        if (!data?.requiresTwoFactor && !data?.twoFactorInvalid) {
          setDialog({ open: false, error: "", busy: false });
          return response;
        }

        const entered = await ask(data.twoFactorInvalid ? (data.message ?? "Code incorrect.") : "");

        if (entered === null) {
          setDialog({ open: false, error: "", busy: false });

          return new Response(JSON.stringify({ success: false, message: "Connexion annulée : la vérification en deux étapes n'a pas été effectuée." }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        setDialog((current) => ({ ...current, busy: true }));
        response = await original(input, { ...init, body: JSON.stringify({ ...payload, twoFactorCode: entered }) });
      }

      setDialog({ open: false, error: "", busy: false });
      return response;
    };

    window.fetch = guarded;

    return () => {
      window.fetch = original;
    };
  }, []);

  useEffect(() => {
    if (dialog.open && !dialog.busy) inputRef.current?.focus();
  }, [dialog.open, dialog.busy, backup]);

  const valid = backup ? /^[A-Za-z0-9]{4}-?[A-Za-z0-9]{4}$/.test(code.trim()) : /^\d{6}$/.test(code.replace(/\s/g, ""));

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!valid || dialog.busy || !resolver.current) return;

    const resolve = resolver.current;
    resolver.current = null;
    resolve(backup ? code.trim().toUpperCase() : code.replace(/\s/g, ""));
  };

  const cancel = () => {
    const resolve = resolver.current;
    resolver.current = null;
    resolve?.(null);
  };

  // Envoi automatique dès le 6e chiffre
  useEffect(() => {
    if (!backup && dialog.open && !dialog.busy && /^\d{6}$/.test(code)) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (!dialog.open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="twofa-title">
      <form onSubmit={submit} className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={cancel}
          disabled={dialog.busy}
          className="absolute right-3 top-3 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Annuler"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          {backup ? <KeyRound className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
        </div>

        <h2 id="twofa-title" className="mt-4 text-center text-lg font-bold text-slate-900">
          Vérification en deux étapes
        </h2>
        <p className="mt-1 text-center text-sm text-slate-500">
          {backup
            ? "Saisissez l'un de vos codes de secours (format XXXX-XXXX). Chaque code ne sert qu'une fois."
            : "Ouvrez votre application d'authentification et saisissez le code à 6 chiffres affiché pour Ndao Hifanosika."}
        </p>

        <input
          ref={inputRef}
          value={code}
          onChange={(event) => setCode(backup ? event.target.value.toUpperCase().slice(0, 9) : event.target.value.replace(/[^\d\s]/g, "").slice(0, 7))}
          inputMode={backup ? "text" : "numeric"}
          autoComplete="one-time-code"
          placeholder={backup ? "XXXX-XXXX" : "000 000"}
          disabled={dialog.busy}
          className="mt-5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-2xl font-semibold tracking-[0.35em] text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />

        {dialog.error && <p className="mt-3 text-center text-sm text-red-600">{dialog.error}</p>}

        <button
          type="submit"
          disabled={!valid || dialog.busy}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {dialog.busy ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Vérification…
            </>
          ) : (
            "Valider"
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setBackup((value) => !value);
            setCode("");
          }}
          disabled={dialog.busy}
          className="mt-3 block w-full text-center text-sm font-medium text-blue-600 hover:underline"
        >
          {backup ? "Utiliser mon application d'authentification" : "Je n'ai pas mon téléphone : utiliser un code de secours"}
        </button>
      </form>
    </div>
  );
}
