"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FolderKanban,
  GraduationCap,
  Info,
  LayoutDashboard,
  LogIn,
  Menu,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { FormEvent, useState } from "react";
import {
  LoginModal,
  RegisterModal,
  ForgotPasswordModal,
  VerifyCodeModal,
  ResetPasswordModal,
} from "@/components/auth";

/* =========================================================
   TYPES
========================================================= */

type AuthModal =
  | "login"
  | "register"
  | "forgot"
  | "verify"
  | "reset"
  | null;

type ResultModal =
  | "success"
  | "pending"
  | "rejected"
  | "inactive"
  | "error"
  | null;

type AccountStatus =
  | "PENDING"
  | "ACTIVE"
  | "REJECTED"
  | "INACTIVE";

type ApiResponse = {
  success?: boolean;
  message?: string;
  user?: {
    id?: string;
    email?: string;
    nom?: string;
    prenom?: string;
    role?: string;
    status?: AccountStatus;
  };
};

/* =========================================================
   MODULES
========================================================= */

const modules = [
  {
    title: "Tableau de bord",
    description: "Vue globale des activités et indicateurs",
    href: "/dashboard",
    icon: LayoutDashboard,
    color: "blue",
  },
  {
    title: "Utilisateurs",
    description: "Gestion des utilisateurs et des accès",
    href: "/users",
    icon: Users,
    color: "indigo",
  },
  {
    title: "Départements",
    description: "Gestion des départements de l'organisation",
    href: "/departements",
    icon: Building2,
    color: "blue",
  },
  {
    title: "Activités",
    description: "Suivi des activités des projets",
    href: "/activities",
    icon: Activity,
    color: "cyan",
  },
  {
    title: "Jalons",
    description: "Suivi des étapes importantes",
    href: "/milestones",
    icon: Target,
    color: "blue",
  },
  {
    title: "Membres",
    description: "Gestion et suivi des membres",
    href: "/members",
    icon: Users,
    color: "indigo",
  },
  {
    title: "Bénéficiaires",
    description: "Suivi des bénéficiaires",
    href: "/beneficiaries",
    icon: UserRound,
    color: "sky",
  },
  {
    title: "Évaluations",
    description: "Évaluation des projets et bénéficiaires",
    href: "/evaluations",
    icon: ClipboardCheck,
    color: "blue",
  },
  {
    title: "Stages",
    description: "Gestion des stagiaires et des stages",
    href: "/internships",
    icon: GraduationCap,
    color: "cyan",
  },
  {
    title: "Notifications",
    description: "Notifications et rappels",
    href: "/notifications",
    icon: Bell,
    color: "sky",
  },
  {
    title: "IA & Analytics",
    description: "Analyse intelligente et prédictions",
    href: "/ai",
    icon: Sparkles,
    color: "blue",
  },
  {
    title: "Paramètres",
    description: "Configuration de la plateforme",
    href: "/settings",
    icon: ShieldCheck,
    color: "indigo",
  },
];

/* =========================================================
   BLUE THEME
========================================================= */

const colorClasses: Record<
  string,
  {
    bg: string;
    icon: string;
    border: string;
    hover: string;
  }
> = {
  blue: {
    bg: "bg-blue-50",
    icon: "text-blue-600",
    border: "border-blue-100",
    hover: "hover:border-blue-300",
  },
  indigo: {
    bg: "bg-indigo-50",
    icon: "text-indigo-600",
    border: "border-indigo-100",
    hover: "hover:border-indigo-300",
  },
  sky: {
    bg: "bg-sky-50",
    icon: "text-sky-600",
    border: "border-sky-100",
    hover: "hover:border-sky-300",
  },
  cyan: {
    bg: "bg-cyan-50",
    icon: "text-cyan-600",
    border: "border-cyan-100",
    hover: "hover:border-cyan-300",
  },
};

/* =========================================================
   HOME PAGE
========================================================= */

