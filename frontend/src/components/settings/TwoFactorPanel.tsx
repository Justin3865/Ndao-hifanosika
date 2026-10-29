"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Check, Copy, Download, KeyRound, Loader2, Lock, ShieldCheck, ShieldOff, Smartphone } from "lucide-react";
import api from "@/lib/axios";
import { errorMessage } from "@/lib/crud";
import { useSettings } from "@/components/providers/settings-provider";

interface Status {
  enabled: boolean;
  enabledAt: string | null;
  backupCodesLeft: number;
  pendingSetup: boolean;
}

interface Setup {
  secret: string;
  otpauthUrl: string;
  qrDataUrl: string | null;
  issuer: string;
  account: string;
}

type View = "idle" | "setup" | "codes" | "disable" | "regenerate";

const input =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
const primary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";
const secondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

/** Clé affichée par groupes de 4 pour faciliter la saisie manuelle. */
const grouped = (secret: string) => secret.replace(/(.{4})/g, "$1 ").trim();

/** Activation, désactivation et codes de secours de l'authentification à deux facteurs (TOTP). */
export function TwoFactorPanel() {
  const { setTwoFactorEnabled } = useSettings();

  const [status, setStatus] = useState<Status | null>(null);
  const [view, setView] = useState<View>("idle");
  const [setup, setSetup] = useState<Setup | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api.get("/settings/2fa");
      const data = res.data?.data as Status;

      setStatus(data);
      setTwoFactorEnabled(data.enabled);
    } catch (err) {
      setError(errorMessage(err, "Impossible de lire l'état de l'authentification à deux facteurs."));
    }
  }, [setTwoFactorEnabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const reset = () => {
    setView("idle");
    setSetup(null);
    setCode("");
    setPassword("");
    setError("");
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 2000);
    } catch {
      setError("Copie impossible : sélectionnez le texte à la main.");
    }
  };

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError("");

    try {
      await task();
    } catch (err) {
      setError(errorMessage(err, "Opération impossible."));
    } finally {
      setBusy(false);
    }
  };

  /* Étape 1 : clé + QR code */
  const start = () =>
    run(async () => {
      const res = await api.post("/settings/2fa/setup");
      setSetup(res.data.data as Setup);
      setCode("");
      setView("setup");
    });

  /* Étape 2 : premier code -> activation + codes de secours */
  const confirm = (event: FormEvent) => {
    event.preventDefault();

    void run(async () => {
      const res = await api.post("/settings/2fa/enable", { code: code.replace(/\s/g, "") });

      setCodes(res.data.data.backupCodes as string[]);
      setSetup(null);
      setCode("");
      setView("codes");
      await load();
    });
  };

  const disable = (event: FormEvent) => {
    event.preventDefault();

    void run(async () => {
      await api.post("/settings/2fa/disable", { password, code: code.trim() });
      reset();
      await load();
    });
  };

  const regenerate = (event: FormEvent) => {
    event.preventDefault();

    void run(async () => {
      const res = await api.post("/settings/2fa/backup-codes", { password, code: code.trim() });

      setCodes(res.data.data.backupCodes as string[]);
      setPassword("");
      setCode("");
      setView("codes");
      await load();
    });
  };

  const download = () => {
    const blob = new Blob(
      [`Ndao Hifanosika — codes de secours (chaque code ne sert qu'une fois)\n\n${codes.join("\n")}\n`],
      { type: "text/plain;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "ndao-codes-de-secours.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!status) {
    return (
      <div className="flex items-center gap-2 px-6 py-5 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        {error && <span className="text-red-600">{error}</span>}
      </div>
    );
  }

  return (
    <div className="px-6 py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl ${status.enabled ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-500"}`}>
            {status.enabled ? <ShieldCheck className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
          </div>

          <div>
            <p className="font-semibold text-slate-900">Authentification à deux facteurs</p>
            <p className="text-sm text-slate-500">
              {status.enabled
                ? `Activée${status.enabledAt ? ` le ${new Date(status.enabledAt).toLocaleDateString("fr-FR")}` : ""} · ${status.backupCodesLeft} code(s) de secours restant(s)`
                : "Un code temporaire de votre application d'authentification (Google Authenticator, Microsoft Authenticator, Authy…) sera demandé à chaque connexion."}
            </p>
          </div>
        </div>

        {view === "idle" && !status.enabled && (
          <button type="button" onClick={start} disabled={busy} className={primary}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />} Activer
          </button>
        )}

        {view === "idle" && status.enabled && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setError(""); setView("regenerate"); }} className={secondary}>
              <KeyRound className="h-4 w-4" /> Nouveaux codes de secours
            </button>
            <button type="button" onClick={() => { setError(""); setView("disable"); }} className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50">
              <ShieldOff className="h-4 w-4" /> Désactiver
            </button>
          </div>
        )}
      </div>

      {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {/* ---------- Étape 1 + 2 : scanner puis confirmer ---------- */}
      {view === "setup" && setup && (
        <form onSubmit={confirm} className="mt-5 space-y-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <ol className="space-y-5 text-sm text-slate-700">
            <li>
              <p className="font-semibold text-slate-900">1. Ajoutez le compte dans votre application d&apos;authentification</p>

              <div className="mt-3 flex flex-wrap items-center gap-5">
                {setup.qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={setup.qrDataUrl} alt="QR code à scanner" className="h-40 w-40 rounded-xl border border-slate-200 bg-white p-2" />
                ) : (
                  <p className="max-w-xs text-xs text-slate-500">
                    QR code indisponible sur ce serveur : saisissez la clé ci-contre dans votre application (« Ajouter un compte » › « Saisir une clé de configuration »).
                  </p>
                )}

                <div className="min-w-0 space-y-2">
                  <p className="text-xs text-slate-500">Impossible de scanner ? Saisissez cette clé (type : basé sur le temps) :</p>
                  <p className="break-all rounded-lg bg-white px-3 py-2 font-mono text-sm font-semibold tracking-wider text-slate-900">{grouped(setup.secret)}</p>

                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => copy(setup.secret, "key")} className={`${secondary} !px-3 !py-1.5 text-xs`}>
                      {copied === "key" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copier la clé
                    </button>

                    <a href={setup.otpauthUrl} className={`${secondary} !px-3 !py-1.5 text-xs`}>
                      <Smartphone className="h-3.5 w-3.5" /> Ouvrir dans l&apos;application (téléphone)
                    </a>
                  </div>
                </div>
              </div>
            </li>

            <li>
              <p className="font-semibold text-slate-900">2. Saisissez le code à 6 chiffres affiché</p>

              <input
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/[^\d\s]/g, "").slice(0, 7))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000 000"
                className={`${input} mt-3 max-w-[12rem] text-center text-xl font-semibold tracking-[0.3em]`}
              />
            </li>
          </ol>

          <div className="flex gap-3">
            <button type="submit" disabled={busy || !/^\d{6}$/.test(code.replace(/\s/g, ""))} className={primary}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Vérifier et activer
            </button>
            <button type="button" onClick={reset} disabled={busy} className={secondary}>
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* ---------- Codes de secours (affichés une seule fois) ---------- */}
      {view === "codes" && (
        <div className="mt-5 space-y-4 rounded-2xl border border-green-200 bg-green-50 p-5">
          <div>
            <p className="font-semibold text-green-900">Conservez vos codes de secours</p>
            <p className="text-sm text-green-800">
              Chaque code ne fonctionne qu&apos;une fois et remplace l&apos;application si vous perdez votre téléphone. Ils ne seront plus affichés ensuite.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {codes.map((item) => (
              <code key={item} className="rounded-lg bg-white px-3 py-2 text-center font-mono text-sm font-semibold text-slate-900">
                {item}
              </code>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => copy(codes.join("\n"), "codes")} className={secondary}>
              {copied === "codes" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copier
            </button>
            <button type="button" onClick={download} className={secondary}>
              <Download className="h-4 w-4" /> Télécharger
            </button>
            <button type="button" onClick={() => { setCodes([]); reset(); }} className={primary}>
              J&apos;ai enregistré mes codes
            </button>
          </div>
        </div>
      )}

      {/* ---------- Désactivation / nouveaux codes : mot de passe + code ---------- */}
      {(view === "disable" || view === "regenerate") && (
        <form onSubmit={view === "disable" ? disable : regenerate} className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm text-slate-600">
            {view === "disable"
              ? "Pour désactiver la protection, confirmez votre identité."
              : "Les anciens codes de secours cesseront de fonctionner. Confirmez votre identité."}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mot de passe" autoComplete="current-password" className={input} />
            <input value={code} onChange={(event) => setCode(event.target.value.slice(0, 9))} placeholder="Code à 6 chiffres ou code de secours" autoComplete="one-time-code" className={input} />
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={busy || !password || code.replace(/[\s-]/g, "").length < 6} className={view === "disable" ? "inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50" : primary}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} {view === "disable" ? "Désactiver la 2FA" : "Générer de nouveaux codes"}
            </button>
            <button type="button" onClick={reset} disabled={busy} className={secondary}>
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
