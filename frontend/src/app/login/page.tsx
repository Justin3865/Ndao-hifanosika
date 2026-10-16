"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  HeartHandshake,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  TrendingUp,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { API_URL } from "@/lib/socket";

const FEATURES = [
  {
    icon: TrendingUp,
    title: "Suivi en temps réel",
    text: "Projets, jalons et indicateurs d'impact au même endroit.",
  },
  {
    icon: HeartHandshake,
    title: "Accompagnement des jeunes",
    text: "Stages, tutorat et évaluations structurés.",
  },
  {
    icon: MapPin,
    title: "Présence sur le terrain",
    text: "Visualisez les zones d'intervention de l'ONG.",
  },
];

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const returnUrl = search.get("returnUrl");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (localStorage.getItem("accessToken") && localStorage.getItem("user")) {
      router.replace("/dashboard");
    }
  }, [router]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!email.trim() || !password) {
      setError("Veuillez saisir votre email et votre mot de passe.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password, rememberMe }),
      });

      let data: {
        message?: string;
        user?: { status?: string };
        data?: {
          user?: { status?: string };
          accessToken?: string;
          refreshToken?: string;
        };
      } = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      const user = data.data?.user ?? data.user;

      if (response.status === 403) {
        const status = user?.status;
        setNotice(
          status === "PENDING"
            ? "Votre inscription est en attente de validation par un administrateur."
            : status === "REJECTED"
              ? "Votre demande d'inscription a été refusée."
              : status === "INACTIVE"
                ? "Votre compte est actuellement désactivé."
                : data.message || "Accès refusé."
        );
        return;
      }

      if (response.status === 401) {
        setError("Email ou mot de passe incorrect.");
        return;
      }

      if (!response.ok || !data.data?.accessToken || !user) {
        setError(data.message || "Connexion impossible. Réessayez plus tard.");
        return;
      }

      localStorage.setItem("accessToken", data.data.accessToken);
      if (data.data.refreshToken) {
        localStorage.setItem("refreshToken", data.data.refreshToken);
      }
      localStorage.setItem("user", JSON.stringify(user));

      const safe =
        returnUrl &&
        returnUrl.startsWith("/") &&
        !returnUrl.startsWith("//") &&
        !returnUrl.startsWith("/login") &&
        returnUrl !== "/"
          ? returnUrl
          : "/dashboard";

      router.push(safe);
      router.refresh();
    } catch {
      setError("Impossible de joindre le serveur. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  const input =
    "w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

  return (
    <main className="flex min-h-[100svh] items-center justify-center overflow-x-hidden bg-slate-100 p-3 sm:p-5 lg:p-6">
      {/* Les deux panneaux sont dans un seul cadre, sans scroll vertical sur écran standard */}
      <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 overflow-hidden rounded-3xl border border-white/80 bg-white shadow-2xl shadow-slate-900/10 lg:min-h-[min(820px,calc(100svh-3rem))] lg:grid-cols-3">
        {/* Panneau ONG : 1/3 */}
        <aside className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#10275c] via-[#173b86] to-[#1d4ed8] p-6 text-white sm:p-8 lg:col-span-1 lg:p-8 xl:p-10">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-amber-300/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          <div className="relative z-10">
            <Logo light size={48} />
          </div>

          <div className="relative z-10 my-8 flex flex-1 flex-col justify-center lg:my-5">
            <span className="mb-4 inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-amber-200">
              Ensemble, allons plus loin
            </span>

            <h1 className="text-3xl font-extrabold leading-tight tracking-tight xl:text-4xl">
              Mesurer l&apos;impact,
              <span className="mt-1 block text-amber-300">
                soutenir chaque jeune.
              </span>
            </h1>

            <p className="mt-4 text-sm leading-6 text-blue-100 xl:text-base">
              La plateforme de suivi &amp; évaluation de l&apos;ONG Ndao Hifanosika
              pour piloter les projets, accompagner les stagiaires et rendre
              compte aux partenaires.
            </p>

            <div className="mt-7 space-y-4">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="flex items-start gap-3">
                  <div className="shrink-0 rounded-xl border border-white/10 bg-white/10 p-2.5">
                    <feature.icon className="h-5 w-5 text-amber-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{feature.title}</p>
                    <p className="mt-0.5 text-xs leading-5 text-blue-100/85 xl:text-sm">
                      {feature.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 border-t border-white/15 pt-4">
            <p className="text-xs leading-5 text-blue-100/80">
              © {new Date().getFullYear()} Ndao Hifanosika — Tous droits réservés
            </p>
          </div>
        </aside>

        {/* Connexion : 2/3 */}
        <section className="flex min-w-0 items-center justify-center bg-gradient-to-br from-white via-slate-50 to-blue-50/60 p-6 sm:p-10 lg:col-span-2 lg:p-10 xl:p-14">
          <div className="mx-auto w-full max-w-xl">
            <div className="mb-7 flex items-center gap-3 lg:hidden">
              <Logo size={42} />
              <div className="h-9 w-px bg-slate-200" />
              <p className="text-xs text-slate-500">Suivi &amp; Évaluation</p>
            </div>

            <Link
              href="/"
              className="mb-7 inline-flex items-center gap-2 rounded-lg text-sm text-slate-500 transition hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à l&apos;accueil
            </Link>

            <div className="mb-7">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
                Espace sécurisé
              </p>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                Connexion
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                Accédez à votre espace de travail.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            {notice && (
              <div
                role="status"
                className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
              >
                {notice}
              </div>
            )}

            <form onSubmit={submit} className="space-y-5">
              <label className="block space-y-2 text-sm font-semibold text-slate-700">
                Adresse email
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    className={input}
                    placeholder="vous@exemple.org"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </label>

              <label className="block space-y-2 text-sm font-semibold text-slate-700">
                Mot de passe
                <div className="relative">
                  <LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type={show ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    className={`${input} pr-12`}
                    placeholder="••••••••"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label={
                      show
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                  >
                    {show ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </label>

              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <label className="flex items-center gap-2 font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                  />
                  Se souvenir de moi
                </label>

                <Link
                  href="/?auth=forgot"
                  className="font-semibold text-blue-700 transition hover:text-blue-900 hover:underline"
                >
                  Mot de passe oublié ?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-800 to-blue-600 px-5 py-3.5 font-bold text-white shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5 hover:from-blue-900 hover:to-blue-700 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                {loading ? "Connexion..." : "Se connecter"}
              </button>
            </form>

            <div className="mt-7 border-t border-slate-200 pt-5 text-center text-sm text-slate-600">
              Pas encore de compte ?{" "}
              <Link
                href="/?auth=register"
                className="font-bold text-blue-700 transition hover:text-blue-900 hover:underline"
              >
                Demander un accès
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-slate-100">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-700 border-t-transparent" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