export default function HomePage() {
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModal, setAuthModal] = useState<AuthModal>(null);
  const [resultModal, setResultModal] = useState<ResultModal>(null);
  const [resultMessage, setResultMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  /* LOGIN */
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  /* REGISTER */
  const [registerNom, setRegisterNom] = useState("");
  const [registerPrenom, setRegisterPrenom] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");

  /* FORGOT PASSWORD */
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  /* API URL */
  const getApiUrl = () =>
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  /* OPEN / CLOSE AUTH */
  const openAuth = (modal: AuthModal) => {
    setResultModal(null);
    setResultMessage("");
    setAuthModal(modal);
    setMobileMenuOpen(false);
  };

  const closeAuth = () => {
    if (isLoading) return;
    setAuthModal(null);
  };

  const switchAuth = (modal: AuthModal) => {
    if (isLoading) return;
    setAuthModal(modal);
  };

  /* RESULT */
  const openResult = (type: ResultModal, message: string) => {
    setResultMessage(message);
    setResultModal(type);
  };

  const closeResult = () => {
    setResultModal(null);
    setResultMessage("");
  };

  /* LOGIN */
  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const email = loginEmail.trim().toLowerCase();

    if (!email) {
      openResult("error", "Veuillez saisir votre adresse e-mail.");
      return;
    }

    if (!loginPassword) {
      openResult("error", "Veuillez saisir votre mot de passe.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${getApiUrl()}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          password: loginPassword,
          rememberMe,
        }),
      });

      let data: ApiResponse = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (response.status === 403 && data.user?.status === "PENDING") {
        setAuthModal(null);
        openResult(
          "pending",
          data.message ||
            "Votre inscription est en attente de validation par un administrateur."
        );
        return;
      }

      if (response.status === 403 && data.user?.status === "REJECTED") {
        setAuthModal(null);
        openResult(
          "rejected",
          data.message || "Votre demande d'inscription a été refusée."
        );
        return;
      }

      if (response.status === 403 && data.user?.status === "INACTIVE") {
        setAuthModal(null);
        openResult(
          "inactive",
          data.message || "Votre compte est actuellement désactivé."
        );
        return;
      }

      if (response.status === 401) {
        openResult(
          "error",
          "L'adresse e-mail ou le mot de passe est incorrect."
        );
        return;
      }

      if (!response.ok) {
        openResult(
          "error",
          data.message || "Une erreur est survenue pendant la connexion."
        );
        return;
      }

      if (!data.user || data.user.status !== "ACTIVE") {
        setAuthModal(null);
        openResult("pending", "Votre compte n'est pas encore actif.");
        return;
      }

      setAuthModal(null);

      openResult(
        "success",
        "Connexion réussie. Vous allez être redirigé vers votre espace."
      );

      window.setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1200);
    } catch (error) {
      console.error("Erreur login:", error);
      openResult(
        "error",
        "Impossible de contacter le serveur. Vérifiez que le backend est démarré."
      );
    } finally {
      setIsLoading(false);
    }
  };

  /* REGISTER */
  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nom = registerNom.trim();
    const prenom = registerPrenom.trim();
    const email = registerEmail.trim().toLowerCase();

    if (!nom || !prenom) {
      openResult(
        "error",
        "Veuillez renseigner votre nom et votre prénom."
      );
      return;
    }

    if (!email) {
      openResult("error", "Veuillez saisir votre adresse e-mail.");
      return;
    }

    if (registerPassword.length < 8) {
      openResult(
        "error",
        "Le mot de passe doit contenir au moins 8 caractères."
      );
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      openResult("error", "Les deux mots de passe ne correspondent pas.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${getApiUrl()}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          nom,
          prenom,
          email,
          password: registerPassword,
        }),
      });

      let data: ApiResponse = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        openResult(
          "error",
          data.message || "Impossible de créer votre compte."
        );
        return;
      }

      setAuthModal(null);

      setRegisterNom("");
      setRegisterPrenom("");
      setRegisterEmail("");
      setRegisterPassword("");
      setRegisterConfirmPassword("");

      openResult(
        "pending",
        data.message ||
          "Votre compte a été créé. Il est maintenant en attente de validation par un administrateur."
      );
    } catch (error) {
      console.error("Erreur register:", error);
      openResult(
        "error",
        "Impossible de contacter le serveur. Vérifiez que le backend est démarré."
      );
    } finally {
      setIsLoading(false);
    }
  };

  /* FORGOT PASSWORD - SEND CODE */
  const handleForgotPassword = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const email = forgotEmail.trim().toLowerCase();

    if (!email) {
      openResult("error", "Veuillez saisir votre adresse e-mail.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `${getApiUrl()}/api/auth/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email }),
        }
      );

      let data: ApiResponse = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        openResult(
          "error",
          data.message || "Impossible d'envoyer le code de vérification."
        );
        return;
      }

      setAuthModal("verify");
    } catch (error) {
      console.error("Erreur forgot password:", error);
      openResult("error", "Impossible de contacter le serveur.");
    } finally {
      setIsLoading(false);
    }
  };

  /* VERIFY RESET CODE */
  const handleVerifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const code = resetCode.trim();

    if (!code) {
      openResult("error", "Veuillez saisir le code reçu par e-mail.");
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      openResult("error", "Le code doit contenir exactement 6 chiffres.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `${getApiUrl()}/api/auth/verify-reset-code`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email: forgotEmail.trim().toLowerCase(),
            code,
          }),
        }
      );

      let data: ApiResponse = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        openResult(
          "error",
          data.message || "Le code est incorrect ou expiré."
        );
        return;
      }

      setAuthModal("reset");
    } catch (error) {
      console.error("Erreur verification code:", error);
      openResult("error", "Impossible de vérifier le code.");
    } finally {
      setIsLoading(false);
    }
  };

  /* RESET PASSWORD */
  const handleResetPassword = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (newPassword.length < 8) {
      openResult(
        "error",
        "Le nouveau mot de passe doit contenir au moins 8 caractères."
      );
      return;
    }

    if (newPassword !== confirmNewPassword) {
      openResult("error", "Les deux mots de passe ne correspondent pas.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `${getApiUrl()}/api/auth/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email: forgotEmail.trim().toLowerCase(),
            code: resetCode.trim(),
            password: newPassword,
          }),
        }
      );

      let data: ApiResponse = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        openResult(
          "error",
          data.message || "Impossible de modifier le mot de passe."
        );
        return;
      }

      setAuthModal(null);

      setForgotEmail("");
      setResetCode("");
      setNewPassword("");
      setConfirmNewPassword("");

      openResult(
        "success",
        "Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter."
      );
    } catch (error) {
      console.error("Erreur reset password:", error);
      openResult("error", "Impossible de contacter le serveur.");
    } finally {
      setIsLoading(false);
    }
  };

  /* RESULT CONFIG */
  const resultConfig = {
    success: {
      icon: CheckCircle2,
      title: "Opération réussie",
      iconClass: "bg-blue-100 text-blue-600",
      titleClass: "text-blue-700",
    },
    pending: {
      icon: Info,
      title: "Validation nécessaire",
      iconClass: "bg-blue-100 text-blue-600",
      titleClass: "text-blue-700",
    },
    rejected: {
      icon: XCircle,
      title: "Demande refusée",
      iconClass: "bg-blue-50 text-blue-700",
      titleClass: "text-blue-800",
    },
    inactive: {
      icon: ShieldAlert,
      title: "Compte désactivé",
      iconClass: "bg-blue-50 text-blue-700",
      titleClass: "text-blue-800",
    },
    error: {
      icon: XCircle,
      title: "Une erreur est survenue",
      iconClass: "bg-blue-50 text-blue-700",
      titleClass: "text-blue-800",
    },
  };

  const currentResult = resultModal ? resultConfig[resultModal] : null;

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logos/ndao-hifanosika.png"
              alt="Ndao Hifanosika"
              width={48}
              height={48}
              priority
              className="h-12 w-auto object-contain"
            />

            <div>
              <h1 className="text-lg font-bold leading-tight">
                Ndao Hifanosika
              </h1>

              <p className="text-xs text-gray-500">
                Plateforme de Suivi & Évaluation
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/"
              className="text-sm font-medium text-blue-600"
            >
              Accueil
            </Link>

            <Link
              href="/dashboard"
              className="text-sm font-medium text-gray-600 hover:text-blue-600"
            >
              Tableau de bord
            </Link>

            <Link
              href="/internships"
              className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-blue-600"
            >
              Stages
            </Link>

            <button
              type="button"
              onClick={() => openAuth("login")}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Se connecter
            </button>
          </nav>

          <button
            type="button"
            onClick={() =>
              setMobileMenuOpen((value) => !value)
            }
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
            aria-label="Menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-gray-200 bg-white px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-2">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-medium text-blue-600 hover:bg-blue-50"
              >
                Accueil
              </Link>

              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Tableau de bord
              </Link>

              <Link
                href="/internships"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-medium text-blue-700 hover:bg-blue-50"
              >
                Gestion des stages
              </Link>

              <button
                type="button"
                onClick={() => openAuth("login")}
                className="mt-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Se connecter
              </button>

              <button
                type="button"
                onClick={() => openAuth("register")}
                className="rounded-lg border border-blue-200 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                Créer un compte
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-white blur-3xl" />
        </div>

        <div className="relative mx-auto flex min-h-[520px] max-w-7xl items-center justify-center px-4 py-20 text-center sm:px-6 lg:px-8">
          <div className="w-full max-w-4xl">
            <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/20">
              <Sparkles className="h-4 w-4" />
              Plateforme numérique de Suivi & Évaluation
            </div>

            <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Ndao Hifanosika
            </h2>

            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-blue-100 sm:text-xl">
              Une plateforme centralisée pour piloter les projets, suivre les
              activités, gérer les bénéficiaires, évaluer les performances et
              améliorer la prise de décision.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => openAuth("login")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-blue-700 shadow-lg transition hover:bg-blue-50"
              >
                <LogIn className="h-5 w-5" />
                Se connecter
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => openAuth("register")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/20"
              >
                Créer un compte
              </button>

              <Link
                href="/internships"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-6 py-3.5 text-sm font-bold text-white hover:bg-white/10"
              >
                Gestion des stages
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* INTRO */}
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50">
              <FolderKanban className="h-6 w-6 text-blue-600" />
            </div>

            <div>
              <h3 className="font-semibold">
                Gestion des projets
              </h3>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                Organisez les projets, activités, jalons et indicateurs.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>

            <div>
              <h3 className="font-semibold">
                Suivi & Évaluation
              </h3>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                Mesurez les résultats et analysez les performances.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div>
              <h3 className="font-semibold">
                Gestion des stages
              </h3>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                Gérez les stagiaires, leurs stages, encadrements et suivis.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-blue-600">
            Fonctionnalités
          </span>

          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            Modules de la plateforme
          </h2>

          <p className="mt-4 text-base leading-7 text-gray-600">
            Tous les outils nécessaires pour assurer une gestion efficace du
            suivi et de l'évaluation.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {modules.map((module) => {
            const Icon = module.icon;
            const colors = colorClasses[module.color];

            return (
              <Link
                key={module.href}
                href={module.href}
                className={`group rounded-2xl border bg-white p-6 transition duration-200 hover:-translate-y-1 hover:shadow-lg ${colors.border} ${colors.hover}`}
              >
                <div
                  className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${colors.bg}`}
                >
                  <Icon className={`h-6 w-6 ${colors.icon}`} />
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">
                      {module.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-gray-500">
                      {module.description}
                    </p>
                  </div>

                  <ChevronRight
                    className={`mt-1 h-5 w-5 shrink-0 text-gray-300 transition group-hover:translate-x-1 ${colors.icon}`}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* STAGES */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 to-cyan-600 shadow-xl">
          <div className="grid items-center gap-8 p-8 sm:p-10 lg:grid-cols-2 lg:p-14">
            <div>
              <h2 className="text-3xl font-bold text-white">
                Gestion des stages
              </h2>

              <p className="mt-4 max-w-xl text-base leading-7 text-blue-50">
                Le module Stages permet de centraliser les informations
                concernant les stagiaires, les structures d'accueil, les
                encadrements, les périodes de stage et le suivi des
                activités.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/internships"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50"
                >
                  Voir les stages
                  <ChevronRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/internships/create"
                  className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/20"
                >
                  Ajouter un stage
                </Link>
              </div>
            </div>

            <div className="hidden justify-center lg:flex">
              <div className="flex h-64 w-64 items-center justify-center rounded-full bg-white/10">
                <div className="flex h-48 w-48 items-center justify-center rounded-full bg-white/10">
                  <GraduationCap className="h-28 w-28 text-white/90" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 bg-gray-900 text-gray-300">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3">
                <Image
                  src="/logos/ndao-hifanosika.png"
                  alt="Ndao Hifanosika"
                  width={48}
                  height={48}
                  className="h-12 w-auto object-contain"
                />

                <div>
                  <h3 className="font-bold text-white">
                    Ndao Hifanosika
                  </h3>

                  <p className="text-xs text-gray-400">
                    Plateforme de Suivi & Évaluation
                  </p>
                </div>
              </div>

              <p className="mt-5 max-w-md text-sm leading-6 text-gray-400">
                Solution numérique destinée à faciliter le suivi,
                l'évaluation et la gestion des projets, programmes,
                bénéficiaires, membres et stagiaires.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white">
                Navigation
              </h4>

              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <Link
                    href="/dashboard"
                    className="hover:text-white"
                  >
                    Tableau de bord
                  </Link>
                </li>

                <li>
                  <Link
                    href="/beneficiaries"
                    className="hover:text-white"
                  >
                    Bénéficiaires
                  </Link>
                </li>

                <li>
                  <Link
                    href="/internships"
                    className="hover:text-white"
                  >
                    Gestion des stages
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white">
                Plateforme
              </h4>

              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <Link
                    href="/notifications"
                    className="hover:text-white"
                  >
                    Notifications
                  </Link>
                </li>

                <li>
                  <Link
                    href="/ai"
                    className="hover:text-white"
                  >
                    IA & Analytics
                  </Link>
                </li>

                <li>
                  <Link
                    href="/settings"
                    className="hover:text-white"
                  >
                    Paramètres
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-gray-800 pt-6">
            <div className="flex flex-col justify-between gap-4 text-xs text-gray-500 sm:flex-row">
              <p>
                © {new Date().getFullYear()} Ndao Hifanosika. Tous droits
                réservés.
              </p>

              <div className="flex gap-5">
                <Link
                  href="/privacy"
                  className="hover:text-gray-300"
                >
                  Confidentialité
                </Link>

                <Link
                  href="/terms"
                  className="hover:text-gray-300"
                >
                  Conditions d'utilisation
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* AUTH MODALS — délégués aux composants de components/auth */}
      {authModal && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-6"
          role="dialog"
          aria-modal="true"
        >
          {authModal === "login" && (
            <LoginModal
              loginEmail={loginEmail}
              setLoginEmail={setLoginEmail}
              loginPassword={loginPassword}
              setLoginPassword={setLoginPassword}
              rememberMe={rememberMe}
              setRememberMe={setRememberMe}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              isLoading={isLoading}
              onSubmit={handleLogin}
              onClose={closeAuth}
              onForgot={() => switchAuth("forgot")}
              onRegister={() => switchAuth("register")}
            />
          )}

          {authModal === "register" && (
            <RegisterModal
              registerNom={registerNom}
              setRegisterNom={setRegisterNom}
              registerPrenom={registerPrenom}
              setRegisterPrenom={setRegisterPrenom}
              registerEmail={registerEmail}
              setRegisterEmail={setRegisterEmail}
              registerPassword={registerPassword}
              setRegisterPassword={setRegisterPassword}
              registerConfirmPassword={registerConfirmPassword}
              setRegisterConfirmPassword={setRegisterConfirmPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              showConfirmPassword={showConfirmPassword}
              setShowConfirmPassword={setShowConfirmPassword}
              isLoading={isLoading}
              onSubmit={handleRegister}
              onClose={closeAuth}
              onLogin={() => switchAuth("login")}
            />
          )}

          {authModal === "forgot" && (
            <ForgotPasswordModal
              forgotEmail={forgotEmail}
              setForgotEmail={setForgotEmail}
              isLoading={isLoading}
              onSubmit={handleForgotPassword}
              onClose={closeAuth}
              onLogin={() => switchAuth("login")}
            />
          )}

          {authModal === "verify" && (
            <VerifyCodeModal
              forgotEmail={forgotEmail}
              resetCode={resetCode}
              setResetCode={setResetCode}
              isLoading={isLoading}
              onSubmit={handleVerifyCode}
              onClose={closeAuth}
              onBack={() => switchAuth("forgot")}
            />
          )}

          {authModal === "reset" && (
            <ResetPasswordModal
              newPassword={newPassword}
              setNewPassword={setNewPassword}
              confirmNewPassword={confirmNewPassword}
              setConfirmNewPassword={setConfirmNewPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              showConfirmPassword={showConfirmPassword}
              setShowConfirmPassword={setShowConfirmPassword}
              isLoading={isLoading}
              onSubmit={handleResetPassword}
              onClose={closeAuth}
            />
          )}
        </div>
      )}

      {/* RESULT MODAL */}
      {currentResult && resultModal && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 px-4 py-6"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="px-6 pb-5 pt-8 text-center sm:px-8">
              <div
                className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${currentResult.iconClass}`}
              >
                {(() => {
                  const ResultIcon = currentResult.icon;

                  return (
                    <ResultIcon className="h-8 w-8" />
                  );
                })()}
              </div>

              <h2
                className={`mt-5 text-xl font-bold ${currentResult.titleClass}`}
              >
                {currentResult.title}
              </h2>
            </div>

            <div className="px-6 pb-6 sm:px-8">
              <div className="rounded-xl bg-blue-50 p-5">
                <p className="text-center text-sm leading-7 text-blue-700">
                  {resultMessage}
                </p>
              </div>

              {resultModal === "pending" && (
                <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <div className="flex gap-3">
                    <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                    <div>
                      <p className="font-semibold text-blue-800">
                        Étape suivante
                      </p>

                      <p className="mt-1 text-sm leading-6 text-blue-700">
                        Un administrateur doit vérifier et activer votre
                        compte avant votre connexion.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {resultModal === "error" && (
                <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-center text-sm leading-6 text-blue-700">
                    Vérifiez les informations saisies puis réessayez.
                  </p>
                </div>
              )}

              {resultModal !== "success" && (
                <button
                  type="button"
                  onClick={closeResult}
                  className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                >
                  Fermer
                </button>
              )}
            </div>

            <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                Ndao Hifanosika — Accès sécurisé
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
