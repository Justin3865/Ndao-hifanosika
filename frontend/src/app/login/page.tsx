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
  { icon: TrendingUp, title: "Suivi en temps réel", text: "Projets, jalons et indicateurs d'impact au même endroit." },
  { icon: HeartHandshake, title: "Accompagnement des jeunes", text: "Stages, tutorat et évaluations structurés." },
  { icon: MapPin, title: "Présence sur le terrain", text: "Visualisez les zones d'intervention de l'ONG." },
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
    // Déjà connecté : direction le tableau de bord
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
        data?: { user?: { status?: string }; accessToken?: string; refreshToken?: string };
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
      if (data.data.refreshToken) localStorage.setItem("refreshToken", data.data.refreshToken);
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
    "w-full rounded-xl border border-gray-300 bg-white py-3.5 pl-11 pr-4 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* ---------- Panneau de marque ---------- */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "26px 26px",
          }}
        />

        <div className="relative">
          <Logo light size={52} />
        </div>

        <div className="relative max-w-xl">
          <span className="mb-5 inline-block rounded-full bg-amber-400/20 px-4 py-1.5 text-sm font-medium text-amber-300">
            Ensemble, allons plus loin
          </span>

          <h1 className="text-4xl font-bold leading-tight xl:text-5xl">
            Mesurer l&apos;impact,
            <br />
            <span className="text-amber-300">soutenir chaque jeune.</span>
          </h1>

          <p className="mt-5 text-lg text-blue-100">
            La plateforme de suivi &amp; évaluation de l&apos;ONG Ndao Hifanosika pour piloter les projets, accompagner les stagiaires et rendre compte aux partenaires.
          </p>

          <div className="mt-10 space-y-5">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex items-start gap-4">
                <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/15">
                  <feature.icon className="h-5 w-5 text-amber-300" />
                </div>
                <div>
                  <p className="font-semibold">{feature.title}</p>
                  <p className="text-sm text-blue-200">{feature.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-sm text-blue-300">
          © {new Date().getFullYear()} Ndao Hifanosika — Tous droits réservés
        </p>
      </aside>

      {/* ---------- Formulaire ---------- */}
      <main className="flex flex-col justify-center bg-slate-50 px-6 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo size={44} />
          </div>

          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-blue-800"
          >
            <ArrowLeft className="h-4 w-4" /> Retour à l&apos;accueil
          </Link>

          <h2 className="text-3xl font-bold text-gray-900">Connexion</h2>
          <p className="mt-2 text-gray-600">Accédez à votre espace de travail.</p>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {notice && (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {notice}
            </div>
          )}

          <form onSubmit={submit} className="mt-8 space-y-5">
            <label className="block space-y-2 text-sm font-medium text-gray-700">
              Adresse email
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  autoComplete="email"
                  className={input}
                  placeholder="vous@exemple.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </label>

            <label className="block space-y-2 text-sm font-medium text-gray-700">
              Mot de passe
              <div className="relative">
                <LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  className={`${input} pr-12`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 hover:text-gray-700"
                  aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </label>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Se souvenir de moi
              </label>

              <Link href="/?auth=forgot" className="font-medium text-blue-700 hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-800 to-blue-600 py-3.5 font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:from-blue-900 hover:to-blue-700 disabled:opacity-70"
            >
              {loading && <Loader2 className="h-5 w-5 animate-spin" />}
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-600">
            Pas encore de compte ?{" "}
            <Link href="/?auth=register" className="font-semibold text-blue-700 hover:underline">
              Demander un accès
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
