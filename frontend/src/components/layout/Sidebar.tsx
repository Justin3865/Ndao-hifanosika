"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  Award,
  Briefcase,
  Building2,
  ClipboardList,
  FileText,
  Flag,
  Globe,
  GraduationCap,
  Heart,
  KeyRound,
  LayoutDashboard,
  MapPin,
  Navigation,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { canAccessPath, getStoredRole } from "@/lib/access";
import { roleLabel } from "@/lib/roles";
import { useMission } from "@/components/mission/MissionProvider";

interface SidebarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

const groups = [
  {
    title: "Pilotage",
    items: [
      { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
      { href: "/tracking", label: "Suivi terrain", icon: MapPin },
      { href: "/mission", label: "Ma mission (GPS)", icon: Navigation },
      { href: "/reports", label: "Rapports", icon: BarChart3 },
      { href: "/ai", label: "Analyses IA", icon: Sparkles },
    ],
  },
  {
    title: "Programmes",
    items: [
      { href: "/projects", label: "Projets", icon: Briefcase },
      { href: "/activities", label: "Activités", icon: Activity },
      { href: "/milestones", label: "Jalons", icon: Flag },
      { href: "/beneficiaries", label: "Bénéficiaires", icon: Heart },
      { href: "/evaluations", label: "Évaluations", icon: ClipboardList },
      // ⚠️ NOVAINA: /internships no mitondra any amin'ny pejy "Offres de stage"
      { href: "/internships", label: "Stages", icon: GraduationCap },
      // ⚠️ NOFAFANA: Ny "Offres de stage" sy "Nouvelle offre" tsy aseho eto intsony
    ],
  },
  {
    title: "Organisation",
    items: [
      { href: "/members", label: "Membres", icon: UserCog },
      { href: "/users", label: "Utilisateurs", icon: Users },
      { href: "/departements", label: "Départements", icon: Building2 },
      { href: "/zones", label: "Zones d'intervention", icon: Globe },
      { href: "/certificates", label: "Certificats", icon: Award },
    ],
  },
  {
    title: "Système",
    items: [
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/administration/permissions", label: "Rôles & accès", icon: KeyRound },
      { href: "/security", label: "Journal d'audit", icon: ShieldCheck },
      { href: "/settings", label: "Paramètres", icon: Settings },
    ],
  },
];

// Mémoire du rôle : le menu est recréé à chaque navigation, sinon il s'affichait vide puis se remplissait.
let cachedRole = "";

export default function Sidebar({ mobileMenuOpen, setMobileMenuOpen }: SidebarProps) {
  const pathname = usePathname();
  const { active: missionActive } = useMission();
  const [role, setRole] = useState(cachedRole);

  useEffect(() => {
    const current = getStoredRole();
    cachedRole = current;
    setRole(current);
  }, []);

  const visibleGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessPath(role, item.href)),
    }))
    .filter((group) => group.items.length > 0);

  const content = (
    <div className="flex h-full flex-col bg-gradient-to-b from-blue-950 via-blue-900 to-blue-800 text-blue-100">
      <div className="flex items-center justify-between px-5 py-5">
        <Logo light size={42} />
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="rounded-lg p-2 text-blue-200 hover:bg-white/10 lg:hidden"
          aria-label="Fermer le menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {visibleGroups.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-blue-300/70">
              {group.title}
            </p>

            <div className="space-y-1">
              {group.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      active
                        ? /* Pastille active : reste BLANCHE avec texte bleu foncé en mode clair ET sombre
                             (couleurs fixes, donc non modifiées par les règles ".dark ...") */
                          "bg-[#ffffff] text-[#1e3a8a] shadow-lg shadow-blue-950/30"
                        : "text-blue-100 hover:bg-white/10"
                    }`}
                  >
                    <Icon className={`h-[18px] w-[18px] ${active ? "text-amber-500" : ""}`} />
                    {item.label}
                    {item.href === "/mission" && missionActive && (
                      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> EN COURS
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-5 py-4 text-xs text-blue-300">
        Connecté : <span className="font-semibold text-white">{roleLabel(role)}</span>
      </div>
    </div>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 lg:block">{content}</aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 shadow-2xl">{content}</aside>
        </div>
      )}
    </>
  );
}
