"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Award, ClipboardList, Trophy } from "lucide-react";
import { canAccessPath, getStoredRole } from "@/lib/access";

/** Onglets de la rubrique « Évaluations » : Évaluations | Évaluation finale | Ordre de mérite. */
const TABS = [
  { href: "/evaluations", label: "Évaluations", icon: ClipboardList },
  { href: "/evaluation-finale", label: "Évaluation finale", icon: Award },
  { href: "/merit", label: "Ordre de mérite", icon: Trophy },
];

/** Les onglets n'apparaissent que sur les pages principales de la rubrique (pas sur création / modification / détail). */
const isTabPage = (pathname: string) =>
  pathname === "/evaluations" || pathname === "/merit" || pathname === "/evaluation-finale" || pathname.startsWith("/evaluation-finale/");

export function EvaluationSubNav() {
  const pathname = usePathname() ?? "";
  const [role, setRole] = useState("");

  useEffect(() => {
    setRole(getStoredRole());
  }, []);

  if (!isTabPage(pathname)) return null;

  const tabs = TABS.filter((tab) => canAccessPath(role, tab.href));
  if (tabs.length < 2) return null;

  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-3" aria-label="Rubrique Évaluations">
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        const Icon = tab.icon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              active ? "bg-blue-700 text-white" : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
