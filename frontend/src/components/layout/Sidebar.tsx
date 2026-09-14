"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Activity,
  Briefcase,
  Building2,
  ClipboardList,
  FileText,
  Flag,
  GraduationCap,
  Heart,
  LayoutDashboard,
  Settings,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

interface SidebarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

const menuItems = [
  {
    href: "/dashboard",
    label: "Tableau de bord",
    icon: LayoutDashboard,
  },
  {
    href: "/users",
    label: "Utilisateurs",
    icon: Users,
  },
  {
    href: "/departements",
    label: "Départements",
    icon: Building2,
  },
  {
    href: "/projects",
    label: "Projets",
    icon: Briefcase,
  },
  {
    href: "/activities",
    label: "Activités",
    icon: Activity,
  },
  {
    href: "/members",
    label: "Membres",
    icon: Users,
  },
  {
    href: "/beneficiaries",
    label: "Bénéficiaires",
    icon: Heart,
  },
  {
    href: "/milestones",
    label: "Jalons",
    icon: Flag,
  },
  {
    href: "/evaluations",
    label: "Évaluations",
    icon: ClipboardList,
  },
  {
    href: "/internships",
    label: "Internships",
    icon: GraduationCap,
  },
  {
    href: "/reports",
    label: "Rapports",
    icon: FileText,
  },
  {
    href: "/ai",
    label: "IA & Analytics",
    icon: TrendingUp,
  },
];

export default function Sidebar({
  mobileMenuOpen,
  setMobileMenuOpen,
}: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* =========================================================
          SIDEBAR DESKTOP
      ========================================================= */}

      <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white lg:block">
        <div className="sticky top-16 h-[calc(100vh-64px)]">
          <nav className="flex h-full flex-col">
            {/* MENU PRINCIPAL */}
            <div className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden p-4">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      active
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />

                    <span className="min-w-0 truncate">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* PARAMÈTRES */}
            <div className="shrink-0 border-t border-gray-200 p-4">
              <Link
                href="/settings"
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive("/settings")
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Settings className="h-5 w-5 shrink-0" />

                <span>Paramètres</span>
              </Link>
            </div>
          </nav>
        </div>
      </aside>

      {/* =========================================================
          OVERLAY MOBILE
      ========================================================= */}

      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={closeMobileMenu}
          className="fixed inset-x-0 bottom-0 top-16 z-[80] bg-slate-950/50 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* =========================================================
          SIDEBAR MOBILE
          
          IMPORTANT :
          Tsy misy logo na soratra "Ndao Hifanosika" eto intsony,
          satria efa ao amin'ny Header.
      ========================================================= */}

      <aside
        className={`fixed left-0 top-16 z-[90] flex h-[calc(100dvh-4rem)] w-[min(18rem,85vw)] max-w-[320px] flex-col border-r border-gray-200 bg-white shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
          mobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        {/* MENU MOBILE */}
        <nav className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden p-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-blue-100 text-blue-700 shadow-sm"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />

                  <span className="min-w-0 truncate">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* PARAMÈTRES MOBILE */}
          <div className="shrink-0 border-t border-gray-200 bg-white p-4">
            <Link
              href="/settings"
              onClick={closeMobileMenu}
              className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                isActive("/settings")
                  ? "bg-blue-100 text-blue-700 shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Settings className="h-5 w-5 shrink-0" />

              <span>Paramètres</span>
            </Link>
          </div>
        </nav>
      </aside>
    </>
  );
}