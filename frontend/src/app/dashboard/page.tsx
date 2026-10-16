"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { AppLayout } from "@/components/layout";
import { StatusBadge } from "@/components/crud/StatusBadge";
import { getStoredRole } from "@/lib/access";
import { roleLabel } from "@/lib/roles";
import { fmtDate } from "@/lib/crud";

interface DashboardData {
  totals: Record<string, number>;
  status: Record<string, number>;
}

interface InternshipRow {
  id: number;
  title: string;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  student?: { firstName: string; lastName: string };
  supervisor?: { firstName: string; lastName: string } | null;
}

// Rôles autorisés par le backend (mêmes règles que routes/*.routes.ts)
const REPORT_ROLES = ["ADMIN", "DIRECTION", "DAF", "RH", "COMMUNICATION", "COORDINATOR"];
const INTERNSHIP_ROLES = ["ADMIN", "RH", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2", "STAGIAIRE_L3", "STAGIAIRE_M2"];

const TOTAL_CARDS: { key: string; label: string; href: string }[] = [
  { key: "projects", label: "Projets", href: "/projects" },
  { key: "activities", label: "Activités", href: "/activities" },
  { key: "beneficiaries", label: "Bénéficiaires", href: "/beneficiaries" },
  { key: "evaluations", label: "Évaluations", href: "/evaluations" },
  { key: "internships", label: "Stages", href: "/internships" },
  { key: "users", label: "Utilisateurs", href: "/users" },
];

const STATUS_CARDS: { key: string; label: string }[] = [
  { key: "activeProjects", label: "Projets actifs" },
  { key: "completedProjects", label: "Projets terminés" },
  { key: "activeUsers", label: "Utilisateurs actifs" },
  { key: "completedInternships", label: "Stages terminés" },
];

export default function DashboardPage() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [internships, setInternships] = useState<InternshipRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const current = getStoredRole();
    setRole(current);

    try {
      const user = JSON.parse(localStorage.getItem("user") ?? "{}");
      setName(`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim());
    } catch {
      setName("");
    }

    const jobs: Promise<unknown>[] = [];

    if (REPORT_ROLES.includes(current)) {
      jobs.push(
        api
          .get("/reports/dashboard")
          .then((res) => setData(res.data?.data ?? null))
          .catch(() => setData(null))
      );
    }

    if (INTERNSHIP_ROLES.includes(current)) {
      jobs.push(
        api
          .get("/internships")
          .then((res) => setInternships((res.data?.data ?? []).slice(0, 5)))
          .catch(() => setInternships([]))
      );
    }

    jobs.push(
      api
        .get("/notifications")
        .then((res) =>
          setUnread((res.data?.data ?? []).filter((n: { read: boolean }) => !n.read).length)
        )
        .catch(() => setUnread(0))
    );

    Promise.all(jobs).finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bonjour{name ? `, ${name}` : ""}
          </h1>
          <p className="text-sm text-gray-500">
            Connecté en tant que {roleLabel(role)}
          </p>
        </div>

        {loading && <p className="text-gray-500">Chargement...</p>}

        {data && (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              {TOTAL_CARDS.map((card) => (
                <Link
                  key={card.key}
                  href={card.href}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-300"
                >
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">
                    {data.totals?.[card.key] ?? 0}
                  </p>
                </Link>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {STATUS_CARDS.map((card) => (
                <div
                  key={card.key}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="mt-1 text-2xl font-semibold text-blue-700">
                    {data.status?.[card.key] ?? 0}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {internships.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {role.startsWith("STAGIAIRE_") ? "Mon stage" : "Stages récents"}
              </h2>
              <Link href="/internships" className="text-sm text-blue-600 hover:underline">
                Tout voir
              </Link>
            </div>

            <div className="divide-y divide-gray-100">
              {internships.map((internship) => (
                <Link
                  key={internship.id}
                  href={`/internships/${internship.id}`}
                  className="flex items-center justify-between gap-4 py-3 text-sm hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-gray-900">{internship.title}</p>
                    <p className="text-gray-500">
                      {internship.student
                        ? `${internship.student.firstName} ${internship.student.lastName}`
                        : "—"}{" "}
                      · {fmtDate(internship.startDate)} → {fmtDate(internship.endDate)}
                    </p>
                  </div>
                  <StatusBadge status={internship.status} />
                </Link>
              ))}
            </div>
          </div>
        )}

        <Link
          href="/notifications"
          className="block rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:border-blue-300"
        >
          <p className="text-sm text-gray-500">Notifications non lues</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{unread}</p>
        </Link>
      </div>
    </AppLayout>
  );
}
