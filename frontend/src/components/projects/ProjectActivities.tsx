"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity as ActivityIcon, Eye } from "lucide-react";
import api from "@/lib/axios";
import { StatusBadge } from "@/components/crud/StatusBadge";
import { fmtDate, fmtMoney } from "@/lib/crud";

interface ProjectActivityRow {
  id: number;
  title: string;
  projectId: number;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  budget?: number | string | null;
  status?: string;
  progress?: number | null;
}

const th = "px-3 py-2 font-semibold";

/**
 * Activités d'un projet (lieu, période, budget, statut, avancement), affichées dans la fiche du projet.
 * Inclut les activités ajoutées depuis « Ajouter avancement projet » (Évaluation finale).
 * Composant AJOUTÉ : ne modifie aucun écran existant ; masqué si l'API refuse l'accès.
 */
export function ProjectActivities({ projectId }: { projectId: number | string }) {
  const [items, setItems] = useState<ProjectActivityRow[] | null>(null);

  useEffect(() => {
    let alive = true;

    api
      .get("/activities")
      .then((res) => {
        if (!alive) return;
        const list: ProjectActivityRow[] = res.data?.activities ?? [];
        setItems(list.filter((a) => String(a.projectId) === String(projectId)).sort((a, b) => a.id - b.id));
      })
      .catch(() => alive && setItems(null));

    return () => {
      alive = false;
    };
  }, [projectId]);

  if (items === null) return null;

  return (
    <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
        <ActivityIcon className="h-5 w-5 text-blue-600" /> Activités du projet ({items.length})
      </h2>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500">Aucune activité pour ce projet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-gray-500">
              <tr>
                <th className={th}>Activité</th>
                <th className={th}>Lieu</th>
                <th className={th}>Période</th>
                <th className={th}>Budget</th>
                <th className={th}>Avancement</th>
                <th className={th}>Statut</th>
                <th className={`${th} text-right`}>Voir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((a) => (
                <tr key={a.id}>
                  <td className="px-3 py-2 font-medium text-gray-900">{a.title}</td>
                  <td className="px-3 py-2 text-gray-700">{a.location || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                    {fmtDate(a.startDate)} → {fmtDate(a.endDate)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-700">{fmtMoney(a.budget)}</td>
                  <td className="px-3 py-2 text-gray-700">{a.progress ?? 0}%</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link href={`/activities/${a.id}`} className="inline-flex text-gray-500 hover:text-blue-600" title="Voir l'activité">
                      <Eye className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
