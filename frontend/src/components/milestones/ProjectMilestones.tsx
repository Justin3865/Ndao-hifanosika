"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye, Flag, Pencil, Plus } from "lucide-react";
import api from "@/lib/axios";
import { getStoredRole } from "@/lib/access";
import { StatusBadge } from "@/components/crud/StatusBadge";
import { fmtDate } from "@/lib/crud";

/** Rôles autorisés sur /milestones (voir lib/access.ts) */
const MILESTONE_ROLES = ["ADMIN", "DIRECTION", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2"];

interface ProjectMilestone {
  id: number;
  title: string;
  dueDate?: string | null;
  progress?: number | null;
  completedAt?: string | null;
  projectId: number;
  /** true = jalon généré automatiquement à partir d'une activité (non enregistré) */
  auto?: boolean;
}

interface ProjectActivity {
  id: number;
  title: string;
  endDate?: string | null;
  startDate?: string | null;
  progress?: number | null;
  status?: string;
  projectId: number;
}

/**
 * Jalons d'un projet, affichés dans la fiche du projet.
 * La progression vient du Suivi & Évaluation (calcul serveur).
 */
export function ProjectMilestones({ projectId }: { projectId: number | string }) {
  const [role, setRole] = useState("");
  const [items, setItems] = useState<ProjectMilestone[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const current = getStoredRole();
    setRole(current);

    if (!MILESTONE_ROLES.includes(current)) return;

    api
      .get("/milestones")
      .then(async (res) => {
        const list: ProjectMilestone[] = res.data?.milestones ?? [];
        const own = list.filter((m) => String(m.projectId) === String(projectId));

        if (own.length > 0) {
          setItems(own);
          return;
        }

        // Aucun jalon enregistré : on affiche les activités du projet comme jalons (Suivi & Évaluation)
        try {
          const acts = await api.get("/activities");
          const activities: ProjectActivity[] = acts.data?.activities ?? [];

          setItems(
            activities
              .filter((a) => String(a.projectId) === String(projectId) && a.status !== "CANCELLED")
              .sort((a, b) => String(a.endDate ?? "9999").localeCompare(String(b.endDate ?? "9999")))
              .map((a) => ({
                id: a.id,
                title: a.title,
                dueDate: a.endDate ?? a.startDate,
                progress: a.status === "COMPLETED" ? 100 : a.progress ?? 0,
                completedAt: a.status === "COMPLETED" ? (a.endDate ?? "done") : null,
                projectId: a.projectId,
                auto: true,
              }))
          );
        } catch {
          setItems([]);
        }
      })
      .catch(() => setError("Impossible de charger les jalons."));
  }, [projectId]);

  if (!MILESTONE_ROLES.includes(role)) return null;

  return (
    <section className="mt-8 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <Flag className="h-4 w-4" /> Jalons
          {items && <span className="text-sm font-normal text-gray-500">({items.length})</span>}
        </h2>

        <Link
          href={`/milestones/create?projectId=${projectId}`}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-3.5 w-3.5" /> Ajouter un jalon
        </Link>
      </div>

      {items && items.length > 0 && items.every((m) => m.auto) && (
        <p className="text-xs text-gray-500">
          Jalons générés automatiquement à partir des activités du projet (Suivi &amp; Évaluation).
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && items === null && <p className="text-sm text-gray-500">Chargement...</p>}
      {items && items.length === 0 && (
        <p className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
          Aucun jalon pour ce projet.
        </p>
      )}

      {items && items.length > 0 && (
        <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200">
          {items.map((m) => {
            const value = Math.min(100, Math.max(0, Number(m.progress ?? 0)));

            return (
              <div key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
                <div className="min-w-[160px] flex-1">
                  <p className="font-medium text-gray-900">{m.title}</p>
                  <p className="text-xs text-gray-500">Échéance : {fmtDate(m.dueDate)}</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                    <div className="h-full bg-blue-600" style={{ width: `${value}%` }} />
                  </div>
                  <span className="text-xs text-gray-600">{value}%</span>
                </div>

                <StatusBadge status={m.completedAt ? "COMPLETED" : "IN_PROGRESS"} />

                <div className="flex gap-1">
                  <Link
                    href={m.auto ? `/activities/${m.id}` : `/milestones/${m.id}`}
                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                    title={m.auto ? "Voir l'activité" : "Voir"}
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  {!m.auto && (
                    <Link href={`/milestones/${m.id}/edit`} className="rounded-lg p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600" title="Modifier">
                      <Pencil className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
