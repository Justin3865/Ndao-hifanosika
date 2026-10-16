import Link from "next/link";
import {
  Activity, BarChart3, Bell, Building2, ClipboardCheck, Flag, FolderKanban, GraduationCap,
  Heart, MapPin, ShieldAlert, Sparkles, UserCog, Users,
} from "lucide-react";
import type { ComponentType } from "react";

type Item = { href: string; label: string; icon: ComponentType<{ className?: string }> };
const CATEGORIES: { title: string; description: string; items: Item[] }[] = [
  { title: "Pilotage des projets", description: "Programmes, activités et jalons.", items: [
    { href: "/projects", label: "Projets", icon: FolderKanban },
    { href: "/activities", label: "Activités", icon: Activity },
    { href: "/milestones", label: "Jalons", icon: Flag } ] },
  { title: "Personnes & équipes", description: "Membres, bénéficiaires et stagiaires.", items: [
    { href: "/members", label: "Membres", icon: UserCog },
    { href: "/beneficiaries", label: "Bénéficiaires", icon: Heart },
    { href: "/internships", label: "Stages & certificats", icon: GraduationCap } ] },
  { title: "Suivi, évaluation & rapports", description: "Résultats, performances et bailleurs.", items: [
    { href: "/evaluations", label: "Évaluations", icon: ClipboardCheck },
    { href: "/reports", label: "Rapports", icon: BarChart3 },
    { href: "/notifications", label: "Notifications", icon: Bell } ] },
  { title: "Terrain & intelligence artificielle", description: "Cartes, vulnérabilité et analyses.", items: [
    { href: "/tracking", label: "Suivi terrain", icon: MapPin },
    { href: "/vulnerability", label: "Vulnérabilité par zone", icon: ShieldAlert },
    { href: "/ai", label: "Analyses IA", icon: Sparkles } ] },
  { title: "Administration", description: "Accès, départements et zones.", items: [
    { href: "/users", label: "Utilisateurs", icon: Users },
    { href: "/departements", label: "Départements", icon: Building2 },
    { href: "/zones", label: "Zones d'intervention", icon: MapPin } ] },
];

export default function PlatformCategories() {
  return (
    <section className="bg-slate-50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-gray-900">Toute la plateforme, par domaine</h2>
          <p className="mt-3 text-gray-600">Accédez directement à chaque espace de travail.</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c) => (
            <div key={c.title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">{c.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{c.description}</p>
              <ul className="mt-4 space-y-1">
                {c.items.map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <Link href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-blue-50 hover:text-blue-700">
                      <Icon className="h-5 w-5 text-blue-600" />{label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
