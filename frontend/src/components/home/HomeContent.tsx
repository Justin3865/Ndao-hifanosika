"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Award,
  BadgeCheck,
  BarChart3,
  Bell,
  Bot,
  Briefcase,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  Heart,
  KeyRound,
  Mail,
  MapPin,
  Menu,
  Navigation,
  Phone,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { GoogleMap, MapMarker } from "@/components/maps/GoogleMap";
import { API_URL } from "@/lib/socket";

interface Props {
  openAuth: (modal: "login" | "register") => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

interface Organization {
  headquarters: { name: string; address: string | null; phone: string | null; email: string | null; latitude: number; longitude: number } | null;
  zones: Array<{ id: number; name: string; region: string | null; latitude: number; longitude: number }>;
  stats: { projects: number; beneficiaries: number; zones: number };
}

const NAV = [
  { href: "#plateforme", label: "Plateforme" },
  { href: "#impact", label: "Impact" },
  { href: "#localisation", label: "Où nous trouver" },
  { href: "#verification", label: "Vérifier un certificat" },
];

/**
 * Pictogrammes : fond blanc, contour bleu, icône bleue.
 * Couleurs fixes : identiques en mode clair et en mode sombre.
 */
const ICON_CIRCLE = "inline-flex items-center justify-center rounded-full border-2 border-[#1d4ed8] bg-[#ffffff] text-[#1d4ed8]";
const ICON_SQUARE = "inline-flex items-center justify-center rounded-xl border-2 border-[#1d4ed8] bg-[#ffffff] text-[#1d4ed8]";

/** Les fonctionnalités sont regroupées par catégorie dans des cadres. */
const CATEGORIES = [
  {
    title: "Pilotage & décision",
    text: "Des chiffres fiables pour décider et rendre compte aux partenaires.",
    icon: BarChart3,
    tone: "from-blue-700 to-blue-900",
    items: [
      { icon: BarChart3, label: "Tableau de bord et rapports d'impact" },
      { icon: Sparkles, label: "Analyses IA : anomalies, performance, risques" },
      { icon: Bot, label: "Assistant pour comparer les zones vulnérables" },
    ],
  },
  {
    title: "Programmes & terrain",
    text: "Du projet au ménage accompagné, avec la carte des zones d'intervention.",
    icon: Briefcase,
    tone: "from-emerald-600 to-teal-800",
    items: [
      { icon: Briefcase, label: "Projets, activités et jalons" },
      { icon: Heart, label: "Bénéficiaires et ménages vulnérables" },
      { icon: Navigation, label: "Agents en mission suivis par GPS" },
    ],
  },
  {
    title: "Jeunes & compétences",
    text: "Accompagner chaque stagiaire et valoriser son parcours.",
    icon: GraduationCap,
    tone: "from-amber-500 to-orange-600",
    items: [
      { icon: GraduationCap, label: "Stages, tutorat et suivi" },
      { icon: ClipboardList, label: "Évaluations, grilles et campagnes" },
      { icon: Award, label: "Certificats vérifiables par QR code" },
    ],
  },
  {
    title: "Organisation & sécurité",
    text: "Chacun accède uniquement à ce qui le concerne.",
    icon: ShieldCheck,
    tone: "from-violet-600 to-purple-800",
    items: [
      { icon: Users, label: "Rôles, équipes et départements" },
      { icon: Bell, label: "Alertes par notification, e-mail et SMS" },
      { icon: KeyRound, label: "Journal d'audit et connexion sécurisée" },
    ],
  },
];

export function HomeContent({ openAuth, mobileMenuOpen, setMobileMenuOpen }: Props) {
  const router = useRouter();
  const [org, setOrg] = useState<Organization | null>(null);
  const [code, setCode] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/public/organization`)
      .then((res) => res.json())
      .then((json) => setOrg(json.data ?? null))
      .catch(() => setOrg(null));
  }, []);

  const markers: MapMarker[] = useMemo(() => {
    if (!org) return [];

    const list: MapMarker[] = org.zones.map((zone) => ({
      id: `z-${zone.id}`,
      latitude: zone.latitude,
      longitude: zone.longitude,
      title: zone.name,
      color: "#1d4ed8",
      radius: 10,
      info: zone.region ?? "Zone d'intervention",
    }));

    if (org.headquarters) {
      list.push({
        id: "hq",
        latitude: org.headquarters.latitude,
        longitude: org.headquarters.longitude,
        title: `Siège — ${org.headquarters.name}`,
        color: "#f59e0b",
        shape: "square",
        radius: 12,
        info: org.headquarters.address ?? undefined,
      });
    }

    return list;
  }, [org]);

  const hq = org?.headquarters;

  const verify = (event: FormEvent) => {
    event.preventDefault();
    if (code.trim()) router.push(`/verify/${encodeURIComponent(code.trim().toUpperCase())}`);
  };

  return (
    <>
      {/* ---------------- Barre de navigation ---------------- */}
      <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo size={40} />

          <nav className="hidden items-center gap-8 text-sm font-medium text-gray-600 lg:flex">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="transition hover:text-blue-800">{item.label}</a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <button type="button" onClick={() => openAuth("login")} className="rounded-xl px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50">
              Se connecter
            </button>
            <button type="button" onClick={() => openAuth("register")} className="rounded-xl bg-gradient-to-r from-blue-800 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:from-blue-900 hover:to-blue-700">
              Créer un compte
            </button>
          </div>

          <button type="button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="rounded-xl p-2.5 text-gray-700 hover:bg-gray-100 lg:hidden" aria-label="Menu">
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="space-y-1 border-t border-gray-100 bg-white px-4 py-4 lg:hidden">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
                {item.label}
              </a>
            ))}
            <div className="grid grid-cols-2 gap-3 pt-3">
              <button type="button" onClick={() => openAuth("login")} className="rounded-xl border border-gray-300 py-3 text-sm font-semibold text-blue-900">Se connecter</button>
              <button type="button" onClick={() => openAuth("register")} className="rounded-xl bg-blue-800 py-3 text-sm font-semibold text-white">Créer un compte</button>
            </div>
          </div>
        )}
      </header>

      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-amber-400/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "26px 26px" }} />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:px-8 lg:py-28">
          <div>
            <span className="inline-block rounded-full bg-amber-400/20 px-4 py-1.5 text-sm font-medium text-amber-300">Ensemble, allons plus loin</span>
            <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Mesurer l&apos;impact,
              <br />
              <span className="text-amber-300">soutenir chaque jeune.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-blue-100">
              Ndao Hifanosika réunit projets, bénéficiaires, stagiaires et évaluations sur une seule plateforme sécurisée, pour agir vite là où les besoins sont les plus grands.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <button type="button" onClick={() => openAuth("login")} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-7 py-3.5 font-semibold text-blue-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-300">
                Accéder à la plateforme <ChevronRight className="h-5 w-5" />
              </button>
              <a href="#localisation" className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-7 py-3.5 font-semibold text-white transition hover:bg-white/10">
                <MapPin className="h-5 w-5" /> Où nous trouver
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Projets suivis", value: org?.stats.projects, icon: Briefcase },
              { label: "Bénéficiaires", value: org?.stats.beneficiaries, icon: Heart },
              { label: "Zones d'intervention", value: org?.stats.zones, icon: MapPin },
              { label: "Certificats QR", value: "✓", icon: BadgeCheck },
            ].map((stat) => (
              <div key={stat.label} className="rounded-3xl bg-white/10 p-6 ring-1 ring-white/15 backdrop-blur">
                <span className={`${ICON_CIRCLE} h-11 w-11`}>
                  <stat.icon className="h-5 w-5" />
                </span>
                <p className="mt-4 text-4xl font-bold">{stat.value ?? "—"}</p>
                <p className="text-sm text-blue-200">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Plateforme : cadres par catégorie ---------------- */}
      <section id="plateforme" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">La plateforme</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">Tout ce dont l&apos;ONG a besoin, rangé par domaine</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {CATEGORIES.map((category) => (
            <article key={category.title} className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition hover:shadow-xl">
              <div className={`flex items-center gap-4 bg-gradient-to-r p-6 text-white ${category.tone}`}>
                <span className={`${ICON_SQUARE} h-14 w-14 shrink-0 rounded-2xl`}>
                  <category.icon className="h-7 w-7" />
                </span>
                <div>
                  <h3 className="text-xl font-bold">{category.title}</h3>
                  <p className="text-sm text-white/80">{category.text}</p>
                </div>
              </div>

              <ul className="divide-y divide-gray-100 p-2">
                {category.items.map((item) => (
                  <li key={item.label} className="flex items-center gap-4 px-4 py-4">
                    <span className={`${ICON_SQUARE} h-11 w-11 shrink-0`}>
                      <item.icon className="h-5 w-5" />
                    </span>
                    <span className="font-medium text-gray-800">{item.label}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* ---------------- Impact ---------------- */}
      <section id="impact" className="scroll-mt-20 bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-10 shadow-sm">
            <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Un impact mesuré, pas supposé</h2>
                <p className="mt-3 max-w-2xl text-gray-600">
                  Chaque activité, chaque jalon et chaque évaluation est enregistré. Les analyses détectent les retards, repèrent les ménages les plus fragiles et aident les équipes à intervenir en priorité.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  [org?.stats.projects, "projets"],
                  [org?.stats.beneficiaries, "bénéficiaires"],
                  [org?.stats.zones, "zones"],
                ].map(([value, label]) => (
                  <div key={label as string} className="rounded-2xl bg-white p-5 shadow ring-1 ring-gray-100">
                    <p className="text-3xl font-bold text-blue-900">{value ?? "—"}</p>
                    <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Localisation ---------------- */}
      <section id="localisation" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">Nous trouver</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">Adresse et zones d&apos;intervention</h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="space-y-4 rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
            <div className="flex items-center gap-3">
              <span className={`${ICON_SQUARE} h-12 w-12 shrink-0 rounded-2xl`}>
                <MapPin className="h-6 w-6" />
              </span>
              <h3 className="text-lg font-bold text-gray-900">Siège de l&apos;ONG</h3>
            </div>

            {hq ? (
              <div className="space-y-3 text-sm text-gray-700">
                <p className="text-base font-semibold text-gray-900">{hq.name}</p>
                {hq.address && <p>{hq.address}</p>}
                {hq.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-[#1d4ed8]" /> {hq.phone}</p>}
                {hq.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-[#1d4ed8]" /> {hq.email}</p>}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${hq.latitude},${hq.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-2 rounded-xl bg-blue-800 px-5 py-2.5 font-semibold text-white hover:bg-blue-900"
                >
                  <Navigation className="h-4 w-4" /> Itinéraire
                </a>
              </div>
            ) : (
              <p className="text-sm text-gray-500">L&apos;adresse du siège sera bientôt affichée ici.</p>
            )}

            <div className="border-t border-gray-100 pt-4">
              <p className="mb-2 text-sm font-semibold text-gray-900">Zones d&apos;intervention</p>
              <div className="flex flex-wrap gap-2">
                {(org?.zones ?? []).map((zone) => (
                  <span key={zone.id} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800">{zone.name}</span>
                ))}
                {org && org.zones.length === 0 && <span className="text-sm text-gray-500">—</span>}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-3 shadow-sm">
            <GoogleMap markers={markers} height={440} />
            <div className="mt-2 flex gap-5 px-3 text-xs text-gray-500">
              <span><i className="mr-1 inline-block h-3 w-3 rounded-sm bg-amber-500" /> Siège</span>
              <span><i className="mr-1 inline-block h-3 w-3 rounded-full bg-blue-700" /> Zone d&apos;intervention</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Vérification certificat ---------------- */}
      <section id="verification" className="scroll-mt-20 pb-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <form onSubmit={verify} className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <span className={`${ICON_SQUARE} mx-auto h-14 w-14 rounded-2xl`}>
              <BadgeCheck className="h-7 w-7" />
            </span>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">Vérifier un certificat</h2>
            <p className="mt-2 text-sm text-gray-600">Entrez le code figurant sur le certificat, ou scannez son QR code, pour confirmer son authenticité.</p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="NH-2026-XXXXXXXX" className="flex-1 rounded-xl border border-gray-300 px-4 py-3 font-mono uppercase outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
              <button type="submit" className="rounded-xl bg-blue-800 px-7 py-3 font-semibold text-white hover:bg-blue-900">Vérifier</button>
            </div>
          </form>
        </div>
      </section>

      {/* ---------------- Appel à l'action ---------------- */}
      <section className="bg-gradient-to-r from-blue-900 to-blue-700 py-16 text-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 text-center">
          <span className={`${ICON_CIRCLE} h-16 w-16`}>
            <Activity className="h-8 w-8" />
          </span>
          <h2 className="text-3xl font-bold">Rejoignez la plateforme Ndao Hifanosika</h2>
          <p className="max-w-2xl text-blue-100">Demandez votre accès : un administrateur valide votre compte et vous recevez une notification dès qu&apos;il est actif.</p>
          <button type="button" onClick={() => openAuth("register")} className="rounded-xl bg-amber-400 px-8 py-3.5 font-semibold text-blue-950 hover:bg-amber-300">
            Demander un accès
          </button>
        </div>
      </section>

      {/* ---------------- Pied de page ---------------- */}
      <footer className="bg-blue-950 text-blue-200">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm sm:flex-row sm:px-6 lg:px-8">
          <Logo light size={36} />
          <nav className="flex flex-wrap justify-center gap-6">
            <Link href="/privacy" className="hover:text-white">Confidentialité</Link>
            <Link href="/terms" className="hover:text-white">Conditions</Link>
            <Link href="/verify" className="hover:text-white">Vérifier un certificat</Link>
          </nav>
          <p>© {new Date().getFullYear()} Ndao Hifanosika</p>
        </div>
      </footer>
    </>
  );
}
