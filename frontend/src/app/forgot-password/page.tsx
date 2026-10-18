"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, Loader2, Mail, MailCheck, Smartphone } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { toast } from "@/lib/toast";
import { API_URL } from "@/lib/socket";

type Channel = "email" | "sms";
type Step = "request" | "email-sent" | "code";

const input =
  "w-full rounded-xl border border-gray-300 bg-white py-3.5 pl-11 pr-4 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

async function post(path: string, body: object) {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, json };
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [channel, setChannel] = useState<Channel>("email");
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const request = async (event?: FormEvent) => {
    event?.preventDefault();
    setError("");

    const value = channel === "email" ? email.trim() : phone.trim();

    if (!value) {
      setError(channel === "email" ? "Saisissez votre adresse email." : "Saisissez votre numéro de téléphone.");
      return;
    }

    setBusy(true);

    try {
      const { ok, json } = await post("/auth/forgot-password", channel === "email" ? { email: value } : { phone: value });

      if (!ok) {
        setError(json.message || "Envoi impossible. Réessayez plus tard.");
        return;
      }

      if (channel === "email") {
        setStep("email-sent");
      } else {
        setStep("code");
        toast.success("Si ce numéro correspond à un compte, un SMS vient d'être envoyé.");
      }
    } catch {
      setError("Impossible de joindre le serveur.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (!/^\d{6}$/.test(code.trim())) {
      setError("Le code contient 6 chiffres.");
      return;
    }

    setBusy(true);

    try {
      const { ok, json } = await post("/auth/verify-reset-code", { phone: phone.trim(), code: code.trim() });

      if (!ok || !json.token) {
        setError(json.message || "Code incorrect ou expiré.");
        return;
      }

      toast.success("Code vérifié. Choisissez votre nouveau mot de passe.");
      router.push(`/reset-password?token=${json.token}`);
    } catch {
      setError("Impossible de joindre le serveur.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo light size={48} /></div>

        <div className="rounded-3xl bg-white p-8 shadow-2xl">
          <Link href="/login" className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-800">
            <ArrowLeft className="h-4 w-4" /> Retour à la connexion
          </Link>

          {step === "request" && (
            <form onSubmit={request} className="space-y-5">
              <div>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700"><KeyRound className="h-6 w-6" /></span>
                <h1 className="mt-4 text-2xl font-bold text-gray-900">Mot de passe oublié</h1>
                <p className="mt-1 text-sm text-gray-600">Recevez un lien par email ou un code par SMS.</p>
              </div>

              <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1 text-sm font-medium">
                {([["email", "Email", Mail], ["sms", "SMS", Smartphone]] as const).map(([key, label, Icon]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setChannel(key); setError(""); }}
                    className={`flex items-center justify-center gap-2 rounded-lg py-2.5 transition ${channel === key ? "bg-white text-blue-900 shadow" : "text-gray-600"}`}
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                ))}
              </div>

              {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

              <div className="relative">
                {channel === "email" ? (
                  <>
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input type="email" autoComplete="email" className={input} placeholder="vous@exemple.org" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </>
                ) : (
                  <>
                    <Smartphone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input type="tel" autoComplete="tel" className={input} placeholder="034 12 345 67" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </>
                )}
              </div>

              <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-800 to-blue-600 py-3.5 font-semibold text-white shadow-lg disabled:opacity-70">
                {busy && <Loader2 className="h-5 w-5 animate-spin" />}
                {channel === "email" ? "Envoyer le lien" : "Envoyer le code par SMS"}
              </button>
            </form>
          )}

          {step === "email-sent" && (
            <div className="space-y-4 py-4 text-center">
              <MailCheck className="mx-auto h-14 w-14 text-green-600" />
              <h1 className="text-2xl font-bold text-gray-900">Vérifiez votre boîte mail</h1>
              <p className="text-sm text-gray-600">
                Si un compte correspond à <strong>{email}</strong>, un lien de réinitialisation (valable 30 minutes) vient d&apos;être envoyé. Pensez à vérifier vos courriers indésirables.
              </p>
              <button type="button" onClick={() => setStep("request")} className="text-sm font-medium text-blue-700 hover:underline">Renvoyer</button>
            </div>
          )}

          {step === "code" && (
            <form onSubmit={verify} className="space-y-5">
              <div>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-700"><Smartphone className="h-6 w-6" /></span>
                <h1 className="mt-4 text-2xl font-bold text-gray-900">Saisissez le code reçu</h1>
                <p className="mt-1 text-sm text-gray-600">Un SMS à 6 chiffres a été envoyé au {phone}. Il expire dans 10 minutes.</p>
              </div>

              {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

              <input
                inputMode="numeric"
                maxLength={6}
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="••••••"
                className="w-full rounded-xl border border-gray-300 py-4 text-center font-mono text-3xl tracking-[0.6em] outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />

              <button type="submit" disabled={busy || code.length !== 6} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-800 to-blue-600 py-3.5 font-semibold text-white shadow-lg disabled:opacity-60">
                {busy && <Loader2 className="h-5 w-5 animate-spin" />} Vérifier le code
              </button>

              <button type="button" onClick={() => void request()} disabled={busy} className="w-full text-center text-sm font-medium text-blue-700 hover:underline">
                Renvoyer un code
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
